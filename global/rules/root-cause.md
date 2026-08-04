# Root-Cause Investigations

- When fixing a bug whose cause is unknown: if your FIRST PR doesn't resolve it,
  STOP. Do not ship a second guess.
- Before the second attempt: get diagnostic data — run the project's diagnostic
  tooling, write a self-contained query, or add a Logger statement on the silent
  failure path and wait for it to fire.
- "Three different attempted fixes shipped without log evidence" is a red flag.
  Surface it and ask for diagnostic input.
- Do NOT ship a second root-cause fix without diagnostic data from the first failure.
  Stop and instrument instead.

## Contract changes

- Use the `pre-impl-audit` skill for any contract-touching change. Skip it for small
  `/fix` work.
- Do NOT bulk find-replace without grepping every consumer first.

## Diagnostic commands

- Queries must be self-contained — no `<placeholder>` for IDs the query can find itself.
- If you need "the most recent X" or "a row matching email Y," write the lookup INTO
  the query.
- If a placeholder is genuinely unavoidable, mark it `# REPLACE: <description>` so the
  user knows what to fill.
