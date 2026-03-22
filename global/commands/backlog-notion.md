# /backlog-notion

Create a task with subtasks on the project's PM board, a GitHub issue, and a branch.

**Reads PM config from `## Project Config` in the project's CLAUDE.md.** Requires `pm_tool: notion` and Notion fields to be configured.

## Steps

1. **Read Project Config** — extract `notion_datasource`, `notion_project`, `notion_goal`, `notion_pillar`, `notion_assignee`, `base_branch`, `github_issue_types` from CLAUDE.md
   - If any required Notion field is missing, tell the user which fields to add to Project Config

2. **Find the plan**: If `$ARGUMENTS` is a feature name, read `docs/features/$ARGUMENTS/PLAN.md`. If it's a description, use it directly.

3. **Extract task info**:
   - **Name**: concise task title (under 60 chars)
   - **Priority**: map to: `P1 - Critical`, `P2 - High`, `P3 - Medium`, `P4 - Low`
   - **Type**: `bug`, `enhancement`, or `documentation`
   - **Subtasks**: break the plan into concrete checklist items (verb-first)
   - **Status**: default `Not started`

4. **Format the page content** as Notion markdown:
   - One-line summary
   - `**Subtasks:**` with `- [ ]` checklist items
   - `**Context:**` with relevant technical details
   - `**Acceptance Criteria:**` if applicable

5. **Create the Notion task** using `mcp__claude_ai_Notion__notion-create-pages` with:
   - parent: `{"type": "data_source_id", "data_source_id": "{notion_datasource}"}`
   - properties from Project Config: Name, Status, Priority, Project, Goal, Pillar, Assignee

6. **Create the GitHub issue** using `gh issue create`:
   - Title: same as Notion task name
   - Body: description + subtasks + Notion task link
   - Labels: type + priority
   - If `github_issue_types` configured: set type via GraphQL

7. **Create a branch** off `base_branch` and push to remote:
   - Name: `{type}/{issue-number}-{short-kebab-description}`
   - `git fetch origin {base_branch} && git branch {branch} origin/{base_branch} && git push origin {branch}`

8. **Confirm** — show the user: Notion link, GitHub issue link + number, branch name

## Multiple Tasks
If the plan has multiple independent workstreams, create separate tasks. Ask the user if unclear.

## Without a Plan Doc
```
/backlog-notion Fix the heatmap click bug — P1
/backlog-notion Add search to pipeline page — P3
```

## Rules
- Always include subtasks — a task without subtasks is just a reminder
- Keep task names short and action-oriented
- Default priority is P3, default type is `enhancement`
- GitHub issue body must include Notion task link
- Notion task content must include GitHub issue link
- PRs should include "Closes #{issue}" in the description

$ARGUMENTS
