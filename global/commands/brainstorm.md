---
name: brainstorm
description: "Use the brainstorm agent to explore a topic and converge to 2-3 options."
disable-model-invocation: true
---

Use the brainstorm agent to explore a topic and converge to 2-3 options.

## Pre-flight

Before invoking the agent:

1. Derive a `[topic]` slug from `$ARGUMENTS` (kebab-case).
2. Check `docs/features/[topic]/RESEARCH.md` — if it exists, pass its path to the brainstorm agent so the brainstorm builds on the research.
3. List existing folders under `docs/features/` and surface any near-duplicate topic names. If one matches, ask: continue under that folder, or create a new one?
4. Note whether `BRAINSTORM.md` already exists for this topic — if it does, ask whether to update it or create a fresh draft.

Then invoke the `brainstorm` agent with the topic and any context paths above.

$ARGUMENTS
