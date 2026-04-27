# Brainstorm: Setup Modernization 2026

**Date**: 2026-04-26
**Topic**: Audit Dom's claude-setup repo against April 2026 best practices and recommend what to split, combine, retire, or restructure.

---

## Phase 1 — Explore (no filtering)

Raw observations and angles after sampling 22 commands, 14 agents, ~6 skills, settings.json, and both CLAUDE.md files.

### Redundancy / overlap I noticed
- `/brainstorm`, `/plan`, `/research`, `/execute`, `/orchestrate`, `/compound` are all 9-17 line "wrapper" commands that do nothing but invoke the agent of the same name. Six commands that exist to call six agents.
- `/end-session` is a thin wrapper for `memory-updater`. `/compound` is a thin wrapper for `compounder`. `/brainstorm` for `brainstorm` agent. These are 1:1 mappings — the wrapper adds no logic, just a slash entry point.
- `/fix` and the "small scope" branch of `/work-issue` (step 7) do nearly identical work: detect framework, run tests, fix, lint. `/work-issue` reimplements `/fix` inline instead of delegating.
- `/test` and step 5 of `/fix` overlap: detect test framework, run, diagnose. `/test` is `/fix` minus the implementation.
- `/review` and the `code-reviewer` agent overlap heavily — `/review` is the imperative version, `code-reviewer` is the agent version. Nothing in the repo distinguishes when to use which.
- `/commit` vs `/pr` vs the commit/push steps in `/work-issue` — three places where commit logic is described.
- `/board` and `/status` both produce dashboards (board = GitHub project, status = local feature plans). Could be one `/status` with subcommands.
- `/setup` and `/audit-config` are siblings — first-time vs recurring health check.
- `/backlog` and `/bug` both create issues. Different templates but same core flow.
- `/update-issue` overlaps with the issue-update steps inside `/work-issue` (step 10).
- `/sync-memory` is a backstop for skipped `/end-session` — useful but only because the Stop hook stub produces noise.
- `/catchup` is short (25 lines) and useful, but it's the third place that reads session-log + CLAUDE.md (others: `/sync-memory`, `/audit-config`).

### Bloat
- `work-issue.md` is 234 lines and embeds: issue fetching, branch creation, work-plan posting, project board manipulation, deep analysis, domain classification, dispatch logic, work execution, commit, completion comment, board move, wrap-up. It's basically a workflow orchestrator masquerading as a command.
- Specialist agents (frontend/backend/infra/ios) all share the same skeleton: "On Activation → Workflow → Quality Gate → Handoff." Frontend/backend/infra are 70-80 lines each with similar structure but different content. Could collapse to one parametrized specialist that loads a different standards skill.
- iOS specialist only has one skill (`ios-standards`) — the agent is mostly there to load that skill. Marginal value over just loading the skill directly.

### Skills observations
- 21 skills in repo, 43 installed. So 22 skills exist locally that have never been promoted back. That's the bigger problem than the 21 — they're invisible to anyone else.
- `python.md` is 280 lines — it covers project setup, types, async, error handling, CLI, FastAPI, pydantic v2, sqlite, httpx, testing. That's six skills crammed into one. Best practice says skills ≤2k tokens (~250-400 lines but tight).
- `backend-standards`, `frontend-standards`, `infra-standards`, `ios-standards` all exist. The "*-standards" pattern is clean, but each one duplicates "Read project CLAUDE.md, identify stack, secrets via Infisical" type instructions that could live in one shared "areté-baseline" skill.
- Language skills (python, elixir, phoenix, nodejs) overlap with framework skills (api-route, ts-component, database). Some are pure how-to (python.md as tutorial), others are pattern docs (error-handling.md). No consistent rubric for what belongs in a skill.
- `microsoft-graph`, `infisical`, `mcp`, `anthropic-api`, `terraform` are integration skills — clearly justified.
- `logging`, `testing`, `env-config`, `error-handling` are cross-cutting — could be merged or trimmed.
- `database` is generic, `phoenix` is framework-specific — overlap with `backend-standards`.

### Workflow stages
- The stated single-feature pipeline is `/research` (optional) → `/brainstorm` → `/plan` → `/execute` → `/end-session`. Five stages.
- Real talk: Dom probably uses `/work-issue` or `/fix` for most actual work. Brainstorm/plan/execute is the "ideal" path but slower for routine tickets.
- The epic flow adds `/orchestrate` between plan and execute — six stages. Likely rare.
- Each stage produces a doc: RESEARCH.md, BRAINSTORM.md, PLAN.md, EXECUTION_LOG.md. That's good for traceability but heavy if a feature is 2 hours of work.
- `/end-session` requires manual invocation; the Stop hook writes a stub if it's skipped. Friction here.

### Plugin angle (April 2026 best practice)
- v2 plugins package commands+agents+skills+hooks+MCP into a folder with a manifest. Marketplace-style distribution.
- The repo's `global/` folder is essentially "Dom's personal plugin" — it just installs by copy instead of via the plugin runtime.
- Natural plugin bundles in this repo:
  - **`arete-stack`** — backend-standards, frontend-standards, python, elixir, phoenix, nodejs, ts-component, api-route, database, error-handling, testing, logging
  - **`arete-infra`** — infra-standards, terraform, docker-deploy, infisical, env-config
  - **`arete-integrations`** — anthropic-api, mcp, microsoft-graph
  - **`arete-ios`** — ios-standards
  - **`arete-workflow`** — commands + agents (brainstorm, plan, execute, work-issue, fix, etc.) + hooks
- Splitting into plugins enables: install per-project (don't load iOS skills on a backend repo), share with teammates, version each bundle, and dodge the auto-delegation flood when 14 agents are visible.

### Hooks
- Four hooks, all sensible. `session-end.js` writes stubs only when `dirty-files` has content — good. `track-changes.js` populates dirty-files. `guard-bash.js` is the deny-rule companion.
- Could add a PostToolUse formatter hook (auto-run `ruff format` / `prettier` after Edit). Currently `/review` and `/fix` run lint manually.
- Could add a SessionStart hook that warns if `~/.claude/skills` count differs from `global/skills` count (drift detection in real time, not just via `update-claude-setup`).

### Other angles worth flagging
- `set-org` is a specialized init helper. Useful but only runs once per project. Could fold into `init-claude-setup` instead of being a slash command.
- `meta-agent` is the agent-that-builds-agents. Dom mostly hand-edits agents. Has it actually been used?
- `compounder` + `/compound` exist but `docs/solutions/` is the destination — does Dom actually maintain that directory, or is it aspirational?
- The 22-vs-43 skill drift implies Dom has been creating skills locally and not promoting them. The repo isn't being kept in sync with reality.
- The global CLAUDE.md is 95 lines — fine, well under the 200 limit it preaches.
- Workflow rules like "Never execute a plan with status `Draft`" are restated in three places (CLAUDE.md, executor agent, plan command). Source of truth ambiguity.

### Premise to challenge
- The current setup is built around a 5-stage feature pipeline. Most real work goes through `/work-issue` or `/fix`. The 5-stage pipeline is the exception, not the rule. Designing the system around the rare path costs ergonomics on the common path.
- "More agents = more capability" — actually no, per April 2026 guidance, more agents degrade auto-dispatch quality. 14 agents is on the high side.

---

## Phase 2 — Converge

### Option 1: Light tune-up

**What**: Preserve the workflow shape. Trim obvious bloat, retire 1:1 wrappers, fix the skill drift, tighten hooks.

**How it works**: Keep the 5-stage pipeline, keep all four specialists, keep the wrapper-to-agent pattern but only where it adds context. Make targeted edits across ~15 files. Reconcile installed-vs-repo skill drift in the same pass.

**Concrete edits**:
- **Retire wrapper commands that add nothing**: `/brainstorm`, `/plan`, `/execute`, `/orchestrate`, `/compound`, `/end-session` are all 1:1 with their agents. Either (a) delete them and rely on natural-language invocation ("plan the auth feature"), or (b) keep but inline 5-10 lines of pre-flight context (read RESEARCH.md if exists, list prior feature folders, etc.) so they earn their slot.
- **Merge `/test` into `/fix`** and add a `--no-impl` flag (or just rely on `/fix run tests`). Or merge `/fix` and `/test` into `/work-local` for non-issue-driven work.
- **Merge `/review` into `code-reviewer` agent invocation** — drop the slash command, document "ask Claude to review" as the entry point.
- **Merge `/board` and `/status` into one `/status`** with `--features` (local) and `--board` (remote) flags. Default shows both.
- **Merge `/backlog` and `/bug`** into `/issue` with mode flags (`/issue new`, `/issue from-plan`, `/issue bug`). Both create issues; the templates differ but the flow is the same.
- **Slim work-issue.md** from 234 lines to ~120 by extracting the deep-analysis + domain classification + specialist dispatch into a `dispatcher` agent. Command becomes thin orchestration.
- **Consolidate specialist agents** — keep frontend/backend/infra; retire `ios-specialist` (just load `ios-standards` skill directly, single-skill agents add zero value).
- **Reconcile skill drift**: run `update-claude-setup --promote` to bring 22 missing skills back into the repo. Then audit which are actually used.
- **Retire `/setup`** — it's a one-time wizard that's been replaced by `init-claude-setup` CLI. The slash command is stale.
- **Retire `meta-agent`** unless Dom is actively using it (sounds like he's not).
- **Add a PostToolUse formatter hook** — auto-`ruff format` / `prettier` after Edit on matching extensions. Removes a step from `/review`.
- **Add a SessionStart drift-warning hook** — warn if installed skill count differs from repo count. Catches drift in real time.

**Pros**:
- Low risk, preserves muscle memory
- Fixes the worst bloat (work-issue, single-skill specialist, drift)
- Keeps existing workflows working
- Can be done in a single afternoon

**Cons / Risks**:
- Doesn't fix the structural issue: 22 commands + 14 agents + 21 skills is a lot of surface for a one-person shop
- Doesn't position the repo for plugin-style distribution if Dom wants teammates to use this later
- Skill bloat (python.md = 280 lines covering 6 topics) untouched

**Effort**: Small (4-6 hours)
**Risk**: Low

**Best if**: Dom wants the current shape preserved and just needs the cruft trimmed.

---

### Option 2: Plugin-first restructure

**What**: Repackage `global/` as a set of cohesive plugins so bundles can be installed independently, shared with teammates, and versioned separately.

**How it works**: Convert `global/` into 4-5 plugin folders, each with its own manifest listing the commands/agents/skills/hooks it ships. Keep a thin `core` plugin always installed; load `arete-stack`, `arete-infra`, `arete-integrations`, `arete-ios` per-project based on what the project actually needs. Update `install-claude-setup` to support per-plugin install.

**Concrete bundles**:
- **`core`** (always): brainstorm/plan/execute agents + commands, end-session, catchup, audit-config, commit, hooks, settings.json baseline
- **`arete-workflow`**: work-issue, fix, board, status, backlog, bug, update-issue, set-org, sync-memory, pr, review, test, code-reviewer agent, debugger agent, memory-updater, compounder, meta-agent
- **`arete-stack`**: backend-standards, frontend-standards, python, elixir, phoenix, nodejs, ts-component, api-route, database, testing, error-handling, logging, env-config + frontend/backend specialist agents
- **`arete-infra`**: infra-standards, terraform, docker-deploy, infisical + infra-specialist agent
- **`arete-integrations`**: anthropic-api, mcp, microsoft-graph
- **`arete-ios`**: ios-standards + ios-specialist agent (kept as a plugin so iOS work doesn't bleed into non-iOS sessions)

**Pros**:
- Aligns with April 2026 best practice (plugins are the v2 distribution unit)
- Dramatically reduces auto-dispatch surface per project (a backend repo doesn't see iOS specialist or terraform skills)
- Enables sharing — Spencer/Justino/Sara could install just `core + arete-stack` without iOS or infra noise
- Forces a healthy audit: each plugin must justify its existence
- Natural place to version and changelog skill changes

**Cons / Risks**:
- Bigger lift — `install-claude-setup` needs plugin support
- Plugin manifest format is still settling in 2026 — manifest churn possible
- Have to draw the lines between bundles correctly first time or you'll re-shuffle
- Per-project install adds a step ("which plugins?") to `init-claude-setup`
- If Dom is the only consumer, the multi-plugin overhead might exceed the benefit

**Effort**: Large (1-2 days)
**Risk**: Medium

**Best if**: Dom plans to share this with the team or other engineers, or if multi-language project loads are getting noisy. Less compelling if it stays single-user.

---

### Option 3: Workflow consolidation

**What**: Cut command count from 22 to ~10, agent count from 14 to ~7, skill count from 21 to ~12. Collapse the 5-stage feature pipeline to 3 stages. Aggressive simplification.

**How it works**: Treat the workflow as the product. Pick the smallest set of commands and agents that covers the actual work, and delete the rest. Skills get rewritten to match the ≤2k-token best practice — split `python.md` (280 lines, 6 topics) into focused skills, and merge `*-standards` baseline content into one `arete-baseline` skill.

**Concrete consolidation**:

Commands (22 → 10):
- Keep: `/work-issue`, `/fix`, `/commit`, `/pr`, `/end-session`, `/catchup`, `/status` (merged with /board), `/issue` (merged /backlog + /bug + /update-issue), `/audit-config`, `/sync-memory`
- Retire as wrappers (just talk to Claude or invoke agent by name): `/brainstorm`, `/plan`, `/execute`, `/orchestrate`, `/compound`, `/research`, `/review`, `/test`, `/setup`, `/set-org`

Agents (14 → 7):
- Keep: `brainstorm`, `planner`, `executor`, `code-reviewer`, `debugger`, `researcher`, `memory-updater`
- Retire: `orchestrator` (fold into planner — epic vs feature is a planner mode), `frontend-specialist`/`backend-specialist`/`infra-specialist`/`ios-specialist` (replaced by one `domain-specialist` that takes a `domain:` arg and loads matching skills), `compounder` (fold into memory-updater — both write durable docs), `meta-agent` (use directly, not as agent)

Skills (21 → ~12):
- Split `python.md` into `python-core` (types/async/error), `fastapi`, `pydantic`. Drop tutorial-style sections; keep only standing-instruction content per the "skills don't get re-read" rule.
- Merge `backend-standards` + `frontend-standards` + `infra-standards` + `ios-standards` baselines into one `arete-baseline` skill (Infisical, project CLAUDE.md read, secrets handling). Domain-specific bits go into focused skills.
- Merge `error-handling` into language skills (TS-flavored stays with ts skills, Python with python).
- Merge `logging` into `arete-baseline`.
- Keep: `arete-baseline`, `python-core`, `fastapi`, `elixir`, `phoenix`, `ts-component`, `api-route`, `terraform`, `docker-deploy`, `infisical`, `anthropic-api`, `mcp`, `microsoft-graph`, `ios-standards`

Workflow (5 → 3 stages):
- New flow: `/think [topic]` (combined research + brainstorm, produces THINK.md with options) → `/plan [topic]` → `/execute [topic]` → `/end-session`
- Quick fix: `/fix` (unchanged)
- Issue-driven: `/work-issue` (unchanged but slimmer)
- Epic: `/plan --epic` (replaces `/orchestrate`) → `/execute` per sub-feature

**Pros**:
- Sharpest setup — least surface area, fastest auto-dispatch, easiest to remember
- Forces every command/agent/skill to justify its existence
- Skill bloat (python.md) finally addressed
- Aligns with the "handful of well-scoped agents" guidance for 2026
- Easier for a teammate to pick up

**Cons / Risks**:
- Highest disruption — muscle memory breaks for any retired command
- "Combined research+brainstorm" stage may not feel right; some features benefit from research as a separate doc
- Single `domain-specialist` agent loses the per-domain quality gate and handoff format that the four specialists have today
- More aggressive — if any retirement turns out to be wrong, you backfill later

**Effort**: Large (1.5-2 days, plus a week of friction adjusting muscle memory)
**Risk**: Medium-High

**Best if**: Dom is feeling friction from too many slash commands, or wants to use this as a reset to align with 2026 guidance regardless of cost.

---

## Phase 3 — Recommendation

**Recommend Option 1 — Light tune-up.**

Two reasons:
1. The biggest concrete wins are tactical, not structural — kill the 1:1 wrappers, slim work-issue, retire ios-specialist (it wraps a single skill), reconcile the 21-vs-43 skill drift, fold `/test` into `/fix`, fold `/board` into `/status`, fold `/bug` + `/backlog` + `/update-issue` into `/issue`. None of those need a plugin system.
2. Dom is the only consumer right now. Plugin restructure (Option 2) and aggressive consolidation (Option 3) both pay off mostly when the surface area is hurting auto-dispatch in real sessions or when teammates are sharing config. Neither pain has been called out explicitly.

**One caveat**: if while doing Option 1 we find that even after the tune-up the agent surface still feels noisy in normal use, that's the signal to escalate to Option 2 or 3. The tune-up is reversible and informs the bigger decision.

**Concrete order for Option 1 if pursued**:
1. Run `update-claude-setup --promote` first — get the missing 22 skills back into the repo so we know what we're actually deciding about
2. Slim work-issue.md (extract dispatcher into agent, drop inline standards loading)
3. Retire wrappers: `/brainstorm`, `/plan`, `/execute`, `/orchestrate`, `/compound`, `/end-session`, `/setup`, `/test`, `/review`. Keep functional commands (`/fix`, `/commit`, `/pr`, `/catchup`, `/audit-config`, `/sync-memory`, `/work-issue`, `/status`, `/board`, `/backlog`, `/bug`, `/update-issue`, `/set-org`).
4. Merge `/board` into `/status`, merge `/bug` + `/backlog` + `/update-issue` into `/issue`, retire `ios-specialist` agent
5. Add PostToolUse formatter hook + SessionStart drift-warning hook
6. Update CLAUDE.md to reflect new command list

Net result: 22 → ~12 commands, 14 → 13 agents, 21 → 21 skills (but reconciled with the installed 43, so the real number is whatever's actually used). Hooks +2.
