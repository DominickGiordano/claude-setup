---
name: execute
description: "Act on a written plan doc — delegation preview, approval, then execute with an audit trail in EXECUTION_LOG.md."
disable-model-invocation: true
argument-hint: "[feature-name]"
---

## Pre-flight — runs here, in the main session

Steps 2-5 are approval gates. They must NOT be forked into a subagent, or the gates
stop working. Do them before delegating:

1. Read `docs/features/$ARGUMENTS/PLAN.md`.
2. **Refuse to proceed if the plan status is `Draft`.** The global rule is: never execute a `Draft` plan — flip to `Ready` first. Tell the user and stop.
3. If the plan is `In Progress` already, surface that and ask whether to resume from the last unticked step or restart.
4. Show the delegation preview — which agents/skills will run and in what order.
5. Wait for go-ahead.

Then invoke the `executor` agent. It executes, ticks off plan steps, and logs progress to `docs/features/$ARGUMENTS/EXECUTION_LOG.md`.

$ARGUMENTS
