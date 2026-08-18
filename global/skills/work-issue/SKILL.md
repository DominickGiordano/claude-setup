---
name: work-issue
description: "Full dev cycle orchestrator. Takes a GitHub issue number, loads all context, plans the work, and closes the loop."
disable-model-invocation: true
argument-hint: "[issue-number]"
---

Full dev cycle orchestrator. Takes a GitHub issue number, loads all context, plans the work, and closes the loop.

**Reads project-specific config from the `## Project Config` block in the project's CLAUDE.md.** If no config exists, ask the user for base branch and test commands.

## Steps

### 1. Load Context
- Fetch the GitHub issue with ALL comments: `gh issue view {number} --json title,body,labels,assignees,comments`
- **Read ALL comments** — look for CI triage bot analysis with: type, priority, scope, suggested branch name, files involved, recommended approach.
- If no triage comment exists, derive a branch name yourself.
- **Assign to current user** if not already assigned: `gh issue edit {number} --add-assignee "@me"`
- **Backfill type label** if missing (`bug`, `enhancement`, or `documentation`): classify from the issue content and add via `gh issue edit {number} --add-label {type}`
- Show the user a summary: title, type, priority, triage findings.

### 2. Checkout & Rebase
- Read `base_branch` from Project Config (default: `develop`, fallback `main`).
- Determine `{branch}` name from the triage suggestion or derive `{type}/{number}-{short-desc}`.

**`/work-issue` creates the branch.** Triage only suggests names.

1. `git fetch origin`
2. `git checkout {base_branch} && git pull origin {base_branch}`
3. **Create or resume**:
   - Existing on origin (resuming): `git checkout {branch} --track origin/{branch}` (or `git checkout {branch} && git branch -u origin/{branch}` if local exists)
   - New (common case): `git checkout -b {branch} {base_branch}`
4. If branch had prior commits: `git rebase {base_branch}`. On conflict, stop and ask.

> Do NOT use `git checkout -b {branch} origin/{branch}` to track a remote — it doesn't set tracking. Use `--track`.

### 3. Post Work Plan to Issue

Post the plan as a comment before coding. Mandatory. Keep it scannable — a
reader should get the scope from line one. `writing-style.md` caps issue
comments at 15 lines.

```bash
gh issue comment {number} --body "$(cat <<'EOF'
## Plan — `{branch-name}`

{One line: what changes and why.}

- [ ] {Concrete step, verb-first}
- [ ] {Concrete step, verb-first}
- [ ] Tests + verify

**Watch out:** {non-obvious thing found during analysis, or omit the line}
EOF
)"
```

Dropped on purpose: `Date Started` (GitHub timestamps the comment), and a
separate `Approach` section (the checklist already is the approach — writing
both means writing it twice).

If `pm_tool: github-projects`, also move the issue card on the project board to **In Progress** (use `github_project_statuses` from Project Config). Add to the project first if it isn't there: `gh project item-add {github_project_number} --owner {org} --url {issue_url}`.

### 4. Dispatch — analysis + classification

Invoke the `dispatcher` agent with the issue context. It returns:

```
Scope:       small / medium / large
Domain:      Frontend | Backend | Infra | iOS | Multi: X + Y
Specialist:  <agent name> | none
Skills:      <list>
Files:       <list with reasons>
Recommended approach: /fix | /plan | /brainstorm
```

Show the dispatcher's output verbatim. Ask the user to confirm domain and approach before proceeding. If the dispatcher returns `Unclear`, ask clarifying questions.

### 5. Do the Work

Execute the dispatcher's recommendation:

- **Small scope (`/fix`)**: load the recommended skills in the main session and implement directly.
- **Medium/large scope (`/plan` or `/brainstorm`)**: after the plan is written and approved, delegate to the recommended specialist agent.
- **iOS work**: load `ios-standards` skill directly — there is no iOS specialist agent.
- **Multi-domain**: handle the primary domain's specialist first, then the secondary in a follow-up step.

Always:
- Run each command in `test_commands` from Project Config after changes.
- Run each command in `build_commands` from Project Config if relevant files changed.
- Apply `rules/code-style.md` and `rules/pr-sizing.md`. Both always load, and both
  apply whether or not the dispatcher named a skill.
- If the diff passes ~400 lines of hand-written logic, stop and offer the split
  rather than finishing the issue in one branch.

### 6. Review
- Show a summary of all files changed and why.
- Run tests/linting one final time.
- Ask the user if they want to review before committing.

### 7. Commit & Push
- Stage the relevant files (skip `.env`, credentials).
- Commit with a clear message — only tag issue number if directly related.
- **Do NOT push.** Show the user the commit and let them push: `git push origin {branch-name}`.

### 8. Completion Update — MANDATORY

> **NOT OPTIONAL.** Every work-issue session MUST end with a completion comment on the issue.

```bash
gh issue comment {number} --body "$(cat <<'EOF'
## Done

- `{path/to/file.ts}` — {what changed, one clause}
- `{path/to/other.ex}` — {what changed, one clause}

**Root cause:** {bug fixes only — what was actually wrong. Omit otherwise.}

**Follow-ups:** {problems found that were NOT this task — one line each, with
the new issue number if filed. Omit the line if none.}
EOF
)"
```

The file path carries the "where", so a separate `Files Changed` section
repeated every line. `Issues Encountered` is gone: if a problem changed the
approach it belongs in `Done`; if it was resolved and left no trace, nobody
reading the issue in six months needs it.

If `pm_tool: github-projects`, move the card:
- Ready for review → **In Review**
- ALL work done → **Done**
- Partially done → keep **In Progress**, note what's left
- Blocked → note the blocker in a comment

For discovered issues: offer to file new GitHub issues — don't let them get lost.

### 9. Wrap Up
Ask the user:
- **Continue?** Pick up another issue (`/work-issue {next}`)
- **End session?** Run `/end-session` to save learnings
- **Compound a pattern?** Ask the `compounder` agent to capture it

## Usage
```
/work-issue 85          — work on issue #85
```

## Rules
- ALWAYS invoke the `dispatcher` for analysis + classification (step 4) — don't reinvent the logic here.
- ALWAYS rebase onto latest base branch before starting.
- ALWAYS run `test_commands` after changes.
- ALWAYS post a work plan comment BEFORE starting implementation (step 3).
- ALWAYS post a completion comment AFTER finishing work (step 8) — the #1 most-skipped step.
- NEVER push without showing the user what's being pushed.
- NEVER skip the completion update — not for "small" changes, not for "quick" fixes.
- If the issue is bigger than expected (10+ files, architectural decisions), stop and recommend breaking into sub-issues.

$ARGUMENTS
