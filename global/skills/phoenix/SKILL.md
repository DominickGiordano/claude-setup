---
name: phoenix
description: >-
  Areté overlay for Phoenix and LiveView: controllers, LiveViews, plugs, components, router,
  channels, AshPhoenix.Form. Covers mistakes that still ship with the upstream
  phoenix-framework skill loaded — that one is the base, this is the addendum.
when_to_use: >-
  Triggers: phoenix, liveview, live view, plug, router, controller, channel, endpoint, heex,
  assigns, socket, core_components, <.input>, <.flash_group>, handle_info, handle_event,
  push_navigate, push_patch, form, AshPhoenix.Form, to_form.
---

# Phoenix / LiveView — Areté Overlay

For Phoenix 1.8 + LiveView 1.1 projects (`areteos`, `arilearn-phx`). General
LiveView rules (streams, hooks, `to_form/2` discipline, `<.link
navigate=...>`, no `LiveComponent` without strong reason) are in the project's
auto-generated `phoenix-framework` skill. This file documents the specific
recurring mistakes that keep shipping anyway.

## `<.input>` discipline — no raw `<textarea>`, `<select>`, `<input>` in HEEx

Phoenix 1.8's `core_components` provides `<.input>` which handles label, error
display, and form binding consistently. Raw HTML form elements bypass the
error-display structure, ship without `phx-feedback-for`, and propagate via
copy-paste across templates.

```heex
<%!-- ❌ Raw HTML form elements — no error display, inconsistent labels --%>
<form phx-submit="save">
  <label>Description</label>
  <textarea name="description"></textarea>
  <select name="status">
    <option value="draft">Draft</option>
  </select>
</form>

<%!-- ✅ Use <.input> for every form input, with type= for the variant --%>
<.form for={@form} id="edit-thing" phx-submit="save">
  <.input field={@form[:description]} type="textarea" label="Description" />
  <.input field={@form[:status]}
          type="select"
          label="Status"
          options={[{"Draft", :draft}, {"Published", :published}]} />
</.form>
```

Supported `type=`: `text`, `email`, `password`, `number`, `hidden`, `textarea`,
`select`, `checkbox`, `date`, `time`, `datetime-local`, `file`, `tel`, `url`,
`color`, `range`. If you genuinely need a control `<.input>` doesn't cover,
build a function component that wraps it — don't sprinkle raw HTML.

## `<.flash_group>` lives in `layouts.ex` — never in a LiveView template

```heex
<%!-- ❌ In a LiveView template — flashes render twice, or get stale --%>
<.flash_group flash={@flash} />
<div>... page content ...</div>

<%!-- ✅ Every LV template is wrapped in <Layouts.app>, which owns flashes --%>
<Layouts.app flash={@flash} current_user={@current_user}>
  <div>... page content ...</div>
</Layouts.app>
```

`<Layouts.app>` (in `lib/<app>_web/components/layouts.ex`) is the single owner
of the flash group. Every LiveView and dead view template renders inside it.

## `handle_info/2` — always include a catch-all clause

Any LiveView that subscribes to PubSub, uses `Process.monitor/1`, or receives
messages from `Task` callbacks WILL eventually receive an unexpected message
(stale broadcast after reconnect, `:DOWN`, `:nodeup/:nodedown`, supervisor
shutdown messages). Without a catch-all, `FunctionClauseError` crashes the LV
and the user sees a reconnect spinner.

```elixir
# ❌ Missing catch-all
def handle_info({:item_updated, item}, socket), do: ...
def handle_info(:refresh, socket), do: ...
# unexpected :DOWN from a monitored process → crash

# ✅ Trailing catch-all
def handle_info({:item_updated, item}, socket), do: ...
def handle_info(:refresh, socket), do: ...
def handle_info(_other, socket), do: {:noreply, socket}
```

Same rule for `handle_event/3` only when the LV is exposed to JS hooks that
might push arbitrary events; usually `handle_event` clauses are exhaustive.

## When you add a `handle_info` that stores async data, update the template too

A common pair-failure: adding `handle_info({:exemplar_ready, x}, ...)` to fix
a crash but forgetting to render `@exemplar` in the template.

```elixir
def handle_info({:exemplar_ready, exemplar}, socket) do
  {:noreply, assign(socket, exemplar: exemplar)}
end
```

```heex
<%!-- ✅ Render it — without this, the handler is silently useless --%>
<%= if @exemplar do %>
  <.exemplar exemplar={@exemplar} />
<% end %>
```

Audit: any new `assign(socket, :foo, ...)` from an async handler must be
referenced in the template or be a transient flag (then it should be tested).

## `Task.start` in LiveView — wrap in try/rescue AND own the loading state

`Task.start/1` is fire-and-forget. If the body raises, the LV never receives
the completion message, the `loading: true` assign stays true, and the spinner
runs forever.

```elixir
# ❌ Stuck spinner on any raise inside the task body
def handle_event("submit", _, socket) do
  pid = self()
  Task.start(fn ->
    result = expensive(socket.assigns.form_data)
    send(pid, {:done, result})
  end)
  {:noreply, assign(socket, submitting: true)}
end

# ✅ Wrap; send terminal message in EITHER branch
def handle_event("submit", _, socket) do
  pid = self()
  Task.start(fn ->
    try do
      result = expensive(socket.assigns.form_data)
      send(pid, {:done, result})
    rescue
      e -> send(pid, {:failed, Exception.message(e)})
    end
  end)
  {:noreply, assign(socket, submitting: true, phase: :submitting)}
end

def handle_info({:done, result}, socket) do
  {:noreply, assign(socket, submitting: false, phase: :done, result: result)}
end

def handle_info({:failed, reason}, socket) do
  {:noreply,
   socket
   |> assign(submitting: false, phase: :error)        # <-- always exit loading
   |> put_flash(:error, "Operation failed: #{reason}")}
end
```

Rule: every exit path — success, error, timeout, `:DOWN` — must transition
the LV out of the loading state. Setting a flash is NOT enough on its own;
the `phase` / `loading` assign must move too.

## `Process.monitor` — `demonitor(ref, [:flush])` in every exit path

If you `Process.monitor` something in LV, every path that ends the LV's
interest in that process must demonitor — happy path, timeout, error,
LiveView unmount. Missing one leaks the monitor and may deliver a `:DOWN` to
a future handler that doesn't expect it.

```elixir
def handle_event("start", _, socket) do
  {:ok, pid} = Worker.start(...)
  ref = Process.monitor(pid)
  {:noreply, assign(socket, worker_pid: pid, worker_ref: ref)}
end

def handle_info({:done, _result}, socket) do
  Process.demonitor(socket.assigns.worker_ref, [:flush])
  {:noreply, assign(socket, worker_pid: nil, worker_ref: nil, phase: :done)}
end

def handle_info({:DOWN, ref, :process, _, reason}, %{assigns: %{worker_ref: ref}} = socket) do
  Process.demonitor(ref, [:flush])    # idempotent — safe to call again
  {:noreply, assign(socket, worker_pid: nil, worker_ref: nil, phase: :error)}
end

def terminate(_reason, socket) do
  if ref = socket.assigns[:worker_ref], do: Process.demonitor(ref, [:flush])
  :ok
end
```

The `[:flush]` option is critical — without it, a `:DOWN` message may still
arrive and trip the catch-all (which would then re-enter handle_info logic
that assumed the worker was active).

## Multi-LiveView family drift — when you have N LVs sharing structure

If you have a "family" of LiveViews that render the same data via different
flows (e.g. `assessment_live` + `assessment_review_live` + N standalones), a
change in one is a debt in the others.

Heuristic for spotting one: similar filenames in the same directory, similar
template structure, sometimes the same render helper. If you're editing one
file in such a family, grep:

```bash
# What other files reference the same data shape?
grep -rln "your_changed_assign_name\|your_changed_render_fn" lib/*_web/live/
```

Edit them together or document the divergence intentionally. Atom-vs-string
key access (`result.strengths` vs `result["strengths"]`) is a common silent
drift point when one flow comes from an Ash struct and the other from JSON.

## Forms from Ash — `AshPhoenix.Form`, not plain changesets

```elixir
# ❌ Plain Ecto-style form for an Ash resource
def mount(_, _, socket) do
  changeset = Domain.change_thing(%Thing{}, %{})
  {:ok, assign(socket, form: to_form(changeset))}
end

# ✅ AshPhoenix.Form for Ash actions — knows about policies, code interfaces,
#    nested forms, action-name selection
def mount(_, _, socket) do
  form = AshPhoenix.Form.for_create(Thing, :create,
           actor: socket.assigns.current_user,
           domain: MyApp.Domain)
         |> to_form()
  {:ok, assign(socket, form: form)}
end

def handle_event("validate", %{"form" => params}, socket) do
  form = AshPhoenix.Form.validate(socket.assigns.form, params)
  {:noreply, assign(socket, form: form)}
end

def handle_event("save", %{"form" => params}, socket) do
  case AshPhoenix.Form.submit(socket.assigns.form, params: params) do
    {:ok, _thing} -> {:noreply, push_navigate(socket, to: ~p"/things")}
    {:error, form} -> {:noreply, assign(socket, form: form)}
  end
end
```

Project-side `ash_phoenix` reference (`.claude/skills/ash-framework/references/ash_phoenix.md`)
has the full surface.

## Self-review — before shipping LiveView code

- [ ] No raw `<textarea>`, `<select>`, `<input>` in HEEx — `<.input type=...>` for all.
- [ ] `<.flash_group>` appears in `layouts.ex` only; LV templates use `<Layouts.app>`.
- [ ] Every LV with PubSub / monitors / async tasks has a trailing
      `handle_info(_, socket)` catch-all.
- [ ] Every new `assign` from an async handler is referenced in the template.
- [ ] Every `Task.start` in a LV wraps its body in `try/rescue` and the LV
      transitions out of the loading state in success AND failure branches.
- [ ] Every `Process.monitor` is `demonitor`d (with `[:flush]`) in success,
      error, `:DOWN`, AND `terminate/2` paths.
- [ ] If editing one file in a multi-LV family, the other family members have
      been grep'd and either updated or explicitly skipped.
- [ ] Forms over Ash resources use `AshPhoenix.Form`, not raw changesets.
- [ ] `<.link navigate=...>` / `push_navigate` — never `live_redirect` /
      `live_patch` (deprecated).
