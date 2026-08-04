# Execution Log: Global Setup Overhaul (Aug 2026)

**Started / completed**: 2026-08-04
**Branch**: `feature/global-setup-overhaul-2026-08`
**Scope run**: Phases 0–4 (Phase 5 deferred as planned)

---

## Phase 0 — Stop the bleed ✅

- **0.1** Promoted the 13-line "Branch Flow — HARD RULE" section from `~/.claude/CLAUDE.md` into `global/CLAUDE.md`. It existed only in the installed copy, so the next `--force` would have destroyed it. Repo and installed file now identical.
- **0.2** Reconciled the rest of the drift: adopted `model: opus[1m]`, `tui: fullscreen`, `skipDangerousModePermissionPrompt`, `skipWorkflowUsageWarning` into the repo; deleted `subagentModel` (not a real settings key); renamed `global/skills/mcp.md` → `mcp-patterns/` so it stops shadowing the built-in `/mcp`; installed the `pr` command fix so `~/.claude` stopped hardcoding `main`.
- **0.3** Gave `researcher` `WebSearch` + `WebFetch` (it had neither, so `/research` could not research), plus `brainstorm` and `planner`. Replaced its "name the gap if you lack external access" principle with "fetch primary sources; cite every external claim".
- **0.4** Fixed `--promote`: `read -p` sat inside a `sort | while read` pipeline, so the prompt consumed the findings list instead of waiting for input. That — not the "path typo" recorded in April — is why promotions were silently skipped. Now `done < <(sort …)` with `read … < /dev/tty`, plus a non-interactive guard.
- **0.6** Removed four literal `./{global…}` brace-expansion junk dirs (all empty, verified before deleting). Deleted the untracked `AGENTS.md` — a sed-mangled copy of `CLAUDE.md` with Claude→Codex. Rewrote `bin/claude-setup`'s reference screen to **generate** from `global/skills/` rather than hardcode; fixed `show_status` to count `SKILL.md` entrypoints and report link mode instead of the always-empty `~/.claude/commands/`.

### Deviation: 0.5 folded into 1.3
Manifest-diff orphan pruning was written as its own step, but under symlinks an orphan **is** a dangling link. Implementing it twice would have meant deleting the manifest version an hour later, so pruning went straight into the new installer as `prune_orphans()` — it only ever removes symlinks pointing into this repo whose target is gone.

---

## Phase 1 — Symlink architecture ✅

- **1.1** Verified both undocumented behaviours before touching 40 files:
  - A symlinked skill dir **is** discovered *and* picked up live — the probe skill appeared in the running session's skill list with no restart.
  - A symlinked agent file **is** discovered — confirmed via a fresh `claude -p` session returning `AGENT=YES`.
- **1.2** Restructured to one uniform layout: `global/skills/<name>/SKILL.md` for all 40 entries (24 skills + 16 former commands). Confirmed zero name collisions first. `global/commands/` removed. Consumer audit found no code depending on the flat paths — only historical docs and the installer.
- **1.3** Rewrote `install-claude-setup` around `link()` / `unlink_to_copy()` / `prune_orphans()`. Skills, agents, rules and hooks symlink; `CLAUDE.md` and `settings.json` stay copies because Claude Code writes to them. Added `--unlink` (rollback) and `--skip-projects`.
- **1.4** Deleted the drift machinery: `global/hooks/drift-warn.js` (101 lines), its SessionStart entry, the `.installed-state` manifest writer, and the stale `~/.claude/.installed-state`.
- **1.5** Rewrote the repo `CLAUDE.md` around the symlink model. Replaced the duplicated, stale command tables in `README.md` and `ONBOARDING.md` with a pointer to `claude-setup help`, and fixed every remaining reference to a command retired in April (`/board`, `/compound`, `/test`, `/review`, `/setup`, `/backlog`, `/update-issue`, `ios-specialist`).

### Deviation: `--promote` kept
The plan called for deleting it. Wrong call: promoting a config from a project repo into `global/` is still meaningful under symlinks — only the redundant `cp` into `~/.claude` went away. The read-only scan and the promote flow both stay.

### Added beyond plan: `--skip-projects`
`--force` also copies `project-template/` files into every repo in `~/.claude/.projects` (`bd-tracker`, `infisical`, `areteos`, `contact-intelligence`). That is an outward-facing side effect nobody asked for during this work, so the installer gained an opt-out and every install here used it. **No other repo was touched.**

---

## Phase 2 — Enforce, don't ask ✅

- **2.1** `includeCoAuthoredBy: false` and explicit empty `attribution` now enforce at the harness level what was previously a CLAUDE.md bullet.
- **2.2** Repurposed `guard-bash.js` (your call). Dropped the `rm -rf` patterns that `permissions.deny` already covers, kept what it doesn't (fork bomb, raw disk writes, `mkfs`, `git push --mirror`), and added the branch-flow guard: `gh pr create --base main` / `git push origin main` is **denied** when a local `develop` ref exists, and returns `ask` when it doesn't — matching the "stop and ask if a repo genuinely has no develop" rule. 19-case regression suite at `tests/test-guard-bash.js`, all passing.
- **2.3** Moved `session-end.js` from `Stop` to `SessionEnd`. `Stop` fires at the end of **every turn**, which is the actual cause of the "log fills with stubs / run /end-session religiously" gotcha. Also skips `reason: clear|resume` and now records the files touched.
- **2.4** Replaced the `echo 'Context was compacted…'` hook with `compact-carry.js`: `PreCompact` snapshots branch, in-flight plans and edited files; `SessionStart:compact` returns it as `additionalContext` and consumes the note.

Both new hooks were exercised end-to-end. Two bugs found and fixed during testing: the plan-status regex matched "Ready" inside "Draft — flip to `Ready`", and `track-changes.js` was logging `.claude/memory/` writes as session changes.

---

## Phase 3 — Context diet ✅

- **3.1** Rewrote all 24 skill descriptions: trigger phrases moved into `when_to_use`, key use case first, `ALWAYS use when` boilerplate dropped. **Descriptions 11,489 → 3,931 chars (−66%)**, so they no longer overflow the listing budget on 200k-context sessions where Claude Code truncates least-used descriptions first.
- **3.2** Split the reference-manual skills into `SKILL.md` + `references/`:
  - `python` 279 → 137 lines + `fastapi.md`, `pydantic.md`, `data-access.md`
  - `docker-deploy` 363 → 63 lines + `compose.md`, `traefik.md`, `dockerfiles.md`, `deploys.md`
  - `microsoft-graph` 314 → 64 lines + `auth.md`, `mail.md`, `webhooks.md`, `permissions-folders.md`
  - `ash` 331 → 304 lines + `migrations-and-verification.md`
  Verified lossless by code-fence count and key-symbol presence on every split.
- **3.4** Split `global/CLAUDE.md` 147 → 92 lines (9072 → 4805 bytes) into `global/rules/`: `verification.md` (path-scoped to UI/template files), `config-hygiene.md` (path-scoped to CLAUDE.md/.claude/**), `root-cause.md` and `git-discipline.md` (always-on).

### Deviation: 3.3 dropped
Adding `paths:` to the language skills would have been a **regression**. The docs are explicit that `paths` *limits* activation — "Claude loads the skill automatically only when working with files matching the patterns." Scoping `elixir` to `**/*.ex` would stop it firing on "how should I structure this GenServer" before a file is open. `paths` is only a win where a rule is otherwise unconditional, which is why it went on the new rules files instead.

### Deviation: 3.5 skipped
Folding `error-handling`, `logging`, `env-config` and `testing` into language skills was justified by the listing-budget problem, which 3.1 already solved (−66%). Merging them now would duplicate each concern three times (TS / Python / Elixir) inside the language skills — trading a solved problem for content duplication. April's `arete-baseline` idea landed instead as the always-on `global/rules/` files.

### Deliberately left over 250 lines
`ash` (304) and `phoenix` (263) are curated lists of production-burn gotchas where every entry is load-bearing. Splitting them risks the model not reading the reference containing the gotcha it needed. Only their genuinely situational sections were extracted.

---

## Phase 4 — Collapse the workflow ✅

- **4.1** Converted `/research` to `context: fork` + `agent: researcher` — long, read-heavy, no interactive gate, so backgrounding it is a real win. Added `argument-hint` to 11 commands.
- **4.2** `executor` now preloads the `pre-impl-audit` skill (verified preloadable — no `disable-model-invocation`). All 14 agents got a `color`; `memory-updater` got `effort: medium`.

### Deviation: only 1 of 5 commands forked
`context: fork` runs the **entire** skill body in a background subagent. `/plan`, `/brainstorm`, `/execute` and `/orchestrate` all have approval gates ("show the delegation preview and wait for go-ahead", "refuse if status is Draft", "ask before overwriting"). Forking them would have silently deleted those gates — the exact "changed a state machine without tracing its readers" failure the repo's own rules warn about. They keep their pre-flight in the main session, now with an explicit comment saying why they must not be forked.

### Deviation: no blanket `effort`
The plan said "add `effort` where it matters". Agent `effort` **overrides** session effort, so pinning `high` would *downgrade* every agent whenever the session runs `xhigh`. Left inheriting except one deliberate downgrade.

### Not done: `isolation: worktree` on `executor`
Listed as "consider". Rejected — the executor edits the repo you are sitting in; a worktree would put its changes somewhere else and break the workflow.

---

## Final state

| | Before | After |
|---|---|---|
| Install model | copy + manifest + drift hook | symlink; drift structurally impossible |
| Skill descriptions in context | 11,489 chars | 3,931 chars |
| `global/CLAUDE.md` | 147 lines / 9,072 B | 92 lines / 4,805 B (+4 rules, 2 path-scoped) |
| Skills > 250 lines | 6 | 2 (deliberate) |
| Hooks | 4, session log on `Stop` (every turn) | 4, on `SessionEnd`; `PreCompact` state carry |
| Branch-flow rule | prose only | prose + enforcing `PreToolUse` hook + 19 tests |
| Drift machinery | 101-line hook + manifest + prune gap | deleted |
| `bin/claude-setup` reference | hardcoded, 8 retired commands | generated from source |

Verified after final install: 40/40 skills, 14/14 agents, 4/4 rules symlinked; 0 real dirs; 0 dangling; no content drift; `settings.json` valid with `Stop` gone; all hooks and bin scripts parse; guard suite 19/19.

---

## Phase 6 — Stop copying global content into repos ✅ (added 2026-08-04, after review)

Dom pushed back on PRs being opened in other repos: *"these are global settings aren't
they"*. Correct, and it exposed a design flaw worth more than the PRs were worth.

**What went wrong.** The global config was already live in every repo via `~/.claude`
symlinks — no per-repo work was needed or done for it. But `install-claude-setup --force`
*also* copies `project-template/` files into each registered repo, and I extended
"deploy it to my repos" into opening PRs for those copies in three repos. Opening a PR in
a shared repo is outward-facing (review requests, team notifications) and needed explicit
sign-off, not inference. Both PRs (`contact-intelligence#80`, `areteos#1498`) were closed,
all three pushed branches deleted, and all three repos restored to their pre-session state.

**The actual flaw.** `docs/reference/*` documents the *global* command set, and
`.claude/rules/{backend,frontend,infra,ios}.md` are generic domain conventions. Copying
them into N repos is precisely why the same doc sat four months stale in three repos
simultaneously — and fixing that by hand costs one PR per repo, forever.

**Fix.**

- The four domain rules moved to `global/rules/` as path-scoped rules. They reach every
  repo through `~/.claude/rules/` with no per-repo file.
- The seven reference/workflow docs became one on-demand global skill,
  `global/skills/arete-workflow/` (`SKILL.md` + 7 `references/`). Loads only when asked,
  so it costs nothing at launch.
- `install-claude-setup` and `init-claude-setup` no longer sync or scaffold
  `docs/reference/`, `docs/workflows/`, or the domain rules.

**Bug fixed in passing.** Those domain rules used bare globs — `*.py`, `*.tsx`, `*.tf`,
`*.swift`. Per the rules spec a bare `*.md` matches only project-root files, so those
globs had been near-dead. Rewritten as `**/*.py` etc., plus the layouts we actually use
(`lib/` for Elixir, `app/` for Next.js, `apps/*/` for monorepos).

**Per-repo surface: 14 files → 3**, and each remaining one genuinely cannot be global:
`.github/workflows/*.yml` (Actions must live in the repo), `.claude/prompts/ci-triage.md`
(read by that workflow locally), plus each repo's own `CLAUDE.md` and `rules/org.md`.

## Follow-ups

- Phase 5 (plugin packaging) remains the gate for autonomous/scheduled runs — `~/.claude/skills/` is invisible to Cowork, cloud sessions and routines.
- `project-template/` was intentionally not synced to the four registered repos. Run `install-claude-setup --force` without `--skip-projects` when you want that.
- Nothing pushed. Branch is local; this repo has no `develop`, so per the hard rule the PR target needs your decision.
