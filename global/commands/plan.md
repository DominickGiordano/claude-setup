---
name: plan
description: "Use the planner agent to break down the task before writing any code."
disable-model-invocation: true
---

Use the planner agent to break down the task before writing any code.

## Pre-flight

Before invoking the agent:

1. Derive a `[topic]` slug from `$ARGUMENTS` (kebab-case).
2. Check for prior context — pass any of these to the planner if they exist:
   - `docs/features/[topic]/RESEARCH.md`
   - `docs/features/[topic]/BRAINSTORM.md`
3. If `docs/features/[topic]/PLAN.md` already exists with status `In Progress` or `Ready`, do NOT overwrite. Tell the user and require `--force` to proceed (e.g. `/plan [topic] --force`). Status `Draft` or `Done` is safe to overwrite.

Then invoke the `planner` agent with the topic and any context paths above.

$ARGUMENTS
