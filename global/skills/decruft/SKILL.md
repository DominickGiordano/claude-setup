---
name: decruft
description: "Sweep existing code for the shapes rules/code-style.md bans — comments restating the line, no-recovery try/except, one-method classes, single-caller wrappers, dead flags. Reports first, applies only on approval."
disable-model-invocation: true
argument-hint: "[path] [--apply] [--tier comments|dead|structure]"
---

Sweep already-written code against `~/.claude/rules/code-style.md`. Report every
shape found, then apply only what Dominick approves.

Never fires on its own — a sweep is a deliberate operation, and the diff it
produces is pure deletion, which is exactly the diff nobody reads carefully.

## Step 0 — Scope

`$ARGUMENTS` is a path: a file, a directory, or a glob. No path given → ask for
one. Do NOT sweep a whole repo in one pass; that's an unreviewable diff and it
violates `pr-sizing`. Suggest the largest subdirectory instead.

Skip: generated files, vendored code, lockfiles, snapshots, migrations, anything
matching `.gitignore`. Say what you skipped and why.

## Step 1 — Find the shapes

Read every file in scope. Record `file:line` for each hit, in three tiers:

**Tier 1 — comments** (pure deletion, no behavior risk)
- Comment restating the line below it
- `// Step 1:` / `# Step 2:` scaffolding narration
- Comment repeating the function name above the function
- Docstring that only lists the argument names and their types
- Commented-out code, `# OLD:` blocks

**Tier 2 — dead** (deletion, verified by tests)
- Log lines narrating control flow ("Starting X", "X complete")
- Parameters no caller passes, config flags nothing flips
- `**kwargs` passthrough nothing uses
- Functions and constants with zero callers — grep to confirm, including tests
  and string references (dynamic dispatch, DI containers, template names)
- Banner prints, emoji output, `print("=" * 60)`

**Tier 3 — structure** (a real refactor, one at a time)
- `try/except` with no recovery action — let it crash
- Class whose methods never touch `self` → module functions
- Class with one method → function
- Config object or dataclass holding fewer than three fields → arguments
- Wrapper called from exactly one place → inline it
- Defensive nesting against hypotheticals the data can't produce
- Indentation past three levels → guard clauses

## Step 2 — Report

Group by tier, not by file. For each hit: `file:line`, the shape, and what the
line does now. No fix text for tier 1 — "delete" is the fix.

```
Tier 1 — comments (14)
  src/match.py:22    restates `total = sum(prices)`
  src/match.py:57    "# Step 3:" scaffolding
  ...

Tier 3 — structure (2)
  src/load.py:8      try/except returns None, 3 callers each re-check for None
  src/report.py:41   ReportConfig holds 2 fields, 1 construction site
```

Then stop. Give the counts and ask which tiers to apply. `--apply` skips this
gate for tiers 1 and 2 only; tier 3 always gets confirmed hit by hit.

## Step 3 — Apply

One commit per tier, never mixed, never alongside a behavior change:

1. Tier 1 — delete. Run the test suite; it must pass unchanged.
2. Tier 2 — delete. Run the test suite. A "dead" function whose deletion breaks
   a test was not dead — restore it and say so in the report.
3. Tier 3 — one shape per commit. Behavior must be identical. If a change alters
   behavior even slightly (an exception now propagates where it was swallowed),
   that is a separate decision — surface it, don't bundle it.

Test command comes from the project's `## Project Config` block. No test suite →
say so up front, and treat tier 2 and 3 as report-only. Deleting unverifiable
code is how a sweep breaks production.

## Never delete

- The comment explaining the weird thing — a constraint, an upstream bug, a
  decision that looks wrong but isn't. If a comment says *why*, it stays.
- Anything you cannot prove is unreferenced. Dynamic dispatch, reflection,
  string-keyed registries, and template lookups don't show up in a grep for the
  symbol.
- Error handling with a real recovery path — a retry, a skip-and-count, a
  fallback the user asked for.
- Tests, fixtures the tests use, or public API surface other repos import.

When unsure, list it in the report and leave it. An unswept line costs nothing;
a wrongly deleted one costs an incident.

## Output

Counts per tier, the commits made, test status. One or two sentences. No summary
section — see `rules/writing-style.md`.

$ARGUMENTS
