---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.heex"
  - "**/*.eex"
  - "**/*.html"
  - "**/*.html.eex"
  - "**/*.css"
  - "**/*.yml"
  - "**/*.yaml"
---

# Verification Before Pushing

Loads when touching UI, templates, or app-parsed config — the changes unit tests
are worst at covering.

- For UI / rendering / state-machine / template changes: run `/verify` (or walk the
  flow in a browser) BEFORE pushing. State "verified in browser" or "did not verify
  — only unit tests" explicitly in the PR description.
- Green `mix precommit` / `pnpm test` is necessary, NOT sufficient. Unit tests don't
  catch UX regressions, content duplication, lock-cascade bugs, or contract drift.
- For content/template changes: render the final output — a YAML diff is not what
  users will see.
- For state-machine changes (status enums, lock reasons, phase states): manually
  trace every reader of the field. Tests rarely cover all reader paths.
- Do NOT ship a PR that touches UI / state machines / content templates without
  manual verification. Green tests are not a feature working.
