---
name: elixir
description: >
  ALWAYS use when writing Elixir code — modules, GenServers, supervisors, with
  chains, pipelines. Areté overlay for Elixir 1.15+ projects. Load alongside
  `phoenix` for web work, `ash` for resource/action work, `jido-reqllm-tools`
  for areteos agent code. The project's auto-generated `phoenix-framework`
  skill includes upstream `usage_rules:elixir` — read that for general idioms.
  Trigger phrases: "elixir", "genserver", "supervisor", "otp", "mix",
  "defmodule", "pattern match", "pipe operator", "with chain", "tagged tuple",
  "process", "task", "agent", "ecto", "telemetry".
---

# Elixir — Areté Overlay

This file documents the recurring Elixir mistakes that have shipped to
production at Areté. It is NOT a textbook — for general idioms (function
heads, pattern matching, pipes, tagged tuples, `String.to_atom` on user input),
read the project's auto-generated `phoenix-framework/references/elixir.md`.
This file covers the patterns that keep recurring even with that loaded.

## `with` chain captures stale data before a mutation later in the chain

The most common shipping bug. Claude refactors to thread a pre-loaded list
through a `with` chain (eliminating a duplicate query); the list is captured
before a mutation step and consumed after, producing N-1 results.

```elixir
# ❌ Stale capture — `challenges` is the pre-mutation list
def submit(session_id, answer, actor) do
  with {:ok, session}    <- get_session(session_id, actor: actor),
       challenges         = session.challenges,
       {:ok, _attempt}   <- record_attempt(session, answer, actor),
       :ok               <- guard_remaining(challenges) do
                                          # ^ wrong — pre-mutation list
    {:ok, session}
  end
end

# ✅ Re-read after mutation, OR explicitly thread the updated value
def submit(session_id, answer, actor) do
  with {:ok, session}    <- get_session(session_id, actor: actor),
       {:ok, _attempt}   <- record_attempt(session, answer, actor),
       {:ok, refreshed}  <- get_session(session_id, actor: actor),
       :ok               <- guard_remaining(refreshed.challenges) do
    {:ok, session}
  end
end
```

Rule: if a value is captured BEFORE a step that mutates the underlying record,
re-read it AFTER. The optimization "I already have this in memory, why re-fetch"
is exactly when the bug ships.

## `with/else` — inner bindings don't escape

Bindings introduced inside the `with` head are NOT in scope in `else`. Refer
to one and the compiler may silently match an outer-scope variable of the
same name.

```elixir
# ❌ `state` from {:ok, state} is not bindable here
with {:ok, state}  <- init_state(),
     {:ok, result} <- process(state) do
  {:ok, result}
else
  {:error, reason} -> {:error, {reason, state}}   # compile-error OR outer shadow
end

# ✅ Thread state through the error
with {:ok, state}    <- init_state(),
     {:ok, result}   <- process(state) |> tag_with(state) do
  {:ok, result}
else
  {:error, {reason, state}} -> {:error, {reason, state}}
end
```

When the `else` branch needs mid-chain state, pass it via the error tuple.

## `String.to_integer/1` and `Float.parse/1` on user input → crash

Both raise / return surprises on bad input. They look like "parse" but behave
like "assert." Form params, URL params, query strings — all user-controlled.

```elixir
# ❌ Crashes on "" or "abc"
difficulty = String.to_integer(params["difficulty"])

# ❌ Float.parse("1abc") returns {1.0, "abc"} — the remainder is silently ignored
{score, _} = Float.parse(params["score"])
```

```elixir
# ✅ Defensive variants with explicit fallback
def parse_int(value, default \\ 0) do
  case Integer.parse(to_string(value)) do
    {n, ""} -> n
    _       -> default
  end
end

# ✅ Direct String.to_integer ONLY on trusted internal data (config, YAML)
String.to_integer(yaml_config["version"])
```

Same trap with `String.to_atom/1` — already covered upstream — but the
integer/float variants aren't.

## `Mix.env()` and Mix APIs are not available at runtime

`Mix` is a build-time tool. Code under `lib/` runs in releases where Mix is
not loaded. Calling `Mix.env()` in any module compiled into a release will
crash on first call in prod.

```elixir
# ❌ Compiles in dev. Crashes in release.
defmodule MyApp.Worker do
  def adapter, do: if(Mix.env() == :test, do: TestAdapter, else: ProdAdapter)
end

# ✅ Resolve env at config time, read at runtime
# config/config.exs
config :my_app, :worker_adapter,
  (if config_env() == :test, do: TestAdapter, else: ProdAdapter)

# lib/my_app/worker.ex
defmodule MyApp.Worker do
  def adapter, do: Application.fetch_env!(:my_app, :worker_adapter)
end
```

Rule: any environment-conditional logic lives in `config/*.exs`. `lib/` reads
the resolved value via `Application.get_env/3` or `Application.fetch_env!/2`.

## `Task.start` inside any process that observes its result is wrong

`Task.start/1` is fire-and-forget — no link, no monitor. If the task crashes,
the parent never finds out. If the parent set a `loading: true` assign before
the task and waits for a message back, the UI is stuck forever.

```elixir
# ❌ Task raises → parent never sees :done → spinner forever
parent = self()
Task.start(fn ->
  result = expensive_compute(args)
  send(parent, {:done, result})
end)

# ✅ Wrap the body in try/rescue, always send something back
Task.start(fn ->
  try do
    result = expensive_compute(args)
    send(parent, {:done, result})
  rescue
    e -> send(parent, {:failed, Exception.message(e)})
  end
end)

# ✅✅ Or use Task.Supervisor + monitor / await — the supervised path
{:ok, task} = Task.Supervisor.start_child(MyApp.TaskSup, fn -> ... end)
```

For LiveView specifics see `phoenix` skill — `Task.start` + `:loading` assign
is the canonical stuck-spinner bug.

## Side effects outside `Repo.transaction` / Ash actions

Anything non-idempotent and non-rollback-able (S3 puts, email sends, external
API calls, PubSub broadcasts, log appends) goes OUTSIDE the transaction. Two
failure modes inside:

1. The side effect raises → transaction rolls back → caller sees `{:error, _}`
   and retries → duplicate writes.
2. The side effect succeeds, transaction rolls back → orphan in S3 / email
   already sent for a user who doesn't exist.

```elixir
# ❌ S3 put inside transaction — orphan on rollback
Repo.transaction(fn ->
  {:ok, doc} = Ecto.Multi.new() |> ... |> Repo.transaction()
  {:ok, _}   = Storage.put(doc.id, file_content)   # orphan on outer rollback
  doc
end)

# ✅ Storage outside; cleanup on DB failure
with {:ok, doc}     <- create_doc_record(attrs),
     {:ok, _}       <- Storage.put(doc.id, file_content) do
  {:ok, doc}
else
  {:error, reason} ->
    Storage.delete(attrs[:id])         # best-effort cleanup
    {:error, reason}
end
```

Same rule for `Phoenix.PubSub.broadcast/3` — broadcast after commit, not inside.
For Ash actions specifically, see `ash` skill (`after_transaction` hook).

## Tagged tuples, always

Any function that can fail returns `{:ok, value} | {:error, reason}`. No bare
returns, no raises for expected failure. Public API gets a `@spec`.

```elixir
@spec fetch_user(integer()) :: {:ok, User.t()} | {:error, :not_found}
def fetch_user(id) do
  case Repo.get(User, id) do
    nil   -> {:error, :not_found}
    user  -> {:ok, user}
  end
end
```

`raise` is for programmer error (impossible state reached), not for
"user typed something invalid" or "external service is down."

## Don't reach for GenServer first

In order of preference for "I need to do work":

1. A plain function. Most "background work" doesn't need state.
2. `Task.async/await` for parallel computation that joins back.
3. `Task.Supervisor.start_child` for fire-and-forget with supervision.
4. `Oban` for retryable, persistent work.
5. `GenServer` only when you genuinely need a long-lived stateful process
   with serialized message handling.

`Agent` is a degenerate `GenServer` — fine for transient mutable state
shared between tool callbacks (see `jido-reqllm-tools.md`), but rarely the
right answer for application state.

## Self-review — before shipping Elixir code

- [ ] Any value captured before a mutation step is either re-read after, or
      explicitly threaded.
- [ ] `with/else` only refers to outer-scope bindings.
- [ ] `String.to_integer/1` and `Float.parse/1` are gated behind validation
      or only run on trusted internal data.
- [ ] No `Mix.env()` or `Mix.*` calls in `lib/`.
- [ ] Every `Task.start` body has `try/rescue` and always sends a message
      back to the listener.
- [ ] Side effects (storage, email, PubSub, external API) happen outside
      `Repo.transaction` / Ash transactions, or have explicit rollback logic.
- [ ] Fallible functions return `{:ok, _}` / `{:error, _}` — no raise on
      expected failure.
