---
name: execute
description: "Supervised single pass over a plan doc — delegation preview, your approval, then execute with an audit trail in EXECUTION_LOG.md."
disable-model-invocation: true
argument-hint: "[feature-name]"
---

## `/execute` or `/goal`?

Both act on a plan. Pick by how much supervision you want:

| | `/execute` (this one) | `/goal` |
|---|---|---|
| Shape | One supervised pass | Autonomous loop, task by task |
| You approve | The delegation plan, up front | Once, at `/goals` |
| Git | Works in your current branch | Branch + PR per task, stacked when dependent |
| CI | Not touched | Watched to green, 3 strikes then stops |
| Output | `EXECUTION_LOG.md` | One open PR per task + `GOALS.md` progress log |
| Reach for it when | Scope is small, or you want to watch | The plan is long and you want PRs waiting for you |

`/goal` needs a `GOALS.md` first — run `/goals` to generate it from the plan.

## Pre-flight — runs here, in the main session

Steps 2-5 are approval gates. They must NOT be forked into a subagent, or the gates
stop working. Do them before delegating:

1. Read `docs/features/$ARGUMENTS/PLAN.md`.
2. **Refuse to proceed if the plan status is `Draft`.** The global rule is: never execute a `Draft` plan — flip to `Ready` first. Tell the user and stop.
3. If the plan is `In Progress` already, surface that and ask whether to resume from the last unticked step or restart.
4. Show the delegation preview — which agents/skills will run and in what order.
5. Wait for go-ahead.

The delegation preview must state the expected size of each step in hand-written
logic lines. If any step is past ~400, offer the split from `rules/pr-sizing.md`
before starting — not after the diff exists.

Then invoke the `executor` agent. It executes, ticks off plan steps, and logs progress to `docs/features/$ARGUMENTS/EXECUTION_LOG.md`.

$ARGUMENTS
