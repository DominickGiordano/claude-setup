---
name: jido-reqllm-tools
description: >
  ALWAYS use when defining LLM tools, building agentic loops, or calling LLMs in
  Elixir projects that use Jido + ReqLLM (e.g. areteos). Covers the 1-arity tool
  callback contract, per-invocation context closures, AshJido → ReqLLM bridging,
  model aliases, and the ReqLLM call shapes (generate_text / stream_text / embed /
  generate_object) plus their non-obvious gotchas. Trigger phrases: "jido", "req_llm",
  "ReqLLM", "tool", "tool_call", "agent loop", "AgentLoop", "AshJido",
  "model alias", "embed", "generate_object", "stream_text".
---

# Jido + ReqLLM Tools

For Elixir projects using `jido` + `req_llm` + `ash_jido` (e.g. `areteos`). These
patterns are NOT inferable from upstream Jido or ReqLLM docs alone — they're
project conventions that produce silently-wrong code if violated.

## The 1-arity tool callback rule

`ReqLLM.Tool` callbacks are **1-arity**, not 2-arity:

```elixir
ReqLLM.Tool.new!(
  name: "search_libraries",
  description: "...",
  parameter_schema: %{...},
  callback: fn args -> invoke(args) end   # ✅
)
```

NOT `fn args, context -> ... end`. A 2-arity callback will crash at first
invocation under `ReqLLM.Context.execute_and_append_tools`.

`ash_jido` produces 2-arity callbacks `(args, context)` — they must be wrapped
into 1-arity by closing over a `jido_context` map (`%{domain:, actor:, tenant:}`).
The canonical bridge is `Areteos.Runs.AshToolResolver`.

## Per-invocation context — use a 0-arity reader closure

Tool structs are **reused across turns** in the agent loop. Capturing actor /
run_id / tenant at build time freezes turn-1 values into turn-N. Wrong.

Pattern:

```elixir
@spec build((-> map())) :: ReqLLM.Tool.t()
def build(context_reader) when is_function(context_reader, 0) do
  ReqLLM.Tool.new!(
    ...,
    callback: fn args -> invoke(args, context_reader) end
  )
end

defp invoke(args, context_reader) do
  ctx = context_reader.()    # read fresh on every tool call
  ...
end
```

The reader fn is invoked on **every** call. This is the most important security
pattern for tool-based RAG — stale-context capture is how cross-tenant leaks
happen.

## Never call provider APIs directly

Always go through `ReqLLM`. Approved entry points:

- `ReqLLM.Generation.generate_text/3` — non-streaming text
- `ReqLLM.stream_text/3` + `ReqLLM.StreamResponse.process_stream/2` — streaming
- `ReqLLM.embed/3` — embeddings
- `ReqLLM.generate_object/4` — structured output

Calling `Anthropic`, `OpenAI`, etc. directly bypasses the project's model alias
resolution, error classification, and telemetry.

## Model aliases via `Jido.AI`

Configured in `config/config.exs`:

```elixir
config :jido_ai, :model_aliases,
  fast: "anthropic:claude-haiku-4-5-20251001",
  capable: "anthropic:claude-sonnet-4-20250514",
  thinking: "anthropic:claude-sonnet-4-20250514"
```

Resolution: `Jido.AI.resolve_model(:fast | :capable | :thinking)` returns the
provider:model string. Convention:

- Reference aliases (`:fast`, `:capable`, `:thinking`) — never raw model names —
  in agent config.
- Default when no model is set: `:capable`.
- Alias detection heuristic: a string with no `:` is treated as an alias. Don't
  introduce alias names containing `:`.

## ReqLLM call-shape gotchas

### `ReqLLM.embed/3` — no `embed_many/3`

Pass a binary for one input or a list for batched. **Response order is guaranteed
by ReqLLM sorting on `"index"`** — the underlying provider may return out of order.

Tests that stub batched embeddings **must shuffle** the response list, otherwise
returning items in `index` order is a silent no-op and the sort is never exercised.

### `ReqLLM.generate_object/4` — nested-object schema shape

A list of objects requires the two-tuple `{:map, keyword_list}` form for the
inner type:

```elixir
# ✅ correct
{:list, {:map, [
  field_a: [type: :integer, required: true],
  field_b: [type: :string, required: false]
]}}

# ❌ wrong — runtime error
{:list, %{field_a: :integer, field_b: :string}}
```

Each field is its own `[type: _, required: _]` keyword list. Wrong-shape errors
surface only at runtime.

## Agent loop — there is one, and it's bounded

Use the project's `AgentLoop` (`Areteos.Runs.AgentLoop`) via `AgentStepExecutor`.
**Do not** add alternate loop modes to step config or write a parallel loop in
a new module.

The loop:
- Pure ReAct: get `tool_calls/1`, execute, append `tool_result_message`, recurse.
- Bounded by `max_iterations` (default `10` when AgentVersion doesn't specify).
- Suspension via `Process.delete(:hitl_suspension)` — the `request_human_input`
  tool sets this in the process dictionary; the loop reads-and-deletes.
- Telemetry per turn via `Areteos.Runs.EventRecorder` + OTel span
  `areteos.agent.tool_loop.iteration`.

Streaming is a **separate** path (see `chat_message/changes/respond.ex`) — it
threads `ReqLLM.stream_text` + `ReqLLM.Context.execute_and_append_tools` through
the tool loop manually. Don't try to bolt streaming onto `AgentLoop`.

## Mutable tool state — `Agent` + `try/after Agent.stop`

When tools need shared mutable state (e.g. DAG mutation across calls), spin up
a transient `Agent` and pass the pid into each tool's closure:

```elixir
{:ok, pid} = Agent.start_link(fn -> initial_state end)
try do
  # build tools that close over `pid`, run the loop
after
  Agent.stop(pid)
end
```

`Agent.stop` in `after` is **critical** — orphaned Agents on a long-lived runner
(FLAME) leak memory. Don't skip the `after` clause even on the happy path.

## Self-review — before shipping a tool or agent change

- [ ] Tool callback is 1-arity, not 2-arity
- [ ] Per-invocation context comes from a 0-arity reader, not a captured value
- [ ] LLM calls go through `ReqLLM.*` — no direct provider SDKs
- [ ] Model is referenced by alias (`:fast` / `:capable` / `:thinking`)
- [ ] Stubbed embed responses in tests are shuffled
- [ ] `generate_object` nested lists use `{:list, {:map, keyword_list}}`
- [ ] No new agent loop — extends `AgentLoop` or stays in the existing seam
- [ ] Any `Agent.start_link` in tool setup has matching `Agent.stop` in `after`
