---
name: ash
description: >
  ALWAYS use when writing or modifying Ash code — resources, actions, changes,
  preparations, policies, code interfaces, AshPhoenix.Form, AshPostgres migrations.
  This is the Areté overlay: it contradicts a few upstream `usage_rules:ash`
  guidelines that have burned both areteos and arilearn-phx in production. Load
  alongside the project's auto-generated `ash-framework` skill, NOT in place of it.
  Trigger phrases: "ash", "ash resource", "ash action", "ash policy", "ash changeset",
  "code interface", "ash.read", "ash.create", "ash.update", "ash.get", "upsert",
  "after_transaction", "ash_phoenix", "ash form", "ash policy", "ash multitenancy".
---

# Ash — Areté Overlay

For Elixir projects using Ash (`areteos`, `arilearn-phx`). Both projects
auto-generate an `ash-framework` skill at `.claude/skills/ash-framework/` from
upstream `usage_rules`. **Read that first for general Ash usage** — this file
only documents Areté-specific overlays and the cases where upstream guidance
has burned us in production.

## Override #1 — Do NOT prefer bang functions (upstream says you should)

Upstream `usage_rules:ash` recommends "Always prefer the raising `!` variation."
**Both areteos and arilearn have paid for that in production.** A bang function
inside a function that advertises `{:ok, _} | {:error, _}` will:

- Crash a LiveView callback → reconnect → silent reload, no error to user
- Crash an Oban worker → retry storm
- Bypass `with/else` clauses (the raise short-circuits everything)
- Surface as an opaque 500 from an MCP tool

Rule: **non-bang + pattern match in any production code path.** Bang functions
are fine in seeds, factories, scripts, and tests.

```elixir
# ❌ WRONG — silent LiveView reload on missing record
def handle_event("load", %{"id" => id}, socket) do
  session = Areteos.Runs.get_session!(id, actor: socket.assigns.current_user)
  {:noreply, assign(socket, session: session)}
end

# ✅ CORRECT
def handle_event("load", %{"id" => id}, socket) do
  case Areteos.Runs.get_session(id, actor: socket.assigns.current_user) do
    {:ok, session} -> {:noreply, assign(socket, session: session)}
    {:error, %Ash.Error.Invalid{errors: [%Ash.Error.Query.NotFound{}]}} ->
      {:noreply, put_flash(socket, :error, "Not found")}
    {:error, _} -> {:noreply, put_flash(socket, :error, "Could not load")}
  end
end
```

Same rule applies to `Ash.create`, `Ash.update`, `Ash.destroy`, `Ash.read`,
`Ash.load`, code-interface bangs (`domain.create_thing!`), and inside `with`
chains.

## `authorize?: false` — when it's right, when it leaks data

`authorize?: false` has two completely different meanings, and Claude routinely
conflates them.

**Critical bypass (always wrong in user-facing code):**

```elixir
# ❌ WRONG — bypasses policies, ignores actor entirely
def handle_event("show_dashboard", _, socket) do
  reports = Domain.list_reports!(authorize?: false)
  {:noreply, assign(socket, reports: reports)}
end
```

**System-level inside a generic action `run` block (correct):**

```elixir
# ✅ CORRECT — action has its own policy gate; internal CRUD is system-level
create :send_invite do
  accept [:email]
  run fn input, ctx ->
    # The action's own policy block already gated who can call this.
    # CRUD inside run/2 is layering, not bypass.
    {:ok, _} = Domain.create_invite_record(input.arguments.email, authorize?: false)
    :ok
  end
end
```

The deadly variant: **removing `authorize?: false` without passing `actor:`.**

```elixir
# ❌ Silent empty results — actor is nil, ^actor(:id) becomes NULL
reports = Domain.list_reports!()           # used to be authorize?: false

# ✅ Pass the actor through
reports = Domain.list_reports!(actor: socket.assigns.current_user)
```

When the actor is `nil`, policy filter expressions like
`expr(user_id == ^actor(:id))` compile to `WHERE user_id = NULL` and return
zero rows — with no error. Looks like "data is missing" instead of "auth is
broken." Reliably caught in dev (you're logged in), silently breaks in prod or
in any non-LV context.

**Rule:** `Ash.load(record, :rel, actor: actor)` too — the load target may have
its own policies, and missing actor returns nil relationships.

## `get? true` ≠ "returns nil when missing" — name the right escape hatch

There are TWO different option names for "don't raise on missing record" and
which one you need depends on the call site.

| Call site                           | Option for "no error on missing" |
|------------------------------------|----------------------------------|
| `define :get_thing, get?: true`    | `not_found_error?: false`        |
| `Ash.get(Resource, id, ...)`       | `error?: false`                  |

```elixir
# Code interface — declares the action returns nil instead of {:error, NotFound}
code_interface do
  define :get_session_by_id,
    action: :read,
    get_by: [:id],
    not_found_error?: false           # ✅
end

# Direct Ash.get call
Ash.get(Resource, id, actor: actor, error?: false)   # ✅ returns nil on miss
```

Without the right option:

- `get?: true` alone → `{:error, %Ash.Error.Invalid{errors: [%Ash.Error.Query.NotFound{}]}}`
- `Ash.get(..)` alone → `{:error, %Ash.Error.Query.NotFound{}}`

No compile signal. The bug only fires when the record happens to be missing.

## `Ash.CiString` is not a binary

Any field typed `:ci_string` (or `Ash.Type.CiString`) — most commonly `email` —
is a `%Ash.CiString{}` struct. It implements `String.Chars` so interpolation
works, but most other binary operations don't.

```elixir
# ❌ Guard never matches — is_binary/1 is false for %Ash.CiString{}
defp display(%{email: email}) when is_binary(email), do: email
defp display(_), do: "Unknown"

# ❌ Always false — comparing struct to binary
if user.email == "x@y.com", do: ...

# ❌ Jason.encode! raises on the struct
Jason.encode!(%{user_email: user.email})

# ❌ Swoosh expects binary, gets struct
Email.new() |> to(user.email)

# ✅ Convert at every binary boundary
to_string(user.email)
"#{user.email}"                     # safe — String.Chars
```

Rule: any time you cross a JSON / email / log / external-system boundary with
a CiString-backed field, wrap it in `to_string/1`.

## Upsert without `upsert_fields` is silent find-or-create

```elixir
# ❌ Conflict returns the EXISTING row unchanged — no error, no update
create :upsert do
  upsert? true
  upsert_identity :unique_email
end

# ✅ Declare which fields to update on conflict (or :replace_all)
create :upsert do
  upsert? true
  upsert_identity :unique_email
  upsert_fields [:email, :display_name, :last_seen_at]
end
```

Single-create tests pass. The bug only manifests on the second call. Write a
"mutate then upsert again" test for any new upsert.

## Generic action `run` blocks must return `{:error, _}` — never raise

A generic action wrapped by the non-bang `Ash.run_action/1` is still subject
to the bang anti-pattern internally.

```elixir
# ❌ Raises bubble up — caller's pattern match on {:error, _} never matches
action :create_from_template, :map do
  argument :template_id, :uuid, allow_nil?: false
  run fn input, _ctx ->
    template = Templates.get!(input.arguments.template_id)
    if invalid?(template), do: raise Ash.Error.Invalid.exception(errors: [...])
    {:ok, %{...}}
  end
end

# ✅ Non-bang lookups, return tagged tuples
action :create_from_template, :map do
  argument :template_id, :uuid, allow_nil?: false
  run fn input, _ctx ->
    with {:ok, template} <- Templates.get(input.arguments.template_id),
         :ok <- validate(template) do
      {:ok, %{...}}
    else
      {:error, %Ash.Error.Invalid{errors: [%Ash.Error.Query.NotFound{}]}} ->
        {:error, "Template not found"}
      {:error, reason} -> {:error, reason}
    end
  end
end
```

## Bracket access doesn't work on Ash structs

```elixir
# ❌ UndefinedFunctionError — Ash structs don't implement Access
session[:status]
user[:email]

# ✅ Dot access only
session.status
user.email
```

Tests using plain-map fixtures support `[:field]` and pass. Production crashes.
**Build fixtures via `Ash.create!`** (bang in tests is fine) — never plain maps
as resource substitutes.

## Domain code_interface, not raw `Ash.update(record, %{}, action: :x)`

Anywhere outside the domain (controllers, LiveViews, Oban workers, MCP tools),
call the code interface — never `Ash.update/3` or `Ash.create/3` with an
inline `action:` argument.

```elixir
# ❌ Web layer
Ash.update(session, %{}, action: :complete, actor: actor)

# ✅ Domain interface
Arilearn.Assessment.complete_session(session, actor: actor)
```

Two reasons:
1. Some resources have no primary update action; `Ash.update/3` will raise.
2. The action name is then a string typo-able in a web template; the
   code-interface alias gets compile-checked.

## Side effects belong in `after_transaction`, not `after_action` or inline

`after_action` runs **inside** the Ash transaction. A raise rolls everything
back. PubSub broadcasts inside the transaction expose subscribers to
uncommitted rows.

```elixir
# ❌ Side effect inside transaction — rollback on failure, dirty reads otherwise
Repo.transaction(fn ->
  {:ok, record} = Ash.create(Resource, attrs)
  Phoenix.PubSub.broadcast(MyApp.PubSub, "topic", {:created, record})
  record
end)

# ✅ Hook fires AFTER commit; failure is logged, parent action stays committed
defmodule MyApp.Changes.NotifyCreated do
  use Ash.Resource.Change
  def change(changeset, _opts, _ctx) do
    Ash.Changeset.after_transaction(changeset, fn
      _changeset, {:ok, record} ->
        Phoenix.PubSub.broadcast(MyApp.PubSub, "topic", {:created, record})
        {:ok, record}
      _changeset, {:error, _} = err ->
        err
    end)
  end
end
```

Same rule for storage writes (S3, disk), external API calls, and email sends.
If they MUST happen inside the transaction (rare), wrap each side effect in
`try/rescue` and explicitly decide whether the rollback is what you want.

## Migration index naming for identities

When an Ash identity gets an `ash_postgres` migration, AshPostgres can only
translate Postgres error 23505 → `Ash.Error.Invalid` when the index name
follows the convention `<table>_<identity_name>_index`. Otherwise you get an
opaque `Ash.Error.Unknown` with no field attribution.

```elixir
# In the generated migration
create unique_index(:users, [:email], name: :users_unique_email_index)
#                                          ^^^^^^^^^^^^^^^^^^^^^^^^^
#                                          must match identity_name
```

When you add a new identity, eyeball the generated migration before running
it.

## Verify production callers exist after defining an action

`mix compile` and `mix test` will pass for an action that has NO production
caller (factories and tests can call it directly). The bug only surfaces when
a real user hits the path.

After defining a new `define :foo` or new action `:foo`:

```bash
grep -rn "\.foo[!(]\|action: :foo" lib/ --include="*.ex" | grep -v "lib/<my_resource>.ex"
```

Zero hits outside the resource itself = P0 unreachable code. Same audit for
state-transition actions (`:abandon`, `:cancel`, `:retry`) — make sure every
`try_again`/`reset`/`new_attempt` handler calls them.

## Self-review — before shipping Ash code

- [ ] No bang functions in LiveView, Oban, `with` chains, MCP tools, or any
      `{:ok,_} | {:error,_}` API. Bang only in seeds/factories/scripts/tests.
- [ ] Every Ash call from web/Oban layer passes `actor:` (not `authorize?: false`).
- [ ] `get? true` code interfaces have `not_found_error?: false`; direct
      `Ash.get` calls that should return nil have `error?: false`.
- [ ] CiString fields go through `to_string/1` at JSON / email / Swoosh /
      `==` / `is_binary/1` boundaries.
- [ ] Upsert actions declare `upsert_fields [...]` (or `:replace_all`).
- [ ] Generic action `run` blocks return `{:error, _}` and don't raise.
- [ ] No bracket access on Ash structs; fixtures built via `Ash.create!`.
- [ ] Web layer calls domain code interfaces, not `Ash.update(record, %{}, action: :x)`.
- [ ] Side effects use `after_transaction`, not `after_action` or inline.
- [ ] New action / identity has a production caller AND named migration index.
