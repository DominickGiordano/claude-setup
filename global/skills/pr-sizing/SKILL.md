---
name: pr-sizing
description: >-
  Break work into small, independently reviewable pieces and ship narrow PRs a human can
  actually read. Decompose and confirm the split before writing code. Docs get a larger line
  budget; logic does not.
when_to_use: >-
  Before starting any coding task larger than a one-line fix — features, refactors,
  migrations, bug fixes with unclear scope, anything phrased "build X" or "add support for
  Y". Also mid-task when a change is sprawling, and when opening a PR or writing issues.
  Triggers: how should we split this, this PR is getting big, break this up, scope.
---

# PR Sizing

A reviewer approves what they can hold in their head. Past a few hundred lines
of logic, review stops being review and becomes skimming with a rubber stamp —
which is exactly when a subtle bug ships with three approvals on it.

The job is not "make PRs small." It's **make each PR one idea**, and the small
size follows.

## Plan before you write

For any task bigger than a trivial fix, decompose first and show the plan. Do
not start coding a five-part change and reveal the shape of it at the end.

The output is a short numbered list. For each piece: what it does, roughly how
big, what it depends on.

```
1. Add `vendor_aliases` table + migration        ~40 lines    no deps
2. Alias lookup function + tests                 ~80 lines    needs 1
3. Wire lookup into the matching pipeline        ~50 lines    needs 2
4. Backfill script for existing vendors          ~60 lines    needs 1
5. Docs: matching methodology update            ~300 lines    needs 3
```

Then stop and let Dominick confirm the split before writing code. A wrong
decomposition caught in five lines of plan costs nothing; caught after four PRs
it costs a day.

`/plan` writes this list into the plan doc's implementation section. `/goals`
turns each piece into its own issue and PR.

## What makes a good split

**Each piece stands alone.** It merges, tests pass, nothing is broken. If piece
2 leaves the base branch half-using the new lookup, that's not a split — it's a
cliffhanger. Land new code unused first, flip the caller over next. That also
gives you a one-line revert.

**Vertical, not horizontal.** Split by capability, not by layer. "Model + query
+ endpoint for one entity" is reviewable. "All models," then "all queries," then
"all endpoints" means nobody can evaluate anything until the last PR.

**Refactor and behavior change never ride together.** The single most common
cause of an unreviewable diff. Move the code in one PR with zero logic change —
reviewer confirms it's a pure move and moves on. Change behavior in the next,
where the diff is five lines and every one is visible. Mixed, the real change
hides inside 400 lines of noise.

**Mechanical changes get their own PR.** Renames, formatter runs, import
reordering, dependency bumps, generated code, lockfiles. These are reviewed by
reading the command that produced them, not the diff. Never bury a logic change
inside one.

**Split on the seam where you'd want to revert.** If part of this ships badly at
2am, what's the smallest thing you'd want to yank? Cut there.

## Size budgets

Count only hand-written logic — application and pipeline code. Targets, not gates:

| Kind | Target | Stop and reconsider |
|---|---|---|
| Logic (app, pipeline, transforms) | ≤ 200 lines | > 400 |
| Tests for that logic | no limit, within reason | — |
| Documentation, comments, docstrings | ≤ 1000 lines | > 1500 |
| Generated files, lockfiles, fixtures, snapshots | excluded | — |
| Mechanical (rename, format, bump) | excluded, but its own PR | — |

`guard-bash.js` measures this at `gh pr create` time and asks for confirmation
past 400 logic lines. It is a prompt, not a gate — answer it with which of the
"when not to split" cases applies, or go split the PR.

Docs run long because prose is linear — a reviewer reads 800 words of a
methodology doc far faster than 200 lines of branching diff. So a docs PR can be
big, but it's still one topic. "Update the vendor matching methodology" is a PR.
"Rewrite all client-facing docs" is four.

Same for tests: a 400-line test file next to an 80-line function is fine,
because tests are read as a list of cases, not as control flow.

## When a PR outgrows its plan

You'll be halfway through piece 3 and discover it needs a refactor to piece 1.
Normal. Don't push through — that's how a 60-line PR becomes 500.

Stop, say what you found, offer the split:

> Wiring the lookup in needs the matcher to take a resolver argument, which
> touches 6 call sites. That's a separate mechanical PR before this one. Do that
> first, or keep going and hand you one bigger diff?

Stack the dependent PR on the first rather than merging everything into one
branch. Both still target `develop` — see `rules/git-discipline.md`.

## When not to split

Splitting costs branches, review round trips, and chances to leave the base
branch half-migrated. Keep it together when:

- The change genuinely doesn't work in pieces (a rename that must be atomic, a
  schema change and the code that reads it)
- Splitting would ship broken intermediate states
- It's mostly generated or mechanical anyway, so the real diff is already tiny
- The total is small enough that the overhead exceeds the benefit

Say which of these applies rather than silently shipping something big.

## Writing the issues

One issue per piece. Title states the outcome, two or three lines of context,
acceptance criteria concrete enough that "done" isn't a judgment call.
Dependencies noted explicitly. No effort estimates, no templated headings nobody
reads. `/issue new` and `/issue from-plan` follow this shape.

## Writing the PR

Use `/pr` — What / Why / Test, base `develop`, caps enforced by `guard-bash.js`.
