---
name: board
description: "Fetch the current state of the project's kanban board. Shows what's active, what's next, and what's blocked."
disable-model-invocation: true
---

Fetch the current state of the project's kanban board. Shows what's active, what's next, and what's blocked.

**Reads `pm_tool` and related config from `## Project Config` in the project's CLAUDE.md.** If no PM config, show GitHub issues grouped by label.

## Steps

### If `pm_tool: github-projects`

1. **Query the board**: Use `gh project item-list {github_project_number} --owner {org} --format json` to get all items with status, title, and metadata.

2. **Group and display** by status columns (use `github_project_statuses` from Project Config for ordering, default: `[Backlog, Ready, In Progress, In Review, Done]`):

   **ALWAYS use this table format for every section:**
   ```
   ### In Progress (N)
   | Issue | Priority | Description | Assignee |
   |-------|----------|-------------|----------|
   | **#42 Task name** | P1 Critical | One-line summary | @user |
   ```
   - Every section uses the same table — never switch to bullets or prose
   - Sort by priority within each table (P1 → P2 → P3 → P4)
   - Recently completed (Done): show last 5 only

3. **Summarize**:
   - Items per status
   - Highest priority Todo item
   - Any blocked items
   - Suggest what to work on next

### If `pm_tool: none` or not set

Show GitHub issues instead:
```
gh issue list --state open --json number,title,labels,assignees
```
Group by labels (bug, enhancement, etc.) and display in table format.

## Usage
```
/board              — full board overview
/board in-progress  — just what's active
/board blocked      — just blocked items
/board todo         — just Todo items
```

## Rules
- Keep output concise — this is a quick status check
- ALWAYS use table format — never bullets for task lists
- Sort by priority within each section

$ARGUMENTS
