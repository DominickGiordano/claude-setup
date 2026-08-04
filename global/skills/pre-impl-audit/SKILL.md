---
name: pre-impl-audit
description: >-
  Forces an explicit consumer and docs audit before editing anything multiple readers depend
  on — schemas, state machines, templates, render paths, action signatures, public APIs,
  app-parsed YAML. Prevents 'I changed X but missed that Y also reads X'.
when_to_use: >-
  Before any contract-touching change. Skip for test-only, docs-only, one-line cosmetic
  changes, or net-new code with no callers. Triggers: before I edit, audit consumers, contract
  change, schema change, state machine, template change, render path, rename, refactor,
  rework, lifecycle.
---

# Pre-Implementation Audit

Run this checklist BEFORE the first Edit/Write call. Answer each section in plain text in your response. If you can't answer, the audit isn't done — don't skip it, finish it.

## When to use
Run this skill before editing code that touches:
- DB columns / Ash attributes / indexes / FKs
- Function signatures, action specs, API request/response shapes
- State machines (status enums, lock reasons, phase states)
- Content templates and placeholders (`{{var}}` interpolation, YAML config the app reads)
- Render output keys (assigns, props, JSON fields)
- Snapshot fields where authored content is copied into a row at create-time
- Multi-step lifecycles (circular FKs, after_transaction hooks, async workers)

## When NOT to use
- Test-only changes (adding/fixing a test, no behavior change)
- Docs-only changes
- Single-line cosmetic fixes (typo, log level, comment)
- Net-new code with no existing callers
- `/fix` on a small, well-understood change — but consider invoking anyway for content/template work

---

## Checklist

### 1. Contracts touched
List every contract this change modifies. A "contract" is anything other code depends on.

### 2. Consumers grepped
For each contract: state the `grep` commands you ran, name every callsite, and confirm each callsite is still correct under the new contract. "I assume yes" is not an audit — read the callsite.

### 3. Docs / solutions read
Search before touching the area:
- `docs/solutions/` — project post-mortems and known patterns
- `.claude/skills/<project>-patterns/` — project pattern catalog if it exists
- `docs/features/` — related plan docs
- Recent PRs for the same module

State which you read and what you applied. "None found" is a valid answer; "didn't check" is not.

### 4. Worst-case regression + detection
- What's the worst thing that could silently break? (Not "tests fail" — "users see X instead of Y.")
- How would you notice if it broke before merging?
- If the answer is "I wouldn't" — design a check before pushing.

### 5. Verification plan
State what you'll do AFTER coding, BEFORE committing:
- Run `/verify` to exercise the flow in the actual app?
- Browser walkthrough of the affected page?
- Manual repro of the original bug to confirm the fix lands?
- "Unit tests only, did not run in app" — state it explicitly so the user knows.

---

## Output format

Write the audit as a short bullet list in your response BEFORE the first Edit/Write. Example:

```
Audit:
- Contracts: SessionChallenge.challenge_content (snapshot, read by display_challenge_content)
- Consumers: assessment_live.ex display_challenge_content/2 (has prepend-scenario fallback that conflicts with this change). No other readers.
- Docs read: docs/solutions/challenge-content-snapshot.md — confirms snapshot is the source of truth post-create.
- Worst regression: scenario duplicated on render if fallback path fires. Detection: load any battery session locally and view a scenario challenge.
- Verification: /verify on a battery session, inspect rendered HTML for scenario duplication.
```

If the change is genuinely low-risk (e.g. one file, one consumer, no docs apply), state that — but state it explicitly:

```
Audit:
- Contracts: one helper function, no public callers
- Consumers: grep -r confirms no external readers
- Docs read: none apply (utility function, not a domain contract)
- Worst regression: helper returns wrong value → caller errors. Caught by existing test.
- Verification: run the test for the caller.
```

Honesty beats theatre. The point is to make the audit visible, not to perform it.

---

## Why this exists

The recurring failure mode this prevents:
- Bulk find-replace without grepping consumers → leaks raw template strings into rendered UI
- New feature added without checking the contract it depends on → circular FK violation, snapshot drift
- State machine extended without updating every reader → "interview done, rail says locked"
- Content/template edit without rendering the result → users see different text than the YAML diff suggested

These are not test failures. They are real bugs that ship and reach users because the agent shipped on green precommit without exercising the actual feature.
