# Research: Ash 3.0 + Jido + ReqLLM conventions in `areteos`

**Date**: 2026-05-05
**Decision it informs**: Whether (and how) to promote Ash / Jido / ReqLLM / Oban / pgvector patterns into global skills under `~/.claude/skills/`. Today the global config has only generic `elixir.md` and `phoenix.md` — anything Ash- or Jido-specific is invisible to Claude when it's not in the `areteos` project.
**Status**: Complete. All claims grounded in actual `areteos` source files; cited inline.

## Question
What are the project-specific Ash / Jido / ReqLLM / Oban / pgvector / Anubis-MCP conventions in `areteos` that aren't already covered by stock upstream usage rules, and which of them are stable enough to lift into reusable global skills?

## Stack inventory

Source: `/Users/dom/dev/arete/areteos/mix.exs:80-153`

| Lib | Version pin | Role |
|---|---|---|
| `ash` | `~> 3.0` | Domain / resource framework (everything below builds on this) |
| `ash_postgres` | `~> 2.0` | Postgres data layer for Ash resources |
| `ash_authentication` | `~> 4.0` | Auth strategies (password, magic link, OIDC, API key) |
| `ash_authentication_phoenix` | `~> 2.0` | LiveView sign-in routes |
| `ash_phoenix` | `~> 2.0` | LiveView form helpers + integration |
| `ash_admin` | `~> 0.14` | Auto-generated admin UI |
| `ash_json_api` | `~> 1.0` | JSON:API endpoints |
| `ash_oban` | `~> 0.7` (`pro?: false`) | Trigger background jobs from Ash actions |
| `ash_jido` | git `agentjido/ash_jido#main` | Auto-generates Jido Actions / LLM tools from Ash resources |
| `jido` | `~> 2.0` | Agent framework (used as primitives, not the loop driver) |
| `jido_ai` | `~> 2.0.0-rc` | Model-alias resolver (`Jido.AI.resolve_model/1`) |
| `jido_action` | `~> 2.0` | Jido action behaviour |
| `req_llm` | `~> 1.10` (override) | The LLM call layer — generation, streaming, embeddings, tools |
| `oban` + `oban_web` | `~> 2.0` | Job processing + dashboard |
| `pgvector` | `~> 0.3` | `vector(N)` Postgres column codec |
| `text_chunker` | `~> 0.6` | Text → chunk splitter for RAG ingestion |
| `anubis_mcp` | github `aretecp/anubis-mcp#main` | MCP client + server (forked from upstream) |
| `req` | `~> 0.5` | Default HTTP client; `httpoison`/`tesla`/`httpc` are forbidden (`AGENTS.md:8`) |
| `flame` | `~> 0.5` | LLM workload offloading (currently `LocalBackend`) |

Notable skill-bundle output: `mix usage_rules` is configured (`mix.exs:29-55`) to emit `AGENTS.md` and build two combined skills under `.claude/skills/`: `ash-framework` (description: "Use this skill working with Ash Framework or any of its extensions") and `phoenix-framework`. The `ash` reference alone is 1337 lines (`/Users/dom/dev/arete/areteos/.claude/skills/ash-framework/references/ash.md`). These bundles are the upstream ground truth — promoting them to global skills wholesale is plausible.

## Ash conventions — what's specific to this codebase

### Resource header is always six lines

Every resource in `lib/areteos/` opens with the same shape (e.g. `lib/areteos/accounts/user.ex:1-8`, `lib/areteos/runs/run.ex:1-9`):

```elixir
use Ash.Resource,
  otp_app: :areteos,
  domain: Areteos.<Domain>,
  data_layer: AshPostgres.DataLayer,
  authorizers: [Ash.Policy.Authorizer],
  extensions: [AshOban, AshJido, AshJsonApi.Resource],
  simple_notifiers: [Areteos.Audit.Notifier]
```

`simple_notifiers: [Areteos.Audit.Notifier]` is the project's audit hook — every write is captured. New resources should keep it unless there's a documented reason not to.

### Domain conventions

- Top-level domains live as siblings of the parent module: `lib/areteos/accounts.ex`, `lib/areteos/accounts/`, `lib/areteos/runs.ex`, `lib/areteos/runs/`.
- The default ash_jido tool resolver allowlists three domains by default: `Areteos.Workflows`, `Areteos.Runs`, `Areteos.Projects` (`lib/areteos/runs/ash_tool_resolver.ex:12`). Adding a new `AshJido`-backed domain that should expose tools to agents requires updating that allowlist.

### Policies — `action_type` over `action`

`lib/areteos/libraries/library_entry_chunk.ex:220-246` deliberately uses `policy action_type(:read)` rather than `policy action(:read)` so the same policy block covers `:read`, `:read_by_ids`, `:dense_search`, `:keyword_search` uniformly. A new read action without policy coverage would either deny all access or (worse) bypass the cross-tenant invariant. This pattern is enforced by `test/areteos/libraries/cross_tenant_ann_isolation_test.exs`.

### Policy-before-ANN is a security invariant

`authorize_if expr(exists(...))` policies on `LibraryEntryChunk` MUST compose as WHERE clauses BEFORE the ANN `ORDER BY`. Violations don't crash — they leak data across tenants. Documented in `AGENTS.md:110` and `docs/solutions/security-issues/rag-policy-filter-before-ann-isolation-requirement.md`.

### Custom checks for `:create` policies

Expression-based policies cannot traverse relationships on records that don't exist yet. The codebase uses `SimpleCheck` modules (e.g. `Areteos.Libraries.Checks.ChunkAccess`, `lib/areteos/libraries/library_entry_chunk.ex:251`; `Areteos.Integrations.Checks.McpServerCredentialAccess`, `AGENTS.md:102`) to gate creates instead.

### Identity → migration index naming contract

A unique index for identity `:foo_bar` on table `my_table` MUST be named `my_table_foo_bar_index`. AshPostgres relies on the name to translate constraint violations into `Ash.Error.Invalid` (otherwise you get `Ash.Error.Unknown`). `AGENTS.md:109`.

### `Ash.Type.Vector` is forbidden — use `Areteos.Types.Pgvector`

Built-in `Ash.Type.Vector` uses `%Ash.Vector{}` which is wire-incompatible with the `%Pgvector{}` codec used by the `pgvector` extension. The custom type at `lib/areteos/types/pgvector.ex` accepts plain lists or `%Pgvector{}` structs and validates `dimensions:` constraints on cast. Wired together with `Postgrex.Types.define/3` in `lib/areteos/postgrex_types.ex` and `config :areteos, Areteos.Repo, types: Areteos.PostgrexTypes`. `AGENTS.md:108`.

### `vector(N)` columns require raw migration SQL

`add :col, :vector, size: 1536` renders as bare `vector` (no dimension). Workaround: `add :col, :binary` then `execute "ALTER TABLE ... ALTER COLUMN col TYPE vector(1536) USING NULL"`. Same applies to HNSW/GIN indexes — the AshPostgres `custom_indexes` DSL doesn't support `vector_cosine_ops` or `WITH (m=16, ef_construction=64)`. `AGENTS.md:111-112`.

### `Ash.Query.filter` on `timestamp without time zone` is wrong on non-UTC sessions

It emits `column::timestamptz < $1::timestamptz`. On a non-UTC dev session this shifts stored values by the session offset, producing wrong results in maintenance/cron queries. Workaround: use raw `Repo.query!` with a `NaiveDateTime` parameter. Long-term fix tracked as `areteos-hlrt`. `AGENTS.md:113`.

### Ash dot-access only — never bracket access

`AGENTS.md:62`: "**Always** use dot access (`resource.field`), **never** bracket access (`resource[:field]`) on Ash structs." Bracket access yields `nil` silently for unloaded fields rather than raising on `%Ash.NotLoaded{}`.

### Expression calcs for UI presence-state

Drive UI toggles with `calculate :has_x, :boolean, expr(not is_nil(col))` instead of loading the heavy column. Compiles to a SQL `NOT IS NULL` projection — zero column data transferred. Documented at `AGENTS.md:118`.

### `cascade_destroy` over raw FK ON DELETE

`lib/areteos/libraries/library_entry_chunk.ex:48-54` keeps `reference :library_entry, on_delete: :delete` AS belt-and-suspenders, but the Ash-level cascade comes from `cascade_destroy(:chunks, ...)` on the parent's destroy action — that's the path that triggers after_destroy hooks and policy checks.

### `require_atomic? false` is common

Almost every state-mutating update action sets `require_atomic? false` (e.g. `lib/areteos/runs/run.ex:53,62,71,85,93,99` — `:process`, `:complete`, `:fail`, `:requeue`, `:pause`, `:resume`). Atomic updates can't run arbitrary `change` modules; the project leans on imperative changes for state-machine transitions and is comfortable taking the round-trip cost.

## Ash + Phoenix integration

Source: `lib/areteos_web/router.ex`

- `use AshAuthentication.Phoenix.Router` at the top (line 5).
- `sign_in_route register_path: "/register", ...` with `AreteosWeb.AuthOverrides` + `AshAuthentication.Phoenix.Overrides.DaisyUI` (lines 160-180). They customize but explicitly inherit DaisyUI even though the broader app doesn't use DaisyUI — auth UI is the carve-out.
- `magic_sign_in_route(Areteos.Accounts.User, :magic_link, ...)` (line 183).
- `forward "/", AreteosWeb.AshJsonApiRouter` is mounted under its own scope (line 216) — the comment at line 203 warns that the JSON API forward is a catch-all, so any specific Phoenix routes must be defined first.
- `import AshAdmin.Router` + `ash_admin "/"` mounted at `/admin` inside a scope (lines 243-248).
- `Anubis.Server.Transport.StreamableHTTP.Plug` is mounted via `forward "/", ...` for MCP (`lib/areteos_web/router.ex:193`).

Auth strategies on `User` (`lib/areteos/accounts/user.ex:40-77`):
- `password :password` with `BcryptProvider`, resettable, sign-in tokens enabled
- `remember_me :remember_me`
- `magic_link` with `registration_enabled?: true`, `require_interaction?: true`
- `api_key` with `api_key_relationship :valid_api_keys` (filtered `has_many`)
- `oidc :microsoft` with all fields read from `Areteos.Secrets`

Tokens are persistent (`store_all_tokens?: true`, `require_token_presence_for_authentication?: true`, lines 32-38) — a deliberate deviation from JWT-only setups; allows server-side revocation.

Per-user provisioning is wired as a `change` module: `Areteos.Accounts.Changes.ProvisionWorkspace` runs on every registration path (`:register_with_password`, `:sign_in_with_magic_link`, `:register_with_microsoft`, lines 202, 282, 321). The change is responsible for guarding against duplicates.

## Ash + Oban integration

Pattern: declare `extensions: [AshOban]` and add an `oban do triggers do ...` block inline in the resource.

### Cron-driven trigger (poll for pending state)

`lib/areteos/runs/run.ex:23-35`:
```elixir
oban do
  triggers do
    trigger :process_pending do
      queue :runs_process_pending
      action :process
      where expr(status == :pending)
      scheduler_cron "* * * * *"
      timeout 600_000
      worker_module_name Areteos.Workers.Runs.ProcessPending
      scheduler_module_name Areteos.Schedulers.Runs.ProcessPending
    end
  end
end
```

Convention: every trigger gets explicit `worker_module_name` AND `scheduler_module_name` under `Areteos.Workers.<Domain>.<Trigger>` and `Areteos.Schedulers.<Domain>.<Trigger>`. Without this, AshOban auto-generates names that change if the trigger is renamed — breaking job stability. `mix ash_oban.set_default_module_names` exists but the project pins names by hand.

### Inline-triggered (run on action call)

`lib/areteos/workflows/chat_message.ex:24-49`:
```elixir
oban do
  triggers do
    trigger :respond do
      actor_persister Areteos.Workflows.ChatActorPersister
      action :respond
      queue :chat_responses
      lock_for_update? false
      scheduler_cron false   # disabled — only fires from `run_oban_trigger`
      where expr(needs_response)
      worker_module_name Areteos.Workflows.ChatMessage.AshOban.Worker.Respond
      scheduler_module_name Areteos.Workflows.ChatMessage.AshOban.Scheduler.Respond
    end
  end
end

create :create do
  ...
  change run_oban_trigger(:respond)   # fires the trigger from inside the create action
end
```

`scheduler_cron false` plus `run_oban_trigger(:respond)` in the create action gives a "fire on demand from an action change" pattern — different from the cron-poll pattern above. `actor_persister` is set so the worker can rehydrate the actor when it executes async.

### Worker return-value semantics (`AGENTS.md:73-89`)

Project policy is explicit — beyond stock Oban:
- `{:ok, _}` → success
- `{:cancel, reason}` → permanent failure, no retry. **Always** for known-bad input (corrupt files, oversized content, unsupported types). Never `{:error, _}`.
- `{:error, reason}` → transient failure, retried per `max_attempts`
- `{:snooze, seconds}` → defer without consuming a retry attempt — **always** for `pg_try_advisory_lock` contention

### Session advisory locks require `Repo.checkout/1`

`pg_try_advisory_lock` is session-scoped. Without `Repo.checkout/1`, the pool can hand out different connections for acquire / pipeline / unlock, leaving a dangling lock. Wrap acquire→work→unlock in `Repo.checkout(fn -> ... end)`. Documented at `AGENTS.md:81-85`.

### DB-first, broadcast-second

Never call `Phoenix.PubSub.broadcast` inside an open `Repo.transaction`. Subscribers see pre-commit state and may receive phantom events on rollback. The Ash idiom is `after_transaction` callbacks — see e.g. `Vault.Credential` rotation broadcast (`AGENTS.md:86-89, 100`).

## Jido + ReqLLM agentic loop

This is the most project-specific surface. Stock Jido docs talk about `Jido.Agent` workers; `areteos` uses **Jido as primitives** and writes its own loop.

### Tool format — 1-arity callbacks (HARD RULE)

`AGENTS.md:57`: "Define tools as `ReqLLM.Tool` structs. Callbacks are **1-arity** (`fn args -> ...`), NOT 2-arity."

Canonical example: `lib/areteos/runs/tools/library_retrieve.ex:115-149`:
```elixir
@spec build((-> map())) :: ReqLLM.Tool.t()
def build(context_reader) when is_function(context_reader, 0) do
  ReqLLM.Tool.new!(
    name: "search_libraries",
    description: "...",
    parameter_schema: %{ "type" => "object", "properties" => %{...}, "required" => [...] },
    callback: fn args -> invoke(args, context_reader) end
  )
end
```

Two non-obvious patterns embedded here:

1. **0-arity context-reader closure for per-invocation context** (`library_retrieve.ex:14-23, 152-176`). The callback reads `actor`, `run_id`, `step_run_id`, `attached_library_ids` on EVERY call by invoking the reader fn — not capturing them at build time. The agent loop reuses the same tool struct across turns, so capturing would freeze stale values from turn 1 into turn N. This is the single most important security pattern in the codebase for tool-based RAG.
2. **`ash_jido` adapter that wraps the upstream 2-arity callback into a 1-arity one** (`lib/areteos/runs/ash_tool_resolver.ex:47-80`). `ash_jido` produces 2-arity functions `(args, context)`; `AshToolResolver` wraps them by closing over a `jido_context` map (`%{domain:, actor:, tenant:}`) and exposing the resulting 1-arity callable as a `ReqLLM.Tool`. This is the bridge between Ash's domain layer and ReqLLM's tool protocol.

### LLM call layer — never call providers directly

`AGENTS.md:58`: "Use `ReqLLM.Generation.generate_text/3` and `stream_text/3` — never call provider APIs directly."

In practice:
- `ReqLLM.Generation.generate_text/3` for non-streaming (`lib/areteos/workflows/sop_generator.ex:248`, `lib/areteos/runs/step_executors/agent_step_executor.ex:394, 442`)
- `ReqLLM.stream_text/3` + `ReqLLM.StreamResponse.process_stream/2` with `on_result:` and `on_thinking:` callbacks for streaming (`lib/areteos/workflows/chat_message/changes/respond.ex:163-179`, `agent_step_executor.ex:422`)
- `ReqLLM.embed/3` for embeddings (`lib/areteos/rag/embedding_model/open_ai.ex:61`)
- `ReqLLM.generate_object/4` for structured output (`lib/areteos/rag/reranker/llm_judge.ex:154`)

### `ReqLLM.embed/3` quirk

`AGENTS.md:63`: There is **no** `embed_many/3`. Pass a binary for one or a list for batched. **Response order is guaranteed (sorted by `"index"`)**. Tests that stub batch responses **must shuffle** the response data to actually exercise the ordering sort — returning items in `index` order is a silent no-op. Documented at `docs/solutions/best-practices/reqllm-embedding-api-1.10.md`.

A residual doc bug: `lib/areteos/types/pgvector.ex:10` still references `ReqLLM.embed_many/3` in a moduledoc — the function doesn't exist. Probably worth a one-line fix; not load-bearing.

### `ReqLLM.generate_object/4` schema shape

`AGENTS.md:64`: nested object types in a list require `{:list, {:map, [field: [type: :integer, required: true], ...]}}`. NOT `{:list, %{field: :type}}`. The inner `{:map, keyword_list}` two-tuple is required; each field is its own `[type: _, required: _]` keyword list. This is non-obvious and wrong-shape errors at runtime. `docs/solutions/best-practices/reqllm-generate-object-schema-shape.md`.

### Model aliases via `Jido.AI`

Configured at `config/config.exs:17-20`:
```elixir
config :jido_ai, :model_aliases,
  fast: "anthropic:claude-haiku-4-5-20251001",
  capable: "anthropic:claude-sonnet-4-20250514",
  thinking: "anthropic:claude-sonnet-4-20250514"
```

Resolution: `Jido.AI.resolve_model(:fast | :capable | :thinking)` returns the underlying provider:model string. Convention: agents store a model alias atom in their config; `AgentLoopConfig.resolve_model/1` (`lib/areteos/runs/agent_loop_config.ex:62-89`) detects alias-vs-fully-qualified by absence of `:` and dispatches accordingly. Default when the agent has no model set: `:capable`.

### `AgentLoop` + `AgentStepExecutor` flow

There is **one bounded loop**, and it's not Jido's. `AGENTS.md:59`: "do not add alternate loop modes to step config."

`Areteos.Runs.AgentLoop` (`lib/areteos/runs/agent_loop.ex`):
- Pure ReAct loop: take a `ReqLLM.Response`, get `tool_calls/1`, if none → terminate `:final_answer`; if `iteration >= max_iterations` → `:max_iterations` error with pending tool calls; otherwise execute tools, append `tool_result_message` to context, recurse with the next LLM call (lines 70-125).
- Suspension via `Process.delete(:hitl_suspension)` — the `request_human_input` tool sets the key in the process dictionary, the loop reads-and-deletes, returns `{:suspended, request_id, context, iteration, trace}` (lines 109-113). Implementation choice: process dict is per-Oban-worker so leakage across runs is a real risk — `agent_step_executor.ex:112` defensively `Process.delete`s on entry.
- Telemetry: every turn records via `Areteos.Runs.EventRecorder` and an OpenTelemetry span `areteos.agent.tool_loop.iteration` (line 95).

`Areteos.Runs.StepExecutors.AgentStepExecutor` (`lib/areteos/runs/step_executors/agent_step_executor.ex`):
- Implements `Areteos.Runs.StepExecutor` behaviour (line 84).
- Pre-FLAME: load AgentVersion, render prompt, resolve libraries / MCP / Ash tools, optionally inject HITL + retrieval + filesystem tools, build system message.
- Inside FLAME: the `AgentLoop` recursion + tool execution.
- Post-FLAME: telemetry write, output transform.
- **Timeout layering** (lines 43-50): `Task.async_stream` 10min > FLAME 9min > LLM 5min > MCP tool call 30s. FLAME is intentionally less than the task supervisor so it returns clean `{:error, _}` rather than being killed.
- Defaults: `@default_model "anthropic:claude-sonnet-4-20250514"`, `@flame_timeout 540_000`. Default `max_turns` (when AgentVersion doesn't specify): `10` (`agent_loop_config.ex:21`).

### Streaming through the tool loop

Two concrete tool-loop drivers exist in the codebase:
- `lib/areteos/workflows/chat_message/changes/respond.ex:163-228` — chat-style. Uses `ReqLLM.stream_text` + `ReqLLM.StreamResponse.process_stream` + `ReqLLM.Context.execute_and_append_tools`. Stream callback writes deltas via the `:upsert_response` Ash action which broadcasts via PubSub.
- `Areteos.Runs.AgentLoop` — non-streaming, used by `AgentStepExecutor`.

`AGENTS.md:61`: "The stream must thread through the tool loop for multi-turn conversations." `respond.ex` is the canonical example of the threading pattern.

### Mutable tool state — `Agent.start_link` + `try/after Agent.stop`

`respond.ex:111-149`: when tools need shared mutable state (DAG mutation), spin up a transient `Agent` and pass the pid into each tool's closure. `Agent.stop` in the `after` clause is critical — orphaned Agents on a long-lived runner (FLAME) leak memory. The `agent_step_executor.ex:71-75` moduledoc flags this as a "must verify before remote FLAME backends" item.

## Anubis MCP — the fork

`mix.exs:95`: `{:anubis_mcp, github: "aretecp/anubis-mcp", branch: "main"}`. Upstream is `cloud-architects/anubis-mcp` (itself a fork of `hermes_mcp`).

**Why forked**: From `docs/brainstorms/2026-04-30-credential-vault-boundary-requirements.md:521-524` and `docs/features/2026-04-30-001-feat-credential-vault-resolver-boundary-plan/PLAN.md:167,196`:

- Current `streamable_http.ex` bakes auth headers in at `init/1`. Credential rotation requires a transport restart (reconnect blip). Future upstream PR `set_headers/2` to `aretecp/anubis-mcp` could make HTTP rotation seamless without restart, but it's not on v1 critical path. The project owns the fork to keep that option open without waiting on upstream.
- License practicality: upstream is LGPL-3.0; owning the fork sidesteps any "what if license changes mid-project" risk. (Rationale partially in `docs/brainstorms/2026-02-17-mcp-client-agentic-workflows-brainstorm.md:175`.)

**Usage shape**:
- Client side (`lib/areteos/mcp/client_manager.ex`): `Anubis.Client.Base.list_tools/1`, `Anubis.Client.Base.call_tool/4`, `Anubis.Client.Base.ping/2`. Connections live in a per-credential GenServer, named via a `Registry`.
- Server side (`lib/areteos/mcp/server/server.ex`): `use Anubis.Server, name: "areteos", version: "1.0.0", capabilities: [:tools, :resources]` with a flat list of `component(...)` declarations. `transport: {:streamable_http, start: false}` so Phoenix routes via `Anubis.Server.Transport.StreamableHTTP.Plug` (mounted in `router.ex:193`).
- Authenticated user passes from `conn.assigns.current_user` to `frame.assigns.current_user` automatically through Anubis's transport (`server.ex:18-20`).

**MCP credentials** (`AGENTS.md:101`): `McpServerCredential` lives in `Integrations`, not `Vault` — joins live with the consumer domain. Cross-domain `has_many` requires explicit `domain:` option for policy authorization to compose across the boundary.

## RAG / pgvector / text_chunker

Architectural primitives, all behaviour-based with `config :areteos, :rag, ...` swap points. From `AGENTS.md:121-133` and `lib/areteos/rag/`:

- `Areteos.Rag.Extractor` — document → markdown. Default `Areteos.Rag.Extractor.Markitdown` runs `markitdown` under the Python sidecar. Swap via `config :areteos, :rag, extractor:`.
- `Areteos.Rag.EmbeddingModel` — batched text embedding. Default `OpenAI` impl wraps `ReqLLM.embed/3` with classified errors (`{:rate_limited, _}`, `{:provider_error, _}`, `{:timeout, _}`, `{:embedding_failed, _}`). One HTTP call per N texts; **retries are the worker's job**, not the model module's.
- `Areteos.Rag.Reranker` — candidate reordering. Default `LlmJudge` calls `:fast` alias via `generate_object/4`; on schema violation or timeout falls back to `Noop` and flags `:noop_fallback` so callers can surface degraded ranking.
- `Areteos.Rag.Retrieval` — hybrid dense + keyword + RRF fusion. **Calls MUST pass `actor:`** — that's the cross-tenant scoping mechanism. Internally uses ordered `Task.async_stream` with `:kill_task` timeout recovery.
- `Areteos.Rag.PromptSafety` — entity-escape `&` → `<` → `>` → `"` (order matters). Wrap any chunk in `<untrusted_library_content source="...">...</untrusted_library_content>` before splicing into a prompt. Defends against prompt injection via closing tags.
- `Areteos.Libraries.LibraryRetrievalAudit` — append-only (no `:update`/`:destroy`). Self-contained JSON snapshot survives chunk deletion. Retention bounded by `audit_retention_days` (default 90).
- `Areteos.Runs.Tools.LibraryRetrieve` — the canonical tool implementation. Injected per-step ONLY when the run has libraries attached.

**Cross-tenant ANN test as gate**: `test/areteos/libraries/cross_tenant_ann_isolation_test.exs` is treated as a stop-the-world signal — if it fails, downstream RAG work halts immediately (`AGENTS.md:110`).

**UTF-8 byte-cap pattern**: `lib/areteos/runs/tools/library_retrieve.ex:410-428` shows the valid-walkback for truncating to a byte cap without tearing multi-byte characters. `binary_part(query, 0, 1024)` is wrong — Postgres `text` rejects invalid UTF-8 with SQLSTATE 22021. Don't try/rescue around the INSERT either; sanitize first.

## Test seam pattern

Project-wide convention worth noting (`AGENTS.md:116`): tests inject stubs via `Application.put_env(:areteos, <seam_key>, fun)` + `on_exit/1`. Production code calls `Application.get_env(:areteos, <seam_key>)` and falls through to the real impl when nil — zero prod cost. Current seams: `:rag_markitdown_runner`, `[:rag, :dense_search_override]`, `[:rag, :keyword_search_override]`, `:rag_reranker_llm_client`, `:chat_llm_caller`, `:chat_model`. This is the project's preferred alternative to Mox for boundary mocking.

## What contradicts upstream defaults / things to flag

- **Phoenix 1.8 `<.flash_group>` is forbidden outside `layouts.ex`** (`AGENTS.md:18`). Stock `phx.new` examples sometimes show otherwise; this rule is enforced by `mix check_patterns` in precommit.
- **Phoenix 1.8 `<Layouts.app flash={@flash} ...>`** is required at the start of every LiveView template (`AGENTS.md:13`).
- **Tailwind 4 import syntax** (`AGENTS.md:30-44`): no `tailwind.config.js`, `@import "tailwindcss" source(none)` plus `@source` directives in `app.css`. No `@apply`. No vendor `<script>` tags or external `src=` in layouts.
- **`mix test` (full suite) is discouraged** before `mix precommit` — precommit already runs the suite. (`AGENTS.md:6`)
- **Pre-commit hook lives at `.beads/hooks/pre-commit`** with `core.hooksPath` pointing there. `--no-verify` is forbidden. (`AGENTS.md:7`)
- **No plan/unit/issue IDs in source comments, docstrings, test names, error messages, or operator-facing docs** (`AGENTS.md:9`). Big one — easy to violate when the work itself is plan-driven.

## Patterns that look fragile / undocumented

- **Process dictionary for HITL suspension** (`agent_loop.ex:109-113`, `agent_step_executor.ex:107-112`). Comments acknowledge the cross-run leak risk explicitly; the defensive `Process.delete/1` on entry is the only barrier. If a future tool sets a different process-dict key, the same pattern would need rediscovering. Probably worth a dedicated abstraction long-term.
- **`AshToolResolver` default-domain allowlist hardcoded** to `[Areteos.Workflows, Areteos.Runs, Areteos.Projects]` (line 12). New AshJido-backed domains silently won't expose tools to agents until added. No compile-time check.
- **`AgentLoopConfig.is_model_alias?/1` heuristic** (`agent_loop_config.ex:85-89`): "alias if no `:` in the string". Plausible today but means alias names with colons would silently be treated as raw model strings. Currently fine; brittle if model strings ever change shape.
- **`anubis_mcp` fork**: branch `main` with no version tag. `mix.lock` resolution depends on whatever's at HEAD. A bad upstream rebase or accidental force-push would break the build with no rollback. Worth a SHA pin or at least a tag.
- **`reqllm-1.10` type lag**: `Areteos.Types.Pgvector` moduledoc still mentions `ReqLLM.embed_many/3`, which doesn't exist in 1.10. Cosmetic but symptomatic.

## Recommendation

The patterns split cleanly into three buckets:

### Stable enough for a global skill — promote
1. **`ash-resource-conventions.md`**: the six-line resource header, dot-access rule, `action_type` policies, `cascade_destroy` pattern, identity↔index naming contract, `require_atomic? false` for non-atomic state changes, custom `SimpleCheck` for `:create` policies. Generic across any Ash 3.0 + AshPostgres project, not just `areteos`.
2. **`jido-reqllm-tools.md`**: 1-arity `ReqLLM.Tool` callback shape, 0-arity context-reader closure pattern for per-invocation context, `AshJido` → `ReqLLM.Tool` 2-to-1 wrapping, model-alias resolution via `Jido.AI`. The hardest patterns to discover from upstream docs alone — biggest win.
3. **`ash-oban-triggers.md`**: cron-poll vs `run_oban_trigger` patterns, `worker_module_name` / `scheduler_module_name` discipline, `{:cancel, _}` vs `{:error, _}` vs `{:snooze, _}` return-value semantics, session advisory lock + `Repo.checkout` requirement, DB-first/broadcast-second invariant.
4. **`reqllm-call-shapes.md`**: small focused skill — `generate_text` / `stream_text` / `embed` / `generate_object` signatures, the no-`embed_many` and ordered-response gotchas, the `generate_object` schema-shape gotcha. Skinny but high-value because the upstream docs are scattered.

### Project-specific — keep in `areteos` only
- The `Areteos.Types.Pgvector` custom type and the policy-before-ANN security invariant. Both are ground-truth `areteos` code, not patterns Claude should apply blind to a different project.
- The Anubis fork rationale and rotation-as-restart contract. Vault-specific.
- The RAG primitives (`Extractor`/`EmbeddingModel`/`Reranker`/`Retrieval`/`PromptSafety`) — these are an architecture, not a pattern.

### In flux — wait
- HITL suspension via process dictionary. The team flagged it in moduledocs as something to watch; if it gets refactored, a skill written today would be wrong tomorrow.
- FLAME remote backend — currently `LocalBackend`. The streaming-callback / MCP-tool-callback / env-var concerns in `agent_step_executor.ex:53-79` are explicit "must verify before enabling remote" items.
- The `AshJsonApi` route ordering convention (catch-all forward + comment warning, `router.ex:203`). One-line gotcha; could fold into the `ash-resource-conventions` skill or live as a comment.

Recommendation in one line: **start with `jido-reqllm-tools.md` and `ash-oban-triggers.md` first** — they're the patterns the global skills can't infer from `elixir.md` + `phoenix.md` alone, and they're the patterns most likely to bite Claude when working on Areteos features outside the project's local skill bundles' visibility.

## Key Links / References

Inside `areteos`:
- `/Users/dom/dev/arete/areteos/AGENTS.md` — canonical rules (auto-built by `usage_rules`)
- `/Users/dom/dev/arete/areteos/.claude/skills/ash-framework/references/*.md` — upstream usage rules per Ash extension (1337 lines for `ash.md` alone)
- `/Users/dom/dev/arete/areteos/lib/areteos/runs/agent_loop.ex` — the agent loop
- `/Users/dom/dev/arete/areteos/lib/areteos/runs/agent_loop_config.ex` — config + model-alias resolution
- `/Users/dom/dev/arete/areteos/lib/areteos/runs/step_executors/agent_step_executor.ex` — FLAME-wrapped step driver
- `/Users/dom/dev/arete/areteos/lib/areteos/runs/tools/library_retrieve.ex` — canonical 1-arity tool with 0-arity context reader
- `/Users/dom/dev/arete/areteos/lib/areteos/runs/ash_tool_resolver.ex` — AshJido → ReqLLM bridge
- `/Users/dom/dev/arete/areteos/lib/areteos/workflows/chat_message/changes/respond.ex` — streaming + tool loop with `Agent.start_link`
- `/Users/dom/dev/arete/areteos/lib/areteos/libraries/library_entry_chunk.ex` — pgvector + hybrid search + policy-before-ANN
- `/Users/dom/dev/arete/areteos/lib/areteos/types/pgvector.ex` — custom Ash type for pgvector
- `/Users/dom/dev/arete/areteos/lib/areteos/runs/run.ex` — cron-trigger AshOban example
- `/Users/dom/dev/arete/areteos/lib/areteos/workflows/chat_message.ex` — `run_oban_trigger` action-fired example
- `/Users/dom/dev/arete/areteos/lib/areteos/accounts/user.ex` — `AshAuthentication` strategies
- `/Users/dom/dev/arete/areteos/lib/areteos/mcp/server/server.ex` — Anubis server-side
- `/Users/dom/dev/arete/areteos/config/config.exs:17-20` — model-alias map
- `/Users/dom/dev/arete/areteos/docs/brainstorms/2026-03-10-jido-integration-brainstorm.md` — the "remove LangChain, add jido + req_llm + ash_jido" decision
- `/Users/dom/dev/arete/areteos/docs/solutions/best-practices/` — 30+ project-specific solution notes (most cited above)

## Open Questions

- [ ] Does `ash_jido` v1 stay on a git branch or is there a hex release on the horizon? Skill stability depends on whether the 2-arity-callback contract is locked in.
- [ ] Is the planned upstream `set_headers/2` for `aretecp/anubis-mcp` ever going to happen, or is restart-on-rotate the permanent shape? Affects whether the Anubis rationale is worth a skill at all.
- [ ] Will `AgentLoop` ever support streaming, or will streaming stay in `respond.ex`-style ad-hoc loops? Two loops is a smell; if they unify, the skill should describe the unified shape rather than today's split.
- [ ] Is the `Process.delete(:hitl_suspension)` defensive pattern going to survive, or is there a refactor planned to use a real continuation type? Don't promote a skill that documents the process-dict path if it's about to change.
- [ ] How long until `mix usage_rules` evolves to support custom skill bundles per-domain? If it does, the local `.claude/skills/ash-framework/references/*` could be promoted to global with one symlink rather than hand-written skills.
