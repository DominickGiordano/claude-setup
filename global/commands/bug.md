---
name: bug
description: "Capture a bug as a GitHub issue. Drafts a structured bug report from a description, checks for duplicates, and creates the issue with the bug label so the triage bot picks it up."
disable-model-invocation: true
---

Capture a bug as a GitHub issue. Use this the moment you spot a bug — even mid-flow on something else — so it gets a tracked issue instead of a sticky note.

## Steps

### 1. Gather context
- Parse `$ARGUMENTS` for the description.
- If the bug was discovered in the current session, pull useful context from the conversation: which file/function, what was expected, what actually happened, recent commands or stack traces.
- If the description is too thin to write a useful issue (no observed behavior, no repro, no scope), ask 1-2 targeted questions before drafting. Do NOT make up details.

### 2. Check for duplicates
- Search recent open issues: `gh issue list --state open --label bug --search "{keywords}" --limit 20`
- If a likely duplicate exists, show it to the user and ask whether to:
  - **Add a comment** to the existing issue with the new info (`gh issue comment {existing} ...`), OR
  - **Create a new issue anyway** (the user knows it's distinct)

### 3. Draft the issue
Build title and body. Title: short, present-tense, observable behavior — not a fix. Body uses this template:

```markdown
## Summary
{1-2 sentences — what's broken from the user/caller's perspective}

## Steps to Reproduce
1. {step}
2. {step}

## Expected
{what should happen}

## Actual
{what actually happens — include error messages / stack traces verbatim}

## Environment
- Branch / commit: {if relevant}
- OS / runtime: {if relevant}

## Files / Areas Likely Involved
- `path/to/file` — {why}

## Notes
{anything else worth flagging — guesses at root cause, related issues, severity}
```

Drop sections that aren't applicable rather than filling them with "N/A" noise.

### 4. Confirm before creating
- Show the user the drafted title and body.
- Ask: "Create this issue? (y / edit / cancel)"
- On `edit`, take the user's revisions and re-show.
- On `cancel`, stop — do not create anything.

### 5. Create the issue
```bash
gh issue create \
  --title "{title}" \
  --body "$(cat <<'EOF'
{body}
EOF
)" \
  --label bug
```

- If the user gave a priority hint ("this is critical", "low pri"), also pass `--label P1-critical` / `P2-high` / `P3-medium` / `P4-low`. Otherwise let the triage bot decide.
- Do NOT assign — leave it unassigned so the user can decide whether to pick it up.
- Do NOT create a branch. Branch creation happens in `/work-issue` when work starts.

### 6. Report back
Output:
```
Created issue #{N}: {title}
URL: {url}

Triage bot will run automatically. To start work:
  /work-issue {N}
```

## Rules
- ALWAYS ask before creating the issue — never silently file a bug
- ALWAYS check for duplicates first
- NEVER create a branch from this command — that's `/work-issue`'s job
- NEVER fix the bug here — this command only files the issue. If the user wants to fix it now, point them at `/fix` or `/work-issue {N}` after creation
- Keep the report focused on observed behavior, not speculative fixes

## Usage
```
/bug login button does nothing on Safari when 2FA is enabled
/bug coverage calc returns NaN for empty portfolios — saw it in tests/coverage.test.ts
/bug
```
The bare `/bug` form will prompt for the description.

$ARGUMENTS
