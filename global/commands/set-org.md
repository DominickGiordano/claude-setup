# /set-org

Set the org conventions for this project. Copies the right org rules file to `.claude/rules/org.md`.

## Steps

### 1. Check for existing org.md
- Read `.claude/rules/org.md` if it exists
- If it has real content (not just the skeleton template comments), warn: "This project already has org rules configured. Overwrite? (yes/no)"
- If user says no, stop

### 2. List available orgs
Scan `~/.claude/../` to find the claude-setup repo, then list `examples/org-*.md` files. If that fails, use this hardcoded list:

Present as a numbered menu:

```
Available org configs:

1. arete    — Areté Capital Partners (Infisical, TF Cloud, Tailscale, Entra ID, aretecp)
2. xomware  — Xomware / personal projects (.env + platform env vars, Xomware GitHub org)
3. custom   — Start from blank skeleton
```

If `$ARGUMENTS` matches an org name (e.g. `/set-org arete`), skip the menu and use that directly.

### 3. Apply the selection

**For a named org (arete, xomware):**
- Read the matching `examples/org-{name}.md` from the claude-setup repo
- Write it to `.claude/rules/org.md` in the current project
- Show what was written (brief summary, not full file)

**For custom:**
- Copy the skeleton template to `.claude/rules/org.md`
- Tell the user to fill in: secrets manager, auth provider, cloud/infra, CI/CD, common mistakes

### 4. Confirm
```
Org rules set to: [name]
Loaded: secrets ([manager]), auth ([provider]), cloud ([details])

These rules load every session alongside domain-specific rules.
To change later: /set-org [name]
```

## Usage
```
/set-org              — interactive menu
/set-org arete        — set to Areté directly
/set-org xomware      — set to Xomware directly
/set-org custom       — blank skeleton
```

$ARGUMENTS
