# /status

Show the current state of all plan docs in this project.

## Steps

1. Glob for `docs/plans/*.md`
2. For each plan doc, read the frontmatter/header to extract:
   - **Title** (from `# ` heading or `title:` frontmatter)
   - **Status** (from `Status:` line — Draft, Ready, In Progress, Blocked, Done)
   - **Last modified** (from git or file timestamp)
3. Display a table sorted by status (In Progress first, then Ready, Blocked, Draft, Done)
4. If there are spike docs in `docs/spikes/`, list those too with a one-line summary
5. If `docs/solutions/` exists, show a count per category

## Output Format

```
## Plans
| Status | Plan | Last Updated |
|--------|------|-------------|
| 🔵 In Progress | feature-name | 2026-03-09 |
| 🟢 Ready | other-feature | 2026-03-08 |
| ⚪ Draft | idea | 2026-03-07 |
| ✅ Done | completed-thing | 2026-03-05 |

## Spikes (N)
- topic-name — one-line summary

## Solutions (N total)
- auth: 3 docs
- deployment: 2 docs
```

If no plan docs exist, say so and suggest `/brainstorm` or `/plan` to get started.

$ARGUMENTS
