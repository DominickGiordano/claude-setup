---
name: issue
description: "GitHub issue lifecycle — create bugs, file new feature/task issues, update existing issues, or backlog from a plan doc. Subcommand-style: /issue bug | new | update | from-plan."
disable-model-invocation: true
---

GitHub issue lifecycle. Dispatches on the first arg:

```
/issue bug <description>           — file a bug (formerly /bug)
/issue new <description>           — file a feature/task issue (formerly /backlog)
/issue from-plan <feature-name>    — file an issue from docs/features/<name>/PLAN.md
/issue update <number-or-search>   — update an existing issue (formerly /update-issue)
```

If the first arg is missing or unrecognized, print this usage and exit.

**Reads PM config from `## Project Config` in the project's CLAUDE.md** for all subcommands.

---

## Subcommand: `bug`

Capture a bug as a GitHub issue. Use this the moment you spot a bug.

### 1. Gather context
- Parse the rest of `$ARGUMENTS` for the description.
- Pull useful context from the current session: which file/function, expected vs actual, recent commands or stack traces.
- If the description is too thin (no observed behavior, no repro), ask 1-2 targeted questions before drafting. Do NOT make up details.

### 2. Check for duplicates
- `gh issue list --state open --label bug --search "{keywords}" --limit 20`
- If a likely duplicate exists, ask: comment on the existing one, or create new anyway?

### 3. Draft

```markdown
## Summary
{1-2 sentences — what's broken from the user/caller's perspective}

## Steps to Reproduce
1. {step}

## Expected
{what should happen}

## Actual
{what actually happens — error messages / stack traces verbatim}

## Environment
- Branch / commit: {if relevant}
- OS / runtime: {if relevant}

## Files / Areas Likely Involved
- `path/to/file` — {why}

## Notes
{root-cause guesses, severity, related issues}
```

Drop sections that don't apply.

### 4. Confirm before creating
Show the user the drafted title and body. Ask: `(y / edit / cancel)`. On `cancel`, stop.

### 5. Create
```bash
gh issue create --title "{title}" --body "$(cat <<'EOF'
{body}
EOF
)" --label bug
```

Add `--label P1-critical` / `P2-high` / `P3-medium` / `P4-low` if user gave a priority hint. Otherwise let triage decide. Do NOT assign. Do NOT create a branch — that's `/work-issue`'s job.

### 6. Report
```
Created issue #{N}: {title}
URL: {url}

Triage bot will run automatically. To start work:
  /work-issue {N}
```

### Rules (bug)
- ALWAYS ask before creating — never silently file a bug
- ALWAYS check for duplicates first
- NEVER create a branch from this subcommand
- NEVER fix the bug here — only file the issue. Point at `/fix` or `/work-issue {N}` after creation.

---

## Subcommand: `new`

Create a GitHub issue with subtasks. Optionally add to the project board.

### 1. Read Project Config
Extract `base_branch`, `github_project_number`, `github_issue_types` from CLAUDE.md.

### 2. Extract task info from `$ARGUMENTS`
- **Title**: concise (under 60 chars)
- **Priority**: map to labels: `P1-critical`, `P2-high`, `P3-medium` (default), `P4-low`
- **Type**: `enhancement` (default) | `bug` | `documentation`
- **Subtasks**: break the description into concrete checklist items (verb-first)

### 3. Create with `gh issue create`
- Title + body (description + `- [ ]` subtasks + acceptance criteria)
- Labels: type + priority
- If `github_issue_types` configured: set type via GraphQL

### 4. Add to project board (if `pm_tool: github-projects`)
- `gh project item-add {github_project_number} --owner {org} --url {issue_url}`
- Status: **Backlog** (or first column from `github_project_statuses`)

### 5. Confirm
Show the user: issue link + number, board status. Do NOT create a branch — `/work-issue` does that.

### Rules (new)
- Always include subtasks — an issue without subtasks is just a reminder
- Keep titles short and action-oriented
- Default priority is P3, default type is `enhancement`
- PRs should include `Closes #{issue}` in the description

---

## Subcommand: `from-plan`

Same as `new`, but the source is a plan doc.

### 1. Read the plan
- `$ARGUMENTS` = feature name → read `docs/features/{feature-name}/PLAN.md`
- If the plan has multiple independent workstreams, ask the user whether to create separate issues.

### 2. Build issue body
- Title: from plan `# ` heading
- Subtasks: from plan's task list (numbered steps → `- [ ]` checklist)
- Priority: infer from plan or ask
- Add a link back to the plan: `Plan: docs/features/{feature-name}/PLAN.md`

### 3. Continue as `new` from step 3 onward
Create, add to board, confirm.

---

## Subcommand: `update`

Update an existing issue — comment, label, close, or move on the board.

### 1. Find the issue
- If `$ARGUMENTS` after `update` is a number, use it.
- Otherwise: `gh issue list --search "{rest}" --json number,title` and ask which one.

### 2. Fetch
`gh issue view {number} --json title,body,labels,assignees,comments,state`

### 3. Determine the update
Look at conversation context, recent git changes, or ask:
- Any progress to report?
- Status change on the project board?
- Labels to add/remove?
- Close the issue?

### 4. Post a progress comment if there's something to report
```bash
gh issue comment {number} --body "{update content}"
```

### 5. Update project board status (if `pm_tool: github-projects`)
- `gh project item-list {github_project_number} --owner {org} --format json` → find the matching item
- Update status field to the target column (Backlog / Ready / In Progress / In Review / Done — per `github_project_statuses`)

### 6. Update labels / state if needed
- `gh issue edit {number} --add-label {label}` / `--remove-label {label}`
- `gh issue close {number}` — only after confirming with the user

### 7. Confirm
Show what changed.

### Rules (update)
- Read the issue BEFORE updating — make targeted edits
- Don't close issues without confirming with the user
- Post a comment explaining status changes — don't just silently move cards
- Show what changed before confirming

---

$ARGUMENTS
