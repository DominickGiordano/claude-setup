# /backlog

Create a GitHub issue with subtasks and a branch. Optionally add to the project board.

**Reads PM config from `## Project Config` in the project's CLAUDE.md.**

## Steps

1. **Read Project Config** — extract `base_branch`, `github_project_number`, `github_issue_types` from CLAUDE.md

2. **Find the plan**: If `$ARGUMENTS` is a feature name, read `docs/features/$ARGUMENTS/PLAN.md`. If it's a description, use it directly.

3. **Extract task info**:
   - **Title**: concise issue title (under 60 chars)
   - **Priority**: map to labels: `P1-critical`, `P2-high`, `P3-medium`, `P4-low`
   - **Type**: `bug`, `enhancement`, or `documentation`
   - **Subtasks**: break the plan into concrete checklist items (verb-first)

4. **Create the GitHub issue** using `gh issue create`:
   - Title: task title
   - Body: description + subtasks as `- [ ]` checklist + context + acceptance criteria
   - Labels: type + priority
   - If `github_issue_types` configured: set type via GraphQL

5. **Add to project board** (if `pm_tool: github-projects`):
   - `gh project item-add {github_project_number} --owner {org} --url {issue_url}`
   - Set status to **Backlog** (or first column from `github_project_statuses` in Project Config)

6. **Create a branch** off `base_branch` and push to remote:
   - Name: `{type}/{issue-number}-{short-kebab-description}`
   - `git fetch origin {base_branch} && git branch {branch} origin/{base_branch} && git push origin {branch}`

7. **Confirm** — show the user: GitHub issue link + number, branch name, board status

## Multiple Tasks
If the plan has multiple independent workstreams, create separate issues. Ask the user if unclear.

## Without a Plan Doc
```
/backlog Fix the heatmap click bug — P1
/backlog Add search to pipeline page — P3
```

## Rules
- Always include subtasks — an issue without subtasks is just a reminder
- Keep titles short and action-oriented
- Default priority is P3, default type is `enhancement`
- PRs should include "Closes #{issue}" in the description

$ARGUMENTS
