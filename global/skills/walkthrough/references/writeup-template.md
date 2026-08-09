# Write-up template

Write to `docs/walkthrough/<slug>.md`. Keep every anchor as `path:line` so it stays
clickable and greppable.

```markdown
# Walkthrough — [scope]

Date: YYYY-MM-DD
Scope: [whole repo | path | trace "..."]
Commit: [short sha at time of tour]
Stops: N · Flagged: M

## The shape of it

[3-5 sentences. What this code is for, and the one structural idea someone needs to hold
in their head to read the rest of it. Not a feature list — the mental model.]

## The spine

[The main path, in call order. One line per hop.]

  webhook POST  → beacon_web/router.ex:12
                → hook_controller.ex:18      no auth
                → Ingest GenServer:42        serializes everything
                → Normalizer.run/1:9
                → Repo.insert_all:71         batches of 500

## Stops

### 1. path/to/file.ex:12 — [what it is]

[What it does. Who calls it, what it calls.]

**Non-obvious:** [the thing that isn't visible from the file name or the function
signature — or "nothing hiding here"]

### 2. ...

## Friction

Things flagged during the tour. Observations, not verdicts — none of these have been
verified as bugs.

| # | Where | What | Note |
|---|-------|------|------|
| 1 | `ingest.ex:61` | Batch size 500 hardcoded | "tune later" comment dated 2024 |
| 2 | `normalizer.ex`, `normalize.ex` | Two implementations | Unclear which is live |
| 3 | `hook_controller.ex:18` | No auth on webhook endpoint | May be intentional — verify |

## Open questions

- [Anything the tour couldn't answer from the code alone. Be specific about what would
  answer it — a person, a commit, a running system.]
```

## Rules

- **Friction items are observations.** Do not write them as if they're confirmed defects.
  "No auth on this endpoint" is a fact; "this is a security hole" is a claim the tour
  didn't verify. Keep the distinction — it's what makes the section usable later.
- **Record the commit sha.** Line anchors rot. A reader six months out needs to know what
  the anchors were true of.
- **No fixes in the doc.** If a fix is obvious, it belongs in an issue or a plan, not here.
- **Updating an existing walkthrough:** keep the old stops that still hold, update the
  anchors that moved, and add a short `## Changed since [old date]` section at the top.
  Don't silently rewrite history — the diff between tours is itself information.
