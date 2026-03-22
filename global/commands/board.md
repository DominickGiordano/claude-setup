# /board

Fetch the current state of the project's kanban board. Shows what's active, what's next, and what's blocked.

**Reads `pm_tool` and related config from `## Project Config` in the project's CLAUDE.md.** If no PM config, show a message explaining how to set it up.

## Steps

### If `pm_tool: notion`

1. **Query the board**: Use `mcp__claude_ai_Notion__notion-query-database-view` on `notion_kanban_view` from Project Config. If that fails, use `mcp__claude_ai_Notion__notion-search` with the project name.

2. **Group and display** by status (use `notion_statuses` from Project Config for ordering):

   **ALWAYS use this table format for every section:**
   ```
   ### In Progress (N)
   | Task | Priority | Description | Subtasks |
   |------|----------|-------------|----------|
   | **Task name** | P1 Critical | One-line summary | 2/4 done |
   ```
   - Every section uses the same table — never switch to bullets or prose
   - Description = first line of the Notion page content
   - Subtasks = "N/M done" if checklist exists, "-" if none
   - Sort by priority within each table (P1 → P2 → P3)
   - Recently completed (Done): show last 5 only

3. **Summarize**:
   - Tasks per status
   - Highest priority Not started item
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
/board backlog      — just Not started items
/board blocked      — just blocked items
```

## Rules
- Keep output concise — this is a quick status check
- ALWAYS fetch page content for each task to get the description
- ALWAYS use table format — never bullets for task lists
- Sort by priority within each section

$ARGUMENTS
