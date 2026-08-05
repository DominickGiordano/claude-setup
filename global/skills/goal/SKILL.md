---
name: goal
description: "Autonomously work a GOALS.md task by task — TDD, docs, one PR per task into base_branch, CI watched to green, context checkpointed. Never merges."
disable-model-invocation: true
argument-hint: "[path to GOALS.md, or blank for the newest]"
---

# /goal — Execute a Goal File

Work the goal file one task at a time. Each task ends with a green suite, updated docs, a
commit, a PR into the base branch assigned to the user, green CI, and an updated goal file.
Never leave a task half-done.

**You never merge.** Review is the user's job. Your job ends at green CI on an open PR.

Adapted from Garrett's `gw:goal`. Differences, deliberately: the test command comes from
Project Config rather than a hardcoded `pytest`, artifacts live under
`docs/features/<feature>/`, and the per-task work log goes to **auto memory**, not CLAUDE.md
(see Step 5).

This is the autonomous mode. For a supervised single pass with a delegation preview, use
`/execute` instead.

## Step 0 — Load

1. Goal file: `$ARGUMENTS` if given, else the newest `docs/features/*/GOALS.md`.
   If none, stop and tell the user to run `/goals`.
2. Read the goal file in full — objective, constraints, progress log, all phases.
3. Read the project `CLAUDE.md` for conventions and the `## Project Config` block:
   - `base_branch` (default `develop`)
   - `test_commands` — **the real command for this repo. Never assume `pytest`.**
     If absent, detect: `mix.exs` → `mix test` (prefer `mix precommit` if defined),
     `package.json` → its `test` script, `pyproject.toml` → `pytest`, `go.mod` → `go test ./...`.
4. Recall auto memory for this repo — prior gotchas from earlier tasks live there.
5. Find the **first task with status `todo`**. If its `Depends on` issues are open, work the
   dependency first.
6. Print: goal title, task ID, task title, issue number, resolved test command. Then start.
   Don't re-ask permission the user already gave at `/goals`.

## Step 0.5 — Branch

```bash
git remote update --prune
git rev-parse --verify "origin/<base_branch>"   # must exist
```

If the base branch doesn't exist on the remote, **stop and ask**. Do not silently fall back
to `main`. `main` is release + production deploy — the `guard-bash` PreToolUse hook will
block a PR targeting it when a `develop` exists, and it is right to.

Where to branch from:

- **No open PR from a prerequisite task** → branch from `origin/<base_branch>`.
- **A prerequisite task's PR is open and unmerged** → branch from *that* branch and set the
  new PR's base to it. This stacks the PRs. Say so out loud — the user must merge in order.

```bash
git switch -c <type>/<issue-number>-<kebab-slug> "origin/<base_branch>"
```

`<type>` is `feat`, `fix`, `chore`, `docs`, `refactor`, or `test` — the conventional-commit
prefixes this org uses for changelog generation. One branch per task.

Never commit directly to the base branch or to `main`.

## Step 1 — Orient in the code

Read the files the task names, plus their tests. Confirm the approach still matches reality —
plans go stale. If the code has diverged enough that the approach is wrong, **stop** and say
so with a proposed correction rather than improvising a different design.

If this task changes a contract — schema, state machine, template, render path, action
signature, public API, or app-parsed YAML — run the `pre-impl-audit` skill first.

## Step 2 — Tests first

Write the tests the task names, including the real user scenario test.

- Follow the repo's existing fixture and layout conventions.
- Real user scenario tests use realistic data and hit the actual entry point the user hits.
  Mock only true external boundaries — network, paid APIs, the clock.
- Run them. **They must fail, and fail for the reason you expect.** A test that passes before
  the implementation exists is testing nothing — fix the test.

## Step 3 — Implement

The minimum code that makes the tests pass. Follow existing patterns in the file you're
editing over patterns you'd prefer. No unrequested refactors, no speculative abstraction.

## Step 4 — Green the whole suite

Run the resolved `test_commands` — the entire suite, not just the new tests. If something
unrelated breaks, fix it; a broken suite is not done.

Do not add `skip`, `xfail`, `@tag :skip`, `.only`, or loosen an assertion to reach green. If a
pre-existing failure blocks you, note it in the progress log and say so explicitly.

Green tests are necessary, not sufficient. If this task touched UI, rendering, a state
machine, or a content template, the `verification.md` rule applies: verify the real output
before opening the PR, and state in the PR whether you did.

## Step 5 — Document

In this order:

1. **Repo docs** — the file the task's definition of done names. Real content: what changed,
   how to use it, any new config or env var. Create the page if it should exist and doesn't.
2. **README** — only if setup, usage, or commands changed.
3. **The goal file's Progress log** — the committed, shareable record (Step 9).
4. **Auto memory** — save what a future session with no context would need:

   ```
   <Task ID>: <what changed, one line>. Files: <paths>. Issue #<n>, PR #<m>.
   Gotcha: <anything surprising, or omit if none>.
   ```

   **Do not append a work log to CLAUDE.md.** CLAUDE.md loads in full every session in this
   repo, so a growing per-task log there degrades adherence for all future work. Auto memory
   is the right home: its index is capped and enforced, and detail files load only on demand.

## Step 6 — Commit

```bash
git add <specific paths>
git commit -m "<type>: <task title>

<what and why, two or three lines>

Closes #<n>"
```

Never `git add -A`. Never commit with a red suite. No `Co-Authored-By` trailer — this org
disables it in settings; don't reintroduce it by hand.

`Closes #<n>` closes the issue when the PR merges, which is the user's action. Do not close
the issue yourself.

## Step 7 — Open the PR

```bash
git push -u origin HEAD
```

Never force-push. If the push is rejected, rebase onto the base branch, re-run the suite, and
push again — do not `--force` past it.

```bash
gh pr create --base "<base_branch>" --head <branch> --assignee @me \
  --title "<type>: <task title>" --body-file <tmp>
```

- `--base` is the stacked prerequisite branch instead, if Step 0.5 stacked it.
- `--assignee @me` — GitHub rejects requesting review from the PR author, so `--reviewer @me`
  fails. Assignment is the mechanism. Don't guess at other reviewers.
- Not a draft. It's ready when CI is green.

PR body:

```markdown
Closes #<issue>
Goal: `docs/features/<feature>/GOALS.md` — Task <id>

## What changed
<two or three lines>

## Tests
- `<name>` — <what it asserts>
- `<real_user_scenario>` — <the user path it exercises>

## Verification
<"Verified in browser: <what you did>" or "Did not verify — only unit tests">

## Review notes
<anything non-obvious, or "none">

<!-- If stacked: -->
> Stacked on #<prev PR>. Merge that one first.
```

## Step 8 — Watch CI to green

```bash
gh pr checks --watch --fail-fast
```

Pass → Step 9. Fail:

1. Read the actual failure — `gh run view <id> --log-failed`. Never guess from the check name.
2. Fix on the same branch. Run the full suite locally first.
3. Commit (`fix: <what>`), push, re-watch.
4. **Three attempts maximum.** After the third failure, stop and report: the failing check,
   the real error, what you tried, and what you think is wrong. A CI failure you can't explain
   is a signal to stop, not to keep pushing commits — same rule as a second root-cause guess.

Never disable a check, add `continue-on-error`, or edit a workflow to reach green. If the
workflow itself is broken, say so and stop.

If the repo has no CI, note it once and move on.

## Step 9 — Update the goal file

- Task status `todo` → `in review`. **Not `done`** — done means merged, and you don't merge.
- Record the PR number and URL on the task
- Tick every box in the task's definition of done
- Append a row to the **Progress log**, including the PR link
- Mark the phase complete if this was its last task
- Tick any **Success criteria** the task satisfied
- If every task is `in review`: set `**Status:** awaiting review` and comment the full PR list
  on the tracking issue. Leave the tracking issue open — the user closes it after merging.

Commit the goal file update along with the task, or as a follow-up commit on the same branch.

## Step 10 — Context checkpoint

**After every task, before starting the next.**

Run `/context`. At **≥70% used**:

1. Confirm Steps 5–9 are fully on disk — pushed branch, open PR, goal file updated, memory
   saved. The goal file and auto memory are the handoff; anything only in context is about to
   be gone.
2. `/compact` with a focused instruction:
   `/compact Keep: goal file path, current phase, next task ID, base branch, test command, and any unresolved gotchas.`
3. After compacting, re-read the goal file before continuing.

Below 70%: straight to the next task.

## Step 11 — Loop or stop

Print three lines: what finished, the PR URL, what's next. Then:

- **Continue automatically** to the next `todo` task, from Step 0.5.
- **Stop and report** if: the suite can't go green, CI failed three times, the approach no
  longer matches the code, a decision needs the user, or every task is `in review`.

When all tasks are `in review`, print the full ordered PR list — the user needs merge order,
especially if anything stacked.

## Guardrails

- **Never merge a PR.** No `gh pr merge`, no auto-merge flag, no exceptions.
- One task at a time. One branch, one PR, one commit series per task.
- Never commit to the base branch or `main` directly. Never force-push.
- Never assume the test runner — resolve it from Project Config or detection.
- Never mark a task done with a red suite or red CI.
- Never edit a test to fit the implementation. Fix the implementation, or say the test was
  wrong and explain why.
- Never append a running log to CLAUDE.md.
- The goal file is the source of truth. If it and your memory disagree, the file wins.
