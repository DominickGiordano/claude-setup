# Workflow Quick Reference

Two questions decide everything: **where does the work come from**, and **how much
supervision do you want**.

## The map

```
  small, understood change
      └─► /fix [description] ──────────────► edits + tests + lint. You commit.

  a GitHub issue already exists
      └─► /work-issue <#> ─────────────────► branch → work-plan comment → code →
                                             review → commit + push → issue updated

  a feature, from scratch
      ├─ /research [topic]      (optional, unfamiliar tech — forked, has web access)
      ├─ /brainstorm [topic]    (optional, approach unclear)
      └─ /plan [topic]          → PLAN.md   ← flip status to Ready
                 │
        ┌────────┴─────────────────────────────┐
        │                                      │
   /execute [feature]                   /goals [feature]
   supervised single pass.              → GOALS.md + 1 tracking issue
   Delegation preview, you                + 1 issue per task
   approve, works in your                       │
   current branch, logs to           ┌──────────┴───────────┐
   EXECUTION_LOG.md. You commit.     │                      │
                                /goal              /work-issue <#>
                          autonomous loop.        one task at a time,
                          Per task: branch →      issue-driven, you
                          TDD → suite green →     stay in the loop
                          docs → commit → PR
                          into base_branch →
                          CI green → next.
                          NEVER merges.

  all of the above in one session
      └─► /cycle <problem> ────────────────► brainstorm → plan → goals → goal,
                                             with a gate before each stage

  you don't understand the code yet
      └─► /walkthrough [scope] ────────────► guided tour, stop by stop. Read-only.
                                             → docs/walkthrough/<slug>.md + friction list
```

`/walkthrough` is the one entry above that produces no code. Reach for it *before* the
others when the blocker is comprehension rather than a decision — a repo you've never
worked in, a subsystem someone else built, an inherited service. `/research` answers
questions about *external* tech; `/walkthrough` answers them about ours.

## Picking between `/execute`, `/goal` and `/work-issue`

All three do the work. They differ in granularity and how much you watch.

| | `/execute` | `/goal` | `/work-issue` |
|---|---|---|---|
| Input | `PLAN.md` | `GOALS.md` | one GitHub issue |
| Supervision | Preview + your approval, then one pass | Approved once at `/goals`, then autonomous | Per issue |
| Git | Your current branch | Branch + PR **per task**, stacked when dependent | One branch, pushed |
| CI | Not touched | Watched to green, 3 strikes then stops | Not watched |
| Tests | As the plan says | TDD enforced — tests written first and must fail | As the issue says |
| Output | `EXECUTION_LOG.md` | One open PR per task + progress log | Issue completion comment |
| Merges? | n/a | **Never** | No |
| Reach for it | Small scope, or you want to watch | Long plan, want PRs waiting | A ticket exists |

`/goals` and `/work-issue` compose: `/goals` *creates* the task issues, `/work-issue`
*consumes* one. So a long build has a middle gear — generate the issues, then work them one
at a time by hand instead of letting `/goal` loop.

## Three worked examples

**Bug someone reported, no ticket**
```
/fix the leaderboard shows stale counts after a BCC lands
/commit
```

**Ticketed work**
```
/work-issue 412        # branch, work plan comment, code, review, commit+push, issue update
/pr                    # PR description off base_branch
```

**Substantial feature, want PRs waiting for you**
```
/research streaming tool-use          # optional — forked, cites primary sources
/brainstorm realtime run viewer
/plan realtime-run-viewer             # then flip status: Draft → Ready
/goals realtime-run-viewer            # GOALS.md + tracking issue + task issues
/goal                                 # loops: PR per task, CI green, stops on trouble
                                      # answer "first task only" the first time
/end-session
```

## Hard rules that apply throughout

- **`Draft` plans don't execute.** `/execute` and `/goals` both refuse. Review, set `Ready`.
- **Base branch is `develop`** unless Project Config says otherwise. If `develop` exists,
  `main` is never the PR target — the `guard-bash` hook enforces it, and blocks rather than
  asks when it finds a local `develop`.
- **Nothing merges itself.** `/goal` stops at green CI on an open PR. Review is yours.
- **`/goal` stops rather than guessing** when: the suite can't go green, CI fails three times,
  the plan's approach no longer matches the code, or a decision needs you.
- **Green tests aren't sufficient.** UI, template, and state-machine changes need `/verify`
  or a real browser pass before the PR — the `verification.md` rule loads automatically on
  those file types.

## Session bookends

**Start**: `/catchup` — last session's summary and current focus. `/sync-memory` first if it
feels thin (that means `/end-session` was skipped).
**End**: `/end-session` — logs what happened, drains `dirty-files`.

If you skip `/end-session`, the `SessionEnd` hook writes a stub listing the files you touched
so nothing is lost — but it can't capture *why*.

## Mid-session

- `/status` — local plans; `--board` for the GitHub project board
- `/code-review` — review the working diff
- `/verify` — drive the app to confirm a change really works
- `/commit`, `/pr` — structured commit; PR description off `base_branch`
- `/issue bug|new|from-plan|update` — issue lifecycle
- Ask the `compounder` agent to capture a lesson worth keeping
