---
name: orchestrate
description: "Use the orchestrator agent to decompose an epic plan into feature plan docs."
disable-model-invocation: true
---

Use the orchestrator agent to decompose an epic plan into feature plan docs.

## Pre-flight

Before invoking the orchestrator:

1. Read `docs/features/$ARGUMENTS/PLAN.md`.
2. **Verify it is actually an epic plan.** Look for `Epic` in the title, an `--epic` marker in the plan body, or a `Phases` / `Sub-features` section listing 2+ child features. If none of these are present, ask the user to confirm before treating it as an epic.
3. **Refuse if status is `Draft`.** Same rule as `/execute` — flip to `Ready` first.
4. Show the orchestration plan: which sub-feature folders will be created, the proposed dependency order, and the execution-mode options (sequential / parallel / manual).
5. Wait for the user's choice before anything runs.

Then invoke the `orchestrator` agent.

$ARGUMENTS
