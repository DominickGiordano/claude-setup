# Command Reference

Quick reference for the slash commands available in Claude Code.

For the authoritative, always-current list run `claude-setup help` — it is generated from
the installed skills, so it never goes stale. This page is the annotated version.

## Workflow Commands

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/fix [description]` | Quick-fix pipeline: read → implement → test → review | Bug fixes, small changes, anything < 30 min |
| `/research [topic]` | Investigate a technology before brainstorming | Unfamiliar library, API, or architecture question |
| `/brainstorm [topic]` | Explore options, converge to 2-3 with tradeoffs | Start of a new feature when approach is unclear |
| `/plan [topic]` | Write a structured implementation plan | After brainstorm, or when approach is already clear |
| `/execute [feature]` | Act on a plan — shows preview, waits for approval | When plan status is Ready |
| `/orchestrate [epic]` | Break epic plan into sub-feature folders | Multi-feature work with dependencies |

## Autonomous Execution Commands

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/goals [feature]` | Turns an approved `PLAN.md` into `GOALS.md` plus one GitHub issue per task | After `/plan`, when the build is long enough to want tracked tasks |
| `/goal [path]` | Works each `todo` task to green suite + docs + commit + PR into `base_branch` + green CI, then loops. Never merges | When you want PRs waiting for review instead of watching it work |
| `/cycle <problem>` | Runs brainstorm → plan → goals → goal in one session, with a gate between each | Starting something substantial from scratch |

`/goal` stops rather than guessing when the suite can't go green, CI fails three times, the
plan's approach no longer matches the code, or a decision needs you. It checkpoints context
after every task and compacts at 70%, so it survives long runs.

## Issue Lifecycle Commands

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/work-issue [#]` | Full dev cycle on a GitHub issue: branch → analyze → code → test → commit → update issue | Picking up an existing issue |
| `/issue bug [desc]` | File a bug | Something is broken |
| `/issue new [desc]` | File a feature or task | Work that should be tracked |
| `/issue from-plan [feature]` | Create an issue from a plan doc | After `/plan`, to get it on the board |
| `/issue update [# or search]` | Comment, label, close, or move on the board | Keeping the board honest |

## Code Quality Commands

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/code-review` | Review the working diff for quality, security, correctness | After implementing, before committing |
| `/verify` | Drive the running app to confirm a change actually works | Required for UI / template / state-machine changes |
| `/commit` | Stage and commit with structured message | When changes are ready to commit |
| `/pr` | Prepare a pull request description off `base_branch` | When branch is ready for review |

Running the test suite has no dedicated command — say "run the tests and fix what's
broken", or let `/fix` and `/work-issue` do it as part of their pipeline.

## Knowledge & Memory Commands

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/walkthrough [scope]` | Guided stop-by-stop tour of a codebase, writes `docs/walkthrough/[slug].md` | Onboarding to a repo, or before changing code you don't know |
| `/status` | Local feature plans, plus the project board with `--board` | Anytime — see what's in flight |
| `/catchup` | Resume context from last session | Start of session |
| `/sync-memory` | Backfill session log from git history | When `/end-session` was skipped |
| `/end-session` | Log session summary, update Current Focus | End of every session |
| `/audit-config` | Health check: CLAUDE.md size, stale content, missing rules | Periodically, or when config feels bloated |

To capture a reusable pattern, ask the `compounder` agent ("compound this pattern") —
it writes to `docs/solutions/`. There is no `/compound` command.

## Setup Commands

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/init` | Let Claude draft this project's CLAUDE.md from the codebase | First time working in a project |
| `/set-org [name]` | Copy org conventions into `.claude/rules/org.md` | New project, or org conventions changed |

## Decision Tree

```
Is it a bug fix or < 30 min change?
  → /fix

Is the approach unclear?
  → /brainstorm (or /research first if tech is unfamiliar)

Do you know what to build?
  → /plan → /execute

Is it a large multi-feature effort?
  → /plan [epic] → /orchestrate → /plan each → /execute each

Done for the day?
  → /end-session
```
