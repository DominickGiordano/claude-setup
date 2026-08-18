---
name: fix
description: "Quick-fix pipeline for small changes that don't need brainstorm/plan. Use for bug fixes, small features, config changes, and anything under 30 minutes."
disable-model-invocation: true
argument-hint: "[description]"
---

Quick-fix pipeline for small changes that don't need brainstorm/plan. Use for bug fixes, small features, config changes, and anything under 30 minutes.

## Steps

1. Parse the description: what's broken or what needs to change?
2. Find the relevant files — use grep, glob, read project CLAUDE.md for context
3. Read the code that needs to change
4. Implement the fix
5. Run the project's test suite (detect framework: `npm test`, `mix test`, `pytest -x -v`, etc.)
   - If tests fail, fix and re-run
   - If no test suite exists, skip
6. Run the project's linter if available (`ruff check .`, `mix credo`, `npm run lint`, etc.)
   - Auto-fix lint issues
7. Report it

## Output Format

No headings. One line per changed file, then test and lint status:

```
`file:line` — what changed and why
`file:line` — what changed and why

Tests: 42 passed. Lint: clean.
```

## Rules
- Do NOT brainstorm or write plan docs — this is the fast path
- Do NOT create new files unless the fix requires it
- If the fix is bigger than expected — 5+ files, past ~200 lines of logic, or it
  needs architectural decisions — stop. Say what you found and recommend `/plan`,
  or the split from the `pr-sizing` skill. Do not push through and hand over a
  500-line diff
- Always read before editing — understand the context
- Run tests after every fix

$ARGUMENTS
