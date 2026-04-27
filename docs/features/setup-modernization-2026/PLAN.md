# Plan: Setup Modernization 2026

**Status**: In Progress (Phase 1 done 2026-04-26; Phase 2 pending)
**Created**: 2026-04-26
**Last updated**: 2026-04-26

## Summary
Modernize the `claude-setup` repo against April 2026 best practices. Phase 1 is tactical: drift fix, retire 1:1 wrappers, slim `work-issue.md`, merge overlapping commands, retire `ios-specialist`. Phase 2 is structural: split bloated skills, extract `arete-baseline`, audit cross-cutting skills. Phased so Phase 1 can be lived-with for a few days before Phase 2 commits.

## Approach
Option 1 + selective Option 3 from `BRAINSTORM.md`. Reject the plugin restructure (single user, no team consumers yet) and the consolidation aggression (specialists stay, research/brainstorm stay separate, planner/executor wrappers earn their slot if they get pre-flight context). Take Option 3's skill restructure ideas (split `python.md`, extract `arete-baseline`) but only after Phase 1 settles.

---

## Phase 1 — Safe tactical wins

Target: ~3-4 hours. Reversible via `~/.claude/.backups/`.

### 1.1 Reconcile skill drift (do this FIRST)

Repo has 21 skills in `global/skills/`. Installed `~/.claude/skills/` has 43. The 22-skill delta has never been promoted back. Decide what to keep before any restructure.

**Action**: Dom runs `update-claude-setup --promote` from `/Users/dom/dev/arete/claude-setup`.

**Acceptance**:
- `ls /Users/dom/dev/arete/claude-setup/global/skills/*.md | wc -l` matches `ls -d ~/.claude/skills/*/SKILL.md | wc -l` (or close — some installed skills may be obsolete and intentionally dropped)
- Promoted skills reviewed; obsolete ones deleted from the repo before commit
- Diff committed as `chore: promote installed skill drift back to repo`

### 1.2 Retire wrapper commands — per-command verdict

Each verdict comes from reading the actual file. "RETIRE" = delete the `.md` from `global/commands/`. "KEEP-WITH-CONTEXT" = keep the file but add 5-10 lines of pre-flight (read prior docs, list folders) so it earns the slash slot. "KEEP" = leave as-is.

| Command | Verdict | Reason |
|---|---|---|
| `/brainstorm` | KEEP-WITH-CONTEXT | 9-line pure delegate today. Add: check for existing `docs/features/[topic]/RESEARCH.md` and pass it to the agent if found. List existing feature folders so duplicates surface. |
| `/plan` | KEEP-WITH-CONTEXT | 9-line pure delegate today. Add: check for `docs/features/[topic]/{RESEARCH,BRAINSTORM}.md`, pass paths to planner. Refuse if a `PLAN.md` already exists in `In Progress` or `Ready` (require `--force`). |
| `/execute` | KEEP-WITH-CONTEXT | Already has 4 useful steps. Add: refuse to start if plan status is `Draft` (per the global rule). Currently ambiguous whether this is enforced here or in the executor agent — enforce at the command boundary. |
| `/orchestrate` | KEEP-WITH-CONTEXT | Already has 5 steps. Add: verify the plan is actually flagged as an epic (look for `Epic` in title or a `--epic` marker) before invoking the orchestrator. Today it just trusts the user. |
| `/compound` | RETIRE | 5 fluffy steps that the `compounder` agent already knows. Dom can invoke "use the compounder agent to capture X" or just say "compound this pattern." Solution-doc destination is documented in the agent itself. |
| `/end-session` | KEEP | Muscle memory + Stop hook depends on the concept. The 5-step body is already pre-flight context (read dirty-files, clear it). Do not retire. |
| `/setup` | RETIRE | Stale. `init-claude-setup` CLI replaced this flow. Anyone running `/setup` today is mid-project and the steps don't apply. |
| `/test` | RETIRE | Overlaps with `/fix` step 5 and the test-running step in `/work-issue`. Dom can say "run the tests and fix what's broken" — both `/fix` and the framework detection live elsewhere. |
| `/review` | RETIRE | Overlaps with `code-reviewer` agent. After the new PostToolUse formatter hook lands (1.7), the auto-fix portion is mostly handled. Anything remaining: invoke `code-reviewer` directly. |

**Files to delete**: `global/commands/{compound,setup,test,review}.md`
**Files to edit (add 5-10 lines pre-flight)**: `global/commands/{brainstorm,plan,execute,orchestrate}.md`

**Acceptance**:
- 4 files deleted, 4 files edited
- Each KEEP-WITH-CONTEXT command's pre-flight added at the top of the body, before `$ARGUMENTS`
- After install, `~/.claude/skills/{compound,setup,test,review}` directories no longer exist (verify after 1.10)

### 1.3 Retire `ios-specialist` agent

`global/agents/ios-specialist.md` is 82 lines wrapping a single skill (`ios-standards`). The skill auto-loads on iOS triggers anyway.

**Action**:
- Delete `global/agents/ios-specialist.md`
- Edit `global/commands/work-issue.md` step 7 — remove the `ios-specialist` dispatch line and replace with "iOS → load `ios-standards` skill directly in the main session" (or via the new dispatcher agent, see 1.4)
- Grep the repo for any other `ios-specialist` references and update: `grep -rn "ios-specialist" /Users/dom/dev/arete/claude-setup/global /Users/dom/dev/arete/claude-setup/project-template`

**Acceptance**:
- Agent file deleted
- No remaining references in `global/` or `project-template/`
- `work-issue.md` step 7 still routes iOS work, just via skill load instead of agent dispatch

### 1.4 Slim `work-issue.md` — extract dispatcher

`global/commands/work-issue.md` is 234 lines. Steps 4 (Deep Analysis), 5 (Domain Classification), and 7 (Do the Work — domain dispatch) are the bulk. Extract to a new `dispatcher` agent.

**New agent**: `global/agents/dispatcher.md` (~60 lines)
- Inputs: issue context summary, list of affected files (from triage or fresh grep)
- Responsibilities:
  - Deep analysis (current step 4 verbatim)
  - Domain classification with the four signal-set rules (current step 5 verbatim)
  - Recommend specialist or skill load (current step 7 routing logic, minus the iOS specialist line)
  - Output: structured summary `{ scope, domain, specialist, skills, files }`
- Tools: Read, Grep, Glob, Bash (read-only commands only — no Write/Edit)

**Edit `work-issue.md`**:
- Steps 1, 2, 3: keep verbatim (load context, branch, post work plan)
- Steps 4-5: replace with one step "Invoke `dispatcher` agent with issue context. Show its output to user. Confirm domain before proceeding."
- Step 6: keep (recommend approach `/fix` vs `/plan` vs `/brainstorm`)
- Step 7: shrink to "Execute via dispatcher's recommendation. For small scope, load the recommended skills inline. For medium/large, delegate to the recommended specialist agent." Drop the per-domain bullet list (it's now in the dispatcher).
- Steps 8-11: keep verbatim (review, commit, completion comment, wrap up)

**Target line count**: ~120 lines (from 234).

**Acceptance**:
- `wc -l global/commands/work-issue.md` ≤ 130
- New `global/agents/dispatcher.md` exists
- Existing test: read the slimmed `work-issue.md` end-to-end — flow is still self-contained and Dom would still know what to do
- Domain classification logic is in exactly one place (the dispatcher), not two

### 1.5 Merge `/board` into `/status`

Both produce dashboards. `/status` reads local feature plans; `/board` reads GitHub Projects. Combine.

**New `global/commands/status.md`** structure:
- Default (no flags): show both sections — local features table + remote board table
- `--features`: only local feature plans (current `/status` body)
- `--board`: only GitHub project board (current `/board` body)
- `--board in-progress`, `--board blocked`, `--board todo`: pass-through filters from current `/board`
- Reuses `pm_tool` config detection from current `/board`

**Action**:
- Rewrite `global/commands/status.md` to merge both bodies behind flag parsing at the top
- Delete `global/commands/board.md`
- Update `global/CLAUDE.md` "Standard Workflow" section if it references `/board` (it does not appear to currently — verify)

**Acceptance**:
- `/board` command no longer exists
- `/status` with no args shows both sections
- All four `/board` filter modes (`in-progress`, `blocked`, `todo`, full) work via `--board <filter>`

### 1.6 Merge `/bug` + `/backlog` + `/update-issue` into `/issue`

All three deal with GitHub issue lifecycle. Subcommand on `/issue`:

- `/issue bug <description>` — current `/bug` body
- `/issue new <plan-name-or-description>` — current `/backlog` body
- `/issue update <number-or-search>` — current `/update-issue` body
- `/issue from-plan <feature-name>` — alias for `new` when input is a feature plan path (basically the existing `/backlog` "find the plan" branch)

**Action**:
- Create `global/commands/issue.md` that dispatches on the first arg (`bug | new | update | from-plan`) and inlines the body of the matching old command, lightly cleaned
- Delete `global/commands/{bug,backlog,update-issue}.md`
- If subcommand is missing or unknown: print usage and exit

**Acceptance**:
- One `/issue.md`, three deletes
- Each subcommand preserves the rules from its source file (e.g. "ALWAYS ask before creating" from `/bug`, "always include subtasks" from `/backlog`)
- File ≤ 250 lines despite combining three (don't lose content but trim duplicate prefaces)

### 1.7 Add SessionStart drift-warning hook

**Decision**: drift-warn IN, formatter DEFERRED to a later session (project-specific, not blocking).

New file: `global/hooks/drift-warn.js`
- Runs on `SessionStart` (any matcher, not just `compact`)
- Counts `~/.claude/skills/*/SKILL.md` vs the count cached in a `.driftcheck` file (or hardcoded — read from a manifest file the install script writes)
- If counts differ by more than ~3, print `Drift detected: ~/.claude/skills has N skills, repo expects M. Run update-claude-setup --promote.` to stderr (Claude sees the warning)
- Add to `global/settings.json` SessionStart hooks (next to the existing compact hook, no matcher constraint)

**Acceptance**:
- `drift-warn.js` exists and is executable
- `settings.json` SessionStart array includes the new hook entry alongside the existing compact entry
- Triggers a real warning if a skill is added to `global/skills/` without re-installing

### 1.8 Update `global/CLAUDE.md`

Refresh the rules and command list to match the new state.

**Edits**:
- "Standard Workflow" section: leave the pipelines (`/research → /brainstorm → /plan → /execute → /end-session`) — those commands still exist
- Remove the "Use `/compound` to capture patterns worth preserving across sessions" bullet (→ retired in 1.2; replace with "Ask the compounder agent to capture patterns when noticed")
- Reference docs section: leave as-is (the `@docs/reference/commands.md` etc. are project-template files; check whether they need their own update)
- Run line count check after edit: `wc -l global/CLAUDE.md` — must stay under 200 (currently 95)

**Acceptance**:
- File still under 200 lines
- No references to retired commands (`/compound`, `/setup`, `/test`, `/review`)
- New `/issue` and merged `/status` mentioned where relevant

### 1.9 Update repo `CLAUDE.md` — refresh drift note

The "Current drift to watch" section will be stale after 1.1.

**Edit `/Users/dom/dev/arete/claude-setup/CLAUDE.md`**:
- Replace the "Current drift to watch" section with the post-promote count or remove it if drift is fully reconciled
- Add a one-liner under "Non-obvious conventions" if any new patterns emerged (e.g. "Subcommand-style commands like `/issue bug` dispatch on first arg")

**Acceptance**:
- Section accurate as of the day Phase 1 lands
- File still concise (< 100 lines)

### 1.10 Deploy

Run `install-claude-setup --force` from `/Users/dom/dev/arete/claude-setup`.

**Verify**:
- `~/.claude/.backups/<timestamp>/` exists with the prior commands
- `~/.claude/skills/{compound,setup,test,review,bug,backlog,update-issue,board}` no longer exist
- `~/.claude/skills/{issue,status,dispatcher}` exist (note: `dispatcher` is an agent, lives in `~/.claude/agents/`)
- `~/.claude/agents/ios-specialist.md` no longer exists

### Phase 1 — Risks & rollback

| Risk | Mitigation |
|---|---|
| Retired wrapper turns out to be muscle memory | Rollback by copying from `~/.claude/.backups/<timestamp>/` and re-installing without `--force`. Or `git revert` the deletion in this repo and re-run `install-claude-setup --force`. |
| `dispatcher` agent loses analysis fidelity vs inline | Keep the original `work-issue.md` in git history; revert the slim if dispatcher's output is thinner than the inline version |
| PostToolUse formatter slows the loop | Hook is silent on missing formatter; remove from `settings.json` if it adds friction |
| Drift-warn hook fires false positives | Tune the threshold or disable the hook entry |

**Rollback path**: `~/.claude/.backups/<timestamp>/` (auto-created by `install-claude-setup --force`) holds the pre-deploy state. Restore via copy-back + re-install without `--force`.

---

## Phase 2 — Skill restructure

Target: ~4-6 hours. Only after Phase 1 has been lived-with for at least 3 days. Original skills preserved in git history.

### 2.1 Split `python.md` into focused skills

Current: 280 lines, 11 sections (project setup, types, async, error handling, env/config, CLI, FastAPI, pydantic v2, async sqlite, httpx, testing). That's 3-4 skills crammed into one.

**New skills** (each ≤ 250 lines, ideally ~150):

- `global/skills/python.md` — core only:
  - Project setup (pyproject.toml, ruff)
  - Types
  - Async (asyncio + httpx basics)
  - Error handling (custom exceptions, context managers)
  - Env/config (pydantic-settings)
  - CLI (typer)
  - Rules block at the bottom — keep verbatim
  - Drop: FastAPI section, pydantic v2 deep section, async sqlite, httpx full client section, FastAPI testing
- `global/skills/fastapi.md` — new:
  - App + lifespan setup
  - Routers + dependencies
  - Testing patterns (the existing FastAPI testing block)
  - Trigger phrases: "fastapi", "uvicorn", "starlette"
- `global/skills/pydantic.md` — new:
  - Pydantic v2 patterns (field_validator, model_validator, model_config)
  - BaseSettings / pydantic-settings cross-link to `python` skill
  - Trigger phrases: "pydantic", "BaseModel", "field_validator"

**Drop entirely** (per "skills don't get re-read on later turns"):
- Async SQLite section — too niche, write inline if needed
- Full httpx client section — keep one async example in core, not a tutorial

**Acceptance**:
- `python.md` ≤ 200 lines
- `fastapi.md` and `pydantic.md` exist and pass the trigger-phrase test (try a Claude session: ask FastAPI question, verify `fastapi` skill activates)
- No content lost (verify by diffing concatenated new skills against old `python.md` — only tutorial-style sections should be missing)

### 2.2 Audit other potentially bloated skills

**Action**: list all skills with line count, flag any over 200 lines, decide split/trim/keep for each.

```bash
wc -l /Users/dom/dev/arete/claude-setup/global/skills/*.md | sort -rn | head -20
```

**Criteria**:
- > 250 lines: must split or trim
- 150-250 lines: trim if it's tutorial-style or has 4+ unrelated sections
- < 150 lines: leave alone

For each over-200 skill, write a one-line verdict in this plan (update before executing). Read the skill, identify whether it's: (a) a coherent set of standing instructions in one domain — keep, or (b) a multi-topic blob — split.

**Acceptance**:
- All skills < 250 lines after audit
- Each split documented in `EXECUTION_LOG.md`

### 2.3 Extract `arete-baseline` skill

Read all four `*-standards` skills and extract content that repeats verbatim or near-verbatim.

**Concrete shared content** (from reading `backend-standards`, `frontend-standards`, `infra-standards`, `ios-standards`):
- "Read project CLAUDE.md before writing code" — appears in all four (backend "Before Writing Code" #4, frontend "Design System Persistence" #3, infra "Before Writing Any Terraform" #1, ios "Before Writing Code" #1)
- "Secrets via secrets manager / Infisical, never hardcoded" — backend has it explicitly, infra has the same point (OIDC, no static keys)
- "Match existing patterns before creating new ones" — all four have a variant
- Self-Review checklist scaffolding (each skill has a `## Self-Review` section — the format is shared, content differs)

**New `global/skills/arete-baseline.md`** (~60-80 lines):
- "Before Writing Any Code" — universal: read project CLAUDE.md, identify stack, check for existing patterns, confirm secrets strategy
- "Secrets" — universal: secrets manager (Infisical default for ACP), never hardcoded, never logged, no `.env` in production
- "Match Don't Invent" — universal: scan existing code, follow conventions, check for shared modules
- "Self-Review Header" — what every domain's Self-Review must include (the cross-cutting items: secrets clean, no hardcoded credentials, types covered)

**Edit each `*-standards` skill**:
- Remove the duplicated baseline content
- Add a description note: "Loads alongside `arete-baseline`. This skill covers <domain>-specific rules only."
- Keep all domain-specific content (the FastAPI rules in backend, the design system rules in frontend, the Terraform rules in infra, the SwiftUI rules in iOS)

**Acceptance**:
- `arete-baseline.md` exists
- Each `*-standards` skill is shorter than before by ~15-25 lines
- No content actually lost — concatenate baseline + each domain skill, diff against the original; only intentional dedup should be missing

### 2.4 Evaluate cross-cutting skills

For each of `error-handling`, `logging`, `env-config`, `testing`:

| Skill | Verdict (to fill in during execution after reading) | Action |
|---|---|---|
| `error-handling` | TBD — likely merge into language skills (Python error patterns into `python.md`, TS into `ts-component`) since error handling is language-flavored | Merge into language skills, delete cross-cutting version |
| `logging` | TBD — likely merge into `arete-baseline` (structured logging is a universal rule) | Merge into baseline, delete |
| `env-config` | TBD — likely merge into `arete-baseline` (overlaps with secrets) | Merge into baseline, delete |
| `testing` | TBD — likely keep as-is if it's truly cross-cutting (test discipline, not framework specifics); merge if it's mostly per-language | Read first, then decide |

**Action**: read each, fill in the verdict column, then execute the merges.

**Acceptance**:
- Each skill has a documented verdict
- Merges leave no content behind
- After-state: 21 skills minus drops, plus splits, plus `arete-baseline`. Net likely ~22-24 skills.

### 2.5 Update specialist agents to preload `arete-baseline`

`global/agents/{frontend,backend,infra}-specialist.md` each have a `skills:` frontmatter list.

**Action**: add `arete-baseline` as the first skill in each list, before the domain-specific ones.

**Acceptance**:
- All three agents preload `arete-baseline` first
- `ios-specialist` is already retired in Phase 1 — no change needed

### 2.6 Deploy incrementally

Run `install-claude-setup --force` after each meaningful chunk (after 2.1, after 2.3, after 2.4). Verify the new skills install correctly each time before proceeding. Don't bundle all of Phase 2 into one big deploy — if something breaks, the smaller blast radius is easier to bisect.

**Acceptance**:
- Three (or more) install runs across Phase 2
- Each run leaves `~/.claude/skills/` in a working state — verified by sampling 2-3 trigger phrases per chunk

### Phase 2 — Risks & rollback

| Risk | Mitigation |
|---|---|
| Skill split breaks auto-activation (`fastapi` doesn't trigger when expected) | Original `python.md` is in git history. Revert + re-install. |
| `arete-baseline` extraction loses domain-specific nuance | Concatenate-and-diff check before deleting from `*-standards` skills. Domain skill must still stand alone if baseline isn't loaded. |
| Cross-cutting merge (e.g. `error-handling` into `python.md`) makes `python.md` re-bloat | Re-check line count after each merge; split again if it crosses 250. |
| Specialist agent preload list gets out of sync with actual skill names after splits | After 2.1, manually update specialist `skills:` frontmatter to add new skill names if relevant (e.g. `fastapi` for backend-specialist) |

**Rollback path**: `~/.claude/.backups/<timestamp>/` for installed state, plus `git revert` in the repo. Both layers reversible.

---

## Out of Scope

- Plugin restructure (Option 2 from brainstorm) — deferred until team consumers materialize
- Single `domain-specialist` agent (Option 3) — keeping the four specialists for distinct quality gates and preload sets
- `/think` merge of research + brainstorm — keeping them separate (research = facts, brainstorm = options)
- Retiring `researcher` or `brainstorm` agents
- Retiring `planner` or `executor` agents
- Retiring `meta-agent` (no signal Dom wants this gone — leave alone unless asked)
- Retiring all four specialists wholesale
- Touching project-template/ structure (this plan is scoped to `global/` and a couple of repo-level docs)
- Migrating `set-org` into `init-claude-setup` (mentioned in brainstorm but low value; defer)

## Resolved Decisions

- [x] **`/orchestrate`**: KEEP-WITH-CONTEXT (Dom uses it, stays in the table at 1.2)
- [x] **Hooks**: drift-warn IN (1.7), formatter DEFERRED out of Phase 1
- [x] **Post-promote cleanup**: handled interactively during 1.1 — eyeball the promoted skills, delete obsolete ones before committing
- [x] **Phase 2 `testing` skill**: defer the verdict to Phase 2 execution (read it then, don't pre-decide)
- [x] **Skill line ceiling**: soft 250 — case-by-case exceptions OK, no hard cap

## Skills / Agents to Use

- **planner** (already done — produced this plan)
- **executor**: drives Phase 1 step-by-step after status flips to `Ready`
- **dispatcher** (new agent created in 1.4): not used to execute this plan, but built during it
- **memory-updater**: invoked via `/end-session` after Phase 1 lands and again after Phase 2 lands
- **compounder**: capture any patterns surfaced during execution (e.g. "subcommand dispatch in commands works like X") into `docs/solutions/`
