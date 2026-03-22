# /update-notion-task

Find a task on the project's Notion board and update it — check off subtasks, change status, add notes.

**Reads PM config from `## Project Config` in the project's CLAUDE.md.** Requires `pm_tool: notion`.

## Steps

1. **Find the task**: Search Notion for the task by name using `mcp__claude_ai_Notion__notion-search` with query `$ARGUMENTS` and `query_type: "internal"`.
   - If multiple results, show them and ask which one
   - If no results, ask the user to clarify

2. **Fetch the task**: Use `mcp__claude_ai_Notion__notion-fetch` to get current content and properties.

3. **Determine what to update**: Look at conversation context, recent git changes, or ask:
   - Which subtasks were completed?
   - Any new subtasks to add?
   - Status change needed?
   - Any notes to append?

4. **Update content**: Use `mcp__claude_ai_Notion__notion-update-page` with `update_content`:
   - Check off completed subtasks: `- [ ]` → `- [x]`
   - Add new subtasks that emerged
   - Append notes if relevant

5. **Update properties** (if needed): Use `update_properties`:
   - `Status`: match actual state (use `notion_statuses` from Project Config for valid values)
   - `Priority`: if urgency changed

6. **Confirm** — show what was updated with link.

## Usage
```
/update-notion-task BD Pulse stat cards — checked off coverage bug, moved to In Progress
/update-notion-task Auth — mark backfill guard done
/update-notion-task Dashboard — all done, close it out
```

## Without Arguments
If called without arguments, look at what was worked on in the current session and suggest which task(s) to update.

## Rules
- Fetch task content BEFORE updating — make targeted edits
- Don't change subtasks the user didn't work on
- **Update content BEFORE status** — never flip to Done without content changes
- If work revealed new tasks, offer to create via `/backlog-notion`
- Always show what changed before confirming

$ARGUMENTS
