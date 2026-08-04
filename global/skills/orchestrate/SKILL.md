---
name: orchestrate
description: "Decompose an epic plan into per-feature plan docs with a dependency order and an execution mode."
disable-model-invocation: true
argument-hint: "[epic-name]"
---

## Pre-flight — runs here, in the main session

Steps 2-5 are approval gates. They must NOT be forked into a subagent, or the gates
stop working. Do them before delegating:

1. Read `docs/features/$ARGUMENTS/PLAN.md`.
2. **Verify it is actually an epic plan.** Look for `Epic` in the title, an `--epic` marker in the plan body, or a `Phases` / `Sub-features` section listing 2+ child features. If none of these are present, ask the user to confirm before treating it as an epic.
3. **Refuse if status is `Draft`.** Same rule as `/execute` — flip to `Ready` first.
4. Show the orchestration plan: which sub-feature folders will be created, the proposed dependency order, and the execution-mode options (sequential / parallel / manual).
5. Wait for the user's choice before anything runs.

Then invoke the `orchestrator` agent.

$ARGUMENTS
