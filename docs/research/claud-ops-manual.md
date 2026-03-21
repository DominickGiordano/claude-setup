# Claude Code Operations Manual
> This document is addressed directly to you, Claude.
> When you read this, treat it as your operating instructions for managing configuration
> across the global `~/.claude/` setup and any per-repo `.claude/` setup you encounter.
> Follow these instructions precisely. Do not infer — execute.

---

## Who You Are Working With

You are working with a senior software engineer who:
- Values speed and accuracy above all else
- Wants a plan before any code or file changes
- Expects short, direct communication — no filler, no fluff
- Trusts you to surface gaps, flag risks, and challenge thin logic
- Treats `.claude/` configuration like production infrastructure

When in doubt: **ask, don't assume. Plan, don't execute blindly.**

---

## Table of Contents

1. [Two-Layer Architecture](#two-layer-architecture)
2. [Managing the Global Config](#managing-the-global-config)
3. [Setting Up a New Repo](#setting-up-a-new-repo)
4. [Updating Existing Configs](#updating-existing-configs)
5. [File Reference & Templates](#file-reference--templates)
6. [Decision Rules](#decision-rules)
7. [Anti-Patterns — Never Do These](#anti-patterns--never-do-these)

---

## Two-Layer Architecture

There are exactly two config layers. Never conflate them.

| Layer | Location | Scope | Committed? |
|---|---|---|---|
| Global | `~/.claude/` | Every session, every project | Config repo only |
| Project | `<repo>/.claude/` | That repo only | Yes — team-shared |
| Personal overrides | `*.local.*` files | This machine only | Never |

**Assignment rules — apply these every time you place a file:**

- **Global** → engineer identity, universal code quality rules, personal workflow preferences, cross-project commands and agents
- **Project** → how this specific repo works, repo-specific commands, path-scoped rules, project agents
- **Local override** → machine-specific settings, personal deviations from team config, never team-facing

If you are unsure which layer something belongs to, ask before placing it.

---

## Managing the Global Config

### When to Update the Global Config

Update `~/.claude/CLAUDE.md` when:
- A preference or rule has proven to apply across **every** project worked on
- A lesson learned is universal, not repo-specific
- The engineer explicitly asks you to remember something globally

Do **not** update the global config when:
- The rule only applies to one repo or one stack
- You are not certain the preference is universal
- The session hasn't surfaced enough signal yet

### How to Update `~/.claude/CLAUDE.md`

1. Read the current file first — always
2. Identify what is changing: new rule, correction, removal, or addition
3. Present the proposed diff to the engineer before writing anything
4. Get explicit approval
5. Make the change
6. Confirm the line count is still under 150 lines

If the file would exceed 150 lines after your change, flag it and propose what to move to a command, skill, or agent instead.

### How to Update `~/.claude/settings.json`

1. Read the current file first
2. Propose the specific `allow` or `deny` entry to add or remove
3. Explain why
4. Get approval before writing

**Never remove an existing `deny` rule without explicit instruction.** When in doubt, add to the deny list, not the allow list.

### How to Add a Global Command

A global command belongs in `~/.claude/commands/` when it is useful across multiple unrelated projects.

Before creating one:
- Confirm there is no existing command that does the same thing (`list ~/.claude/commands/`)
- Name the file after the action, not the tool: `review.md` not `github-pr.md`
- Keep the command prompt tight — one job per command

After creating it, tell the engineer: the command name, what it does, and how to invoke it.

### How to Add a Global Agent

A global agent belongs in `~/.claude/agents/` when:
- The persona is useful across projects (e.g. code reviewer, security auditor)
- The task benefits from an isolated context window
- You want to restrict tools for safety (read-only agents, etc.)

Always set `tools` explicitly. Never leave it open-ended. A read-only agent gets `Read, Grep, Glob` and nothing else.

---

## Setting Up a New Repo

When the engineer asks you to set up Claude config for a new repo, follow these steps in order. Do not skip steps. Do not proceed to the next step without completing the current one.

### Step 1 — Understand the Repo

Before creating any files, read:
- `README.md` or equivalent
- `package.json`, `pyproject.toml`, `mix.exs`, `go.mod`, or whatever defines the project
- Any existing CI config (`.github/workflows/`, `Makefile`, etc.)
- Any existing `.claude/` files if present

Then tell the engineer what you found:
- What the project does
- How to build, test, and run it
- Any non-obvious structure or gotchas you spotted
- What you propose to put in each config file

**Do not create any files until the engineer confirms your read is correct.**

### Step 2 — Draft `CLAUDE.md`

Write a draft `CLAUDE.md` for the repo root. Use this structure:

```markdown
# [Project Name]

## Commands
[build]     # description
[test]      # description
[lint]      # description
[dev]       # description

## Architecture
- [runtime and key version]
- [database or data layer]
- [key directories and what lives in them]
- [anything non-obvious about the structure]

## Conventions
- [validation approach]
- [error handling pattern]
- [logging convention]
- [return shape or API contract]

## Watch Out For
- [env or setup requirement that will bite someone]
- [strict setting that causes surprising errors]
- [anything that looks like a bug but is intentional]
```

Hard rules:
- Maximum 200 lines
- Imperative bullets only — no paragraphs
- No rules that belong in a linter or formatter config
- No generic rules that apply everywhere — those live in `~/.claude/CLAUDE.md`

Present the draft. Get approval. Then write the file.

### Step 3 — Create `.claude/settings.json`

Start from this baseline and adjust for the project's stack:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash([run command] *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push *)",
      "Bash(git reset --hard *)",
      "Bash(git clean *)",
      "Bash(curl *)",
      "Bash(wget *)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(**/secrets/**)"
    ]
  }
}
```

Replace `[run command]` with the actual run command for this stack.

The `.env` deny rules and destructive git command denials are **non-negotiable**. They stay in every project config, no exceptions.

Present the proposed `settings.json` to the engineer before writing.

### Step 4 — Identify Rules to Split Out

Review the `CLAUDE.md` draft. If any section:
- Only applies to files in a specific directory → move it to a path-scoped rule in `.claude/rules/`
- Is long enough to have its own lifecycle → move it to a named rule file

Create rule files with this frontmatter when path-scoping:

```markdown
---
paths:
  - "src/api/**"
  - "src/handlers/**"
---
# [Rule Name]

[rules here]
```

Rule files without a `paths` field load every session. Use them for concerns that apply everywhere in the repo but are too detailed for `CLAUDE.md`.

### Step 5 — Identify Commands Worth Creating

Ask the engineer: what are the 2–3 most repetitive tasks you do in this repo?

Good command candidates:
- Review the current branch diff before a PR
- Pull a ticket/issue and implement a fix
- Run a pre-deploy checklist specific to this project
- Generate a migration or schema change

Create each as `.claude/commands/[name].md`. If the command needs dynamic input, use `$ARGUMENTS`.

Limit to what is actually needed now. Do not pre-build commands speculatively.

### Step 6 — Identify Skills or Agents to Create

Only create a skill or agent if:
- There is a clearly recurring workflow that needs bundled reference files (skill) or an isolated context window (agent)
- The engineer confirms it is worth the setup cost

If in doubt, a command is almost always sufficient. Skills and agents are for complex, reusable workflows — not one-off tasks.

### Step 7 — Add Gitignore Entries

Ensure these are in `.gitignore`:
```
CLAUDE.local.md
.claude/settings.local.json
```

If the repo doesn't have a `.gitignore`, create one.

### Step 8 — Confirm and Summarize

After all files are written, give the engineer a summary:
- Files created and their locations
- What each file does
- How to invoke any commands you created
- Any open questions or things to revisit as the project evolves

---

## Updating Existing Configs

### When the Engineer Says "Update the Claude Config"

1. Read all existing config files before proposing anything
2. Identify what is stale, missing, or wrong
3. Present a proposed changeset — file by file, change by change
4. Get approval
5. Execute

Never make changes to multiple files in one step without presenting the full plan first.

### When a Rule Keeps Getting Violated

If Claude is repeatedly making the same mistake in a project, that is a signal the rule is missing or too vague in `CLAUDE.md` or `rules/`.

Propose adding or sharpening the rule. Be specific. A vague rule ("be careful with auth") is useless. A concrete rule ("never write auth middleware inline — always use the `middleware/auth.ts` module") is enforceable.

### When `CLAUDE.md` is Getting Too Long

If `CLAUDE.md` is approaching 200 lines:
1. Identify which sections are path-scopeable → move to `.claude/rules/` with frontmatter
2. Identify which sections are generic/universal → move to `~/.claude/CLAUDE.md`
3. Identify which sections can become a command or skill → extract them

Present the refactor plan before executing.

### When a Config Feels Stale

Signs a config needs a refresh:
- Claude is asking clarifying questions it should already know the answer to
- Commands reference scripts or paths that no longer exist
- The architecture section no longer reflects how the project is structured
- Rules reference patterns that were replaced

Bring this up proactively. Don't wait for the engineer to notice.

---

## File Reference & Templates

### Global File Map

```
~/.claude/
├── CLAUDE.md                    # Engineering identity and universal preferences
├── settings.json                # Conservative global permissions
├── commands/                    # /user:command-name
│   ├── commit.md                # Generate conventional commit messages
│   ├── review.md                # Structured code review
│   └── standup.md               # Standup summary from git activity
├── skills/                      # Personal cross-project workflows
│   └── [skill-name]/
│       └── SKILL.md
├── agents/                      # Personal subagent personas
│   ├── code-reviewer.md
│   └── security-auditor.md
└── projects/                    # Auto-managed session memory — do not edit manually
```

### Project File Map

```
<repo>/
├── CLAUDE.md                    # Team instructions — committed
├── CLAUDE.local.md              # Personal overrides — gitignored
└── .claude/
    ├── settings.json            # Project permissions — committed
    ├── settings.local.json      # Personal permission overrides — gitignored
    ├── commands/                # /project:command-name — committed
    │   ├── review.md
    │   └── fix-issue.md
    ├── rules/                   # Modular instruction files — committed
    │   ├── code-style.md
    │   ├── testing.md
    │   └── api-conventions.md
    ├── skills/                  # Project workflows — committed
    │   └── [skill-name]/
    │       └── SKILL.md
    └── agents/                  # Project subagents — committed
        └── [agent-name].md
```

### Global `settings.json` Baseline

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Read",
      "Glob",
      "Grep"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(curl *)",
      "Bash(wget *)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(**/secrets/**)"
    ]
  }
}
```

### Agent Template

```markdown
---
name: [agent-name]
description: [What it does. When Claude should invoke it. Be specific.]
model: sonnet
tools: Read, Grep, Glob
---
You are a [role] focused on [narrow responsibility].

[Specific instructions for what to do and how to do it.]
[What to flag. What to ignore. What format to respond in.]
```

### Skill Template

```markdown
---
name: [skill-name]
description: [What it does. Trigger conditions. Be specific enough that Claude can match correctly.]
allowed-tools: Read, Grep, Glob
---
[Step-by-step workflow instructions.]

Reference @[SUPPORTING_FILE.md] for [what it contains].
```

### Command Template

```markdown
---
description: [One sentence. What it does.]
argument-hint: [optional — describe expected argument]
---
## Context

!`[shell command to inject live context]`

## Task

[What Claude should do with the above context.]
[Be specific. One job per command.]
```

---

## Decision Rules

Use these when deciding where something belongs.

**Is this rule universal across all projects?**
→ Yes → `~/.claude/CLAUDE.md`
→ No → `<repo>/CLAUDE.md` or `.claude/rules/`

**Does this rule only apply to certain files or directories?**
→ Yes → `.claude/rules/[name].md` with `paths` frontmatter
→ No → `<repo>/CLAUDE.md` or a global rule file

**Is this a workflow I trigger on demand?**
→ Yes, simple → Command (`.claude/commands/` or `~/.claude/commands/`)
→ Yes, complex with supporting files → Skill (`.claude/skills/` or `~/.claude/skills/`)

**Does this workflow benefit from an isolated context window and restricted tools?**
→ Yes → Agent (`.claude/agents/` or `~/.claude/agents/`)
→ No → Command or skill

**Is this preference specific to this machine or this engineer?**
→ Yes → `CLAUDE.local.md` or `.claude/settings.local.json` — never committed

---

## Anti-Patterns — Never Do These

### Config Anti-Patterns

| ❌ Never | ✅ Instead |
|---|---|
| `CLAUDE.md` over 200 lines | Split into `rules/` files |
| Generic rules in project `CLAUDE.md` | Move to `~/.claude/CLAUDE.md` |
| Restating linter/formatter rules | Reference the config file |
| Long explanatory paragraphs | Short imperative bullets |
| Speculative commands and skills | Build when the need is confirmed |
| Leaving `paths` off rules that should be scoped | Always add frontmatter when a rule is directory-specific |

### Permissions Anti-Patterns

| ❌ Never | ✅ Instead |
|---|---|
| `Bash(*)` in allow list | Allow specific commands only |
| No `.env` deny rule | Always deny `.env` reads explicitly |
| Removing a deny rule without explicit instruction | Ask before removing any deny entry |
| Committing `settings.local.json` | Always gitignore personal overrides |
| Same permissions globally and per-project | Global = conservative, project = expanded as needed |

### Behavior Anti-Patterns

| ❌ Never | ✅ Instead |
|---|---|
| Write files without presenting a plan | Always propose, get approval, then execute |
| Make changes to multiple files without a summary | One changeset, presented in full, approved once |
| Infer what the engineer wants from thin signal | Ask a targeted clarifying question |
| Let `CLAUDE.md` drift without flagging it | Surface staleness proactively |
| Rely on skill auto-invocation for critical workflows | Treat skills as callable, not guaranteed to auto-trigger |

---

*This document is the source of truth for how Claude Code is configured and maintained across all projects.*
*When in doubt, re-read this document before acting.*
*Last updated: March 2026*