---
name: goals
description: "Turn an approved PLAN.md into a resumable GOALS.md with linked GitHub issues, one per task."
disable-model-invocation: true
argument-hint: "[feature-name or path to PLAN.md]"
---

# /goals — Plan to Goal File

Convert an approved plan into a durable, resumable goal file plus linked GitHub issues.
Third step in the loop:

`/brainstorm` → `/plan` → **`/goals`** → `/goal` (execute)

Adapted from Garrett's `gw:goals`. Differences from his version, deliberately:
artifacts live in `docs/features/<feature>/` (not a separate `goals/` tree), test commands
come from Project Config (not hardcoded `pytest`), and **nothing is appended to CLAUDE.md** —
see Step 5.

## Step 0 — Read Project Config

From the project's `.claude/CLAUDE.md`, read the `## Project Config` block:

- `base_branch` — default `develop`
- `test_commands` — the actual command(s) for this repo. **Never assume `pytest`.**
  If absent, detect: `mix.exs` → `mix test`, `package.json` → the `test` script,
  `pyproject.toml` → `pytest`, `go.mod` → `go test ./...`. If you still can't tell, ask.
- `pm_tool` — if `none`, skip issue creation entirely and say so; the goal file alone is
  still a complete deliverable.

## Step 1 — Locate the plan

Resolve in this order:

1. `$ARGUMENTS` is a path to a plan file → read it.
2. `$ARGUMENTS` is a feature name → `docs/features/<feature>/PLAN.md`.
3. The `/plan` output already in this conversation.
4. Newest `docs/features/*/PLAN.md` by mtime.
5. Nothing found → **stop** and tell the user to run `/plan` first. Do not invent a plan.

Read it in full before writing anything.

**Refuse if the plan status is `Draft`.** Same rule as `/execute`: review it and flip to
`Ready` first. If the plan has no explicit phases, derive them from its natural sequencing —
do not pad it with phases the plan doesn't imply.

## Step 2 — Confirm scope before creating issues

Print a short summary and stop for one confirmation:

- Goal title and one-line objective
- Phase list with task counts
- The exact goal file path you will write
- Number of issues you will create (1 tracking + N tasks)
- The resolved `test_commands` and `base_branch`

Creating issues is not reversible tidily. Wait for a clear yes.

Each task must be one reviewable piece per `rules/pr-sizing.md`: stands alone,
under ~200 lines of hand-written logic, no refactor riding along with a behavior
change. If a plan task is really three PRs, split it into three issues here and
say so in the summary above — this is the last cheap place to fix the split.

## Step 3 — Create the GitHub issues

Verify the repo: `gh repo view --json nameWithOwner -q .nameWithOwner`. If `gh` isn't
authenticated, there's no remote, or `pm_tool: none` — write the goal file anyway, mark every
issue field `TBD`, and note it at the top of the file.

One **tracking issue**:

```bash
gh issue create --title "Goal: <Goal Title>" --body-file <tmp> --label goal
```

Then one issue per task:

```bash
gh issue create --title "[Phase <n>] <Task title>" --body-file <tmp> --label task
```

Each task issue body contains:

- **Parent:** `#<tracking issue>`
- **Objective:** what changes and why, two sentences
- **Files touched:** best-guess paths from the plan
- **Test requirements:** named test cases, including at least one real user scenario
- **Definition of done:** the checklist from the goal file task
- **Depends on:** issue numbers of prerequisite tasks, if any

Then edit the tracking issue body to hold `- [ ] #<n> <title>` lines so GitHub renders
progress. Create missing labels with `gh label create <name> --force`.

If the project has a board (`github_project_number` in Project Config), add the tracking
issue to it and set status to the first column.

## Step 4 — Write the goal file

Path: `docs/features/<feature>/GOALS.md` — same folder as the PLAN.md it came from, so a
feature's research, brainstorm, plan, goals and execution log all live together.

If it already exists, ask before overwriting; offer `GOALS-2.md` instead.

````markdown
# <Goal Title> — Goals

**Created:** <YYYY-MM-DD>
**Source plan:** <path>
**Tracking issue:** #<n>
**Repo:** <owner/name>
**Base branch:** <base_branch>
**Test command:** <resolved test_commands>
**Status:** not started

## Objective

<Two or three sentences. What is true when this is done that isn't true now.>

## Success criteria

- [ ] <Observable, testable outcome>
- [ ] Full test suite passes with no skips or xfails added for this work
- [ ] Repo documentation reflects the change

## Non-goals

- <Explicitly out of scope, pulled from the plan>

## Constraints and context

<Stack, existing patterns to follow, files that must not change, migrations needed.
Everything a fresh session needs to continue without re-reading the plan.>

---

## Phase 1 — <Phase name>

**Outcome:** <what this phase delivers on its own>

### Task 1.1 — <Task title>

- **Issue:** #<n>
- **Status:** `todo`
- **Files:** `lib/thing.ex`, `test/thing_test.exs`
- **Approach:** <3–6 bullets of concrete implementation steps>

**Tests (write these first, watch them fail):**

- `<unit_behavior>` — <what it asserts>
- `<edge_case>` — <what it asserts>
- `<real_user_scenario>` — <a full path a real user takes, end to end, in user terms>

**Definition of done:**

- [ ] Tests above written and failing for the right reason
- [ ] Implementation complete
- [ ] Full suite green
- [ ] Docs updated: <specific file and section>
- [ ] Committed with `Closes #<n>`
- [ ] PR open into `<base_branch>`, CI green
- [ ] Context checkpoint done

### Task 1.2 — <...>

---

## Progress log

Append one entry per task reaching review. Newest last. This table is the committed,
shareable record — it is what a teammate or a future session reads.

| Date | Task | Issue | PR | Notes |
| ---- | ---- | ----- | -- | ----- |

## Open questions / deferred

- <Anything the plan left unresolved>
````

Rules for the breakdown:

- Every task finishes in one focused sitting with a green suite at the end.
- Every task ends committable. No task depends on a later task to compile.
- Test names are concrete and specific to this codebase, never placeholders. Read the repo's
  test directory and fixture setup before naming anything, and match its conventions.
- **At least one real user scenario test per task** — exercises the actual path a user takes,
  realistic data, mocking only true external boundaries. If a task has no user-facing surface
  (a migration, a refactor), the scenario test asserts an existing user path still works.

## Step 5 — Register the goal

**Do not append to CLAUDE.md.** CLAUDE.md loads in full on every session in this repo; a
growing per-goal list there degrades adherence for all work, not just this goal. The
registration points are:

1. **The goal file itself** — committed, and the source of truth.
2. **The tracking issue** — the shareable status surface.
3. **Auto memory** — save one short note that this goal exists and where its file is, so a
   future session recalls it without loading anything. Auto memory's index is capped and
   topic files load on demand, which is exactly what a running log needs.

Then commit only the goal file:

```
docs: add goal file for <Goal Title>

Refs #<tracking issue>
```

## Step 6 — Hand off

Print, and nothing more:

- The goal file path
- Tracking issue URL
- Task issue count
- `Next: /goal docs/features/<feature>/GOALS.md`

## Guardrails

- Write no implementation code. This produces a plan artifact and issues only.
- Create no issues before the user confirms Step 2.
- Never assume the test runner. Resolve it from Project Config or detection.
- Do not silently drop plan content. Anything that doesn't fit a phase/task shape goes under
  **Open questions / deferred** rather than being lost.
