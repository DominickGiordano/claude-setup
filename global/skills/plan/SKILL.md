---
name: plan
description: "Break a topic down into a written plan doc at docs/features/[topic]/PLAN.md before writing any code."
disable-model-invocation: true
argument-hint: "[topic] [--force]"
---

## Pre-flight — runs here, in the main session

These steps gate the work and may need your answer, so they must NOT be forked into a
subagent. Do them before delegating:

1. Derive a `[topic]` slug from `$ARGUMENTS` (kebab-case).
2. Check for prior context — pass any of these to the planner if they exist:
   - `docs/features/[topic]/RESEARCH.md`
   - `docs/features/[topic]/BRAINSTORM.md`
3. If `docs/features/[topic]/PLAN.md` already exists with status `In Progress` or `Ready`, do NOT overwrite. Tell the user and require `--force` to proceed (e.g. `/plan [topic] --force`). Status `Draft` or `Done` is safe to overwrite.

Then invoke the `planner` agent with the topic and any context paths above.

$ARGUMENTS
