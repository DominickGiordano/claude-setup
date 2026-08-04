# Research: Global Setup Overhaul (Aug 2026)

**Date**: 2026-08-04
**Decision it informs**: What to change in `claude-setup` to cut context cost, kill drift, and move toward autonomous operation.
**Status**: Complete
**Supersedes**: Phase 2 of `docs/features/setup-modernization-2026/PLAN.md` (see [Reconciliation](#reconciliation-with-april-2026-plan))

## Question

The repo was last modernized in April 2026 against then-current Claude Code. Four months on: what is actually broken, what is now inefficient, and which new platform capabilities make parts of this repo obsolete?

Docs used: `code.claude.com/docs/en/{skills,plugins,plugins-reference,hooks,settings,sub-agents,memory}` (note: `docs.claude.com/en/docs/claude-code/*` now 301s to `code.claude.com/docs/en/*`).

---

## Part 1 — Current state, measured

| Artifact | Count | Notes |
|---|---|---|
| `global/skills/*.md` | 24 | flat files, 129 KB total body |
| `global/commands/*.md` | 16 | installed as skills, all `disable-model-invocation: true` |
| `global/agents/*.md` | 14 | 3 preload skills; 3 use `memory: user` |
| `global/hooks/*` | 5 | 4 JS + 1 shell runtime check |
| `bin/` + `setup.sh` | 933 lines bash | 4 CLIs with overlapping duties |
| `~/.claude/CLAUDE.md` | 147 lines / 9,072 B | ≈2.3k tokens loaded **every session** |
| `~/.claude/rules/` | absent | user-level rules mechanism unused |

### Context cost of the skill listing

Skill `description` text loaded into every session: **11,489 chars** across 24 skills.

```
740  phoenix       666  pre-impl-audit   654  ash        586  elixir
544  jido-reqllm   463  docker-deploy    459  ms-graph   453  anthropic-api
```

The listing budget is ~1% of the model's context window, and when it overflows Claude Code **drops descriptions starting with least-used skills**. At 1M context there's headroom; on a 200k-context session — which is what every Sonnet subagent gets — 11.5k chars of Areté descriptions competes with ~15 bundled skills for roughly 8k chars. The `ALWAYS use when…` / `Trigger phrases: …` keywords are exactly what gets truncated, and they're the only thing making these skills fire.

Root cause: every description repeats the trigger-phrase list inline. `when_to_use` is a separate frontmatter field for precisely this, and both count toward a per-entry 1,536-char cap — but only `description` is what gets cut first.

### Skill bodies load whole

Bodies are single files, so an invoke pulls the entire thing:

```
12.3 KB ash          10.6 KB microsoft-graph   10.3 KB phoenix
 9.7 KB docker-deploy 8.9 KB elixir             7.2 KB python
```

Asking one question about Ash policies loads 12 KB of Ash. Skills support a `references/` subdirectory for exactly this — `SKILL.md` stays a navigation layer, detail loads on demand. Not used anywhere in the repo.

---

## Part 2 — Live bugs and hazards

### H1 — `install-claude-setup --force` will delete a production-safety rule

`~/.claude/CLAUDE.md` contains a 13-line **"Branch Flow — HARD RULE"** section (never `--base main`, always `develop`) that does **not** exist in `global/CLAUDE.md`. The installer copies repo → home. The next `--force` run silently destroys it.

The rule's own text says it was written *because* "a fix got merged straight to `main` and auto-deployed to production." It is one `--force` away from being gone.

### H2 — `/research` cannot research

`global/agents/researcher.md` has `tools: Read, Write, Glob, Grep, Bash` — no `WebSearch`, no `WebFetch`. Its purpose is "understand a technology, library, API… before committing to a direction." Its own prompt has been written *around* the missing capability: *"If you can't answer something without external access, name the gap clearly."*

`brainstorm` and `planner` are also web-blind.

### H3 — `--promote` silently drops promotions (root cause found)

`bin/update-claude-setup:~123`:

```bash
sort -t'|' -k1,2 -u "$FINDINGS_FILE" | while IFS='|' read -r type name first_project; do
  ...
  read -p "  Promote to global? [y/N] " -n 1 -r     # <-- reads from the PIPE
```

`read` inside a piped `while read` loop consumes the findings list, not the terminal. This is the actual cause of April's *"2 skipped (likely interactive prompt got no input)"* — not a path typo. Fix: `read ... < /dev/tty`, or feed the loop by redirect instead of pipe.

### H4 — installer never prunes orphans

Retired skills/agents linger in `~/.claude/` because `copy_file` only ever adds. April's execution log records manually running `rm -r ~/.claude/skills/{compound,setup,test,review,bug,backlog,update-issue,board}`. The manifest at `~/.claude/.installed-state` has everything needed to prune automatically; nothing uses it for that.

### H5 — `global/skills/mcp.md` shadows the built-in `/mcp`

Installs to `~/.claude/skills/mcp/SKILL.md`. The directory name — not the `name:` field — determines the invocation name, and a personal skill overrides a same-named bundled command. The local copy was hand-renamed to `mcp-patterns`, which is why the repo and `~/.claude` disagree.

### H6 — real drift in three places

| Item | Repo | Installed |
|---|---|---|
| `mcp` skill | `mcp.md` (`name: mcp`) | dir `mcp-patterns` (`name: mcp-patterns`) |
| `pr` command | reads `base_branch` from Project Config (commit `135a07e`) | **hardcodes `main`** — stale, never installed |
| `settings.json` | `model: opus` | `model: opus[1m]`, + `tui`, `skipDangerousModePermissionPrompt`, `skipWorkflowUsageWarning` |
| `CLAUDE.md` | no branch-flow rule | has it (H1) |

`drift-warn.js` caught none of these. It only reports *installed-but-not-in-manifest*, so it misses content drift, manifest-items-missing-from-disk, and `settings.json` entirely. The `pr` drift means the **`main`-hardcoding bug the repo already fixed is still live in the installed config.**

### H7 — dead config: `subagentModel`

`global/settings.json` sets `"subagentModel": "sonnet"`. Not a supported settings key — it does nothing. Per-agent `model:` frontmatter is the real mechanism, and 6 agents pin `model: opus`.

### H8 — `bin/claude-setup` reference screen is 4 months stale

`show_reference()` advertises `/review`, `/test`, `/board`, `/setup`, `/compound`, `/backlog-notion`, `/update-notion-task`, and `ios-specialist` — **all retired in April**. `show_status()` counts `~/.claude/commands/*.md`, which is always 0 since the commands-as-skills migration, so it reports "0 commands" every run.

### H9 — repo junk

Four literal directories from a failed brace expansion:

```
./{global
./{global/{agents,skills,commands,output-styles},project-template
...
```

Plus untracked `AGENTS.md`: a sed-mangled copy of `CLAUDE.md` with Claude→Codex ("`~/.Codex/`", "`install-Codex-setup`"). A bulk find-replace artifact — in the repo whose own CLAUDE.md says *"Do NOT bulk find-replace without grepping every consumer first."*

---

## Part 3 — Platform capabilities the repo doesn't use

### C1 — Skills and rules can be **symlinks**

> "A `<skill-name>` entry in the enterprise, personal, or project locations can be a symlink to a directory elsewhere on disk. Claude Code follows the symlink and reads `SKILL.md` from the target directory."

> "The `.claude/rules/` directory supports symlinks."

This makes the entire copy-install-manifest-drift-promote apparatus unnecessary. One copy on disk means drift is *structurally impossible*, not merely detected. Candidate for deletion: `drift-warn.js` (101 lines), `.installed-state` writer, orphan pruning, `--promote`, and most of `install-claude-setup`.

Prerequisite: skills must be `<name>/SKILL.md` directories, not flat `.md` files.

Needs verification (undocumented): whether the live-change watcher follows symlinks, and whether `~/.claude/agents/` accepts them.

### C2 — `~/.claude/rules/` — user-level rules with `paths:`

Personal rules in `~/.claude/rules/*.md` apply to every project. Rules **with** a `paths:` glob load only when Claude touches matching files. The 147-line global CLAUDE.md has obvious path-scoped candidates ("Verification Before Pushing" → UI/template globs). Un-pathed rules still load at launch, so splitting alone saves nothing — the saving comes from path-scoping plus trimming.

### C3 — Settings that enforce what CLAUDE.md merely asks

| CLAUDE.md prose rule | Enforceable as |
|---|---|
| "Do NOT add Co-Authored-By lines — ever" | `includeCoAuthoredBy: false` + `attribution` |
| "NEVER open a PR with `--base main`" | `PreToolUse` Bash hook (deny exit 2) |
| model / effort preferences | `model`, `effortLevel`, `fallbackModel`, `alwaysThinkingEnabled` |

Docs are explicit: *"Settings rules are enforced by the client regardless of what Claude decides to do. CLAUDE.md instructions shape Claude's behavior but are not a hard enforcement layer."* The branch-flow rule is the highest-stakes rule in the config and is currently prose only.

### C4 — `session-end.js` is on the wrong hook

It's wired to `Stop`, which fires **at the end of every turn**, not at session end. That is the documented cause of the repo's own gotcha: *"Stop hook writes a session-log stub on every close… Run `/end-session` religiously or the log fills with stubs."*

`SessionEnd` now exists (matchers: `clear`, `resume`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other`). Rewiring makes the gotcha disappear rather than needing discipline to work around.

Also unused and relevant: `PreCompact`/`PostCompact` (checkpoint before context loss), `SubagentStop`, `TaskCreated`/`TaskCompleted`, `InstructionsLoaded` (debug which rules actually loaded), `FileChanged`, `SessionStart` returning `additionalContext` — the compact hook currently just `echo`s a reminder instead of injecting real context.

### C5 — `context: fork` collapses command+agent pairs

A skill with `context: fork` + `agent: <name>` runs its own body as the prompt inside a chosen subagent, in the background. The current pattern — `/plan` (9-line wrapper) → `planner` agent — is two files doing what one now does, and it blocks the session while it runs. Applies to `/research`, `/brainstorm`, `/plan`, `/execute`, `/orchestrate`.

### C6 — Skill frontmatter the repo ignores entirely

`paths:` (glob-gated auto-activation — more reliable than keyword matching), `when_to_use` (fixes C-part-1 truncation), `allowed-tools` / `disallowed-tools`, `argument-hint`, `arguments` (named `$issue` style args), `model`, `effort`, `user-invocable`, `${CLAUDE_SKILL_DIR}` (bundle and pre-approve scripts).

Agent frontmatter unused: `effort`, `maxTurns`, `color`, `isolation: worktree`, `background`, `initialPrompt`, `mcpServers`.

### C7 — Autonomy: the constraint that shapes everything

> "Cowork sessions and cloud sessions, including routines, don't read `~/.claude/skills/` on your machine."

So scheduled/remote autonomous runs see **none** of this setup. To reach them, config must ship as a **plugin declared in a repo's `.claude/settings.json`**, or be committed to project `.claude/skills/`. Symlinking into `~/.claude/` is the right answer for local efficiency and a dead end for cloud autonomy.

Other autonomy primitives available now: background monitors (`monitors.json`), `agent` setting (run main thread as a named agent), agent `memory: project`, `userConfig` prompts, `dependencies` between plugins, `isolation: worktree` for parallel non-conflicting agents.

---

## Reconciliation with April 2026 plan

Phase 1 (April) landed and holds up. **Phase 2 as written should not be executed** — one item is now actively counterproductive:

| April Phase 2 item | Verdict now |
|---|---|
| 2.1 Split `python.md` into `python` + `fastapi` + `pydantic` top-level skills | **Reverse it.** More top-level skills = more description text in a budget that already overflows on 200k models. Use `references/` subfiles instead: one listing entry, detail on demand. |
| 2.2 Audit skills >250 lines | **Keep**, but the fix is `references/`, not splitting into siblings. |
| 2.3 Extract `arete-baseline` shared skill | **Keep** — but as an un-pathed `~/.claude/rules/` file, not a skill. It's always-true baseline, not a triggered procedure. |
| 2.4 Merge cross-cutting skills into language skills | **Keep**, same reasoning as 2.1 — fewer listing entries. |
| 2.5 Preload `arete-baseline` in specialists | Moot if it becomes a rule (rules already load into subagents via CLAUDE.md hierarchy). |
| Rejected: plugin restructure | **Revisit.** Rejected for "no team consumers," but C7 shows plugins are the only route to cloud/scheduled autonomy. Still defer — after the symlink migration, not instead of it. |

---

## Recommendation

Sequence matters more than any individual change:

1. **Stop the bleed** — H1 (branch rule) and H6 (`pr` hardcodes `main`) are live production hazards. H2 makes a quarter of the workflow non-functional. Fix before touching architecture.
2. **Symlink, don't copy** (C1) — deletes ~350 lines of drift machinery instead of improving it. Requires the `<name>/SKILL.md` restructure, which Phase 3 needs anyway.
3. **Enforce, don't ask** (C3, C4) — move the rules that matter into settings and hooks.
4. **Context diet** (C2, C6, Part 1) — descriptions → `when_to_use`, bodies → `references/`, add `paths:`, split global CLAUDE.md.
5. **Collapse the workflow** (C5) — 5 command+agent pairs → 5 forked skills.
6. **Defer autonomy** (C7) — plugin packaging is the gate. Not needed now, per the ask.

## Open questions

- [ ] Does the skill file-watcher follow symlinks? (affects whether repo edits are live)
- [ ] Does `~/.claude/agents/` accept symlinked `.md` files?
- [ ] Keep `guard-bash.js` once `permissions.deny` covers the same patterns, or fold the branch-flow guard into it?
- [ ] `AGENTS.md`: delete, or make it real and have `CLAUDE.md` `@AGENTS.md` import it?
</content>
</invoke>
