# /update-issue

Update a GitHub issue — add comments, change labels, close, or move on the project board.

**Reads PM config from `## Project Config` in the project's CLAUDE.md.**

## Steps

1. **Find the issue**: If `$ARGUMENTS` is a number, use it directly. Otherwise search: `gh issue list --search "$ARGUMENTS" --json number,title` and ask which one.

2. **Fetch the issue**: `gh issue view {number} --json title,body,labels,assignees,comments,state`

3. **Determine what to update**: Look at conversation context, recent git changes, or ask:
   - Any progress to report?
   - Status change needed? (move on project board)
   - Labels to add/remove?
   - Close the issue?

4. **Post a comment** if there's progress to report:
   ```bash
   gh issue comment {number} --body "{update content}"
   ```

5. **Update project board status** (if `pm_tool: github-projects`):
   - Get the item on the project: `gh project item-list {github_project_number} --owner {org} --format json`
   - Find the item matching this issue
   - Update status field to the target column (use `github_project_statuses` from Project Config — e.g. Backlog, Ready, In Progress, In Review, Done)

6. **Update labels/state** if needed:
   - `gh issue edit {number} --add-label {label}` / `--remove-label {label}`
   - `gh issue close {number}` (only if work is complete)

7. **Confirm** — show what was updated.

## Usage
```
/update-issue 85 — moved to In Progress, posted progress note
/update-issue 42 — mark blocked, need API access
/update-issue auth bug — search and update
```

## Without Arguments
If called without arguments, look at what was worked on in the current session and suggest which issue(s) to update.

## Rules
- Read the issue BEFORE updating — make targeted edits
- Don't close issues without confirming with the user
- Post a comment explaining status changes — don't just silently move cards
- Always show what changed before confirming

$ARGUMENTS
