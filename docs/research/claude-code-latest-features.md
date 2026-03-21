# Claude Code Latest Features & Best Practices — March 2026

> Research findings on new capabilities, adaptive thinking, remote control, and best practices.
> Some features may need verification against actual CLI behavior before relying on them.

---

## 1. Remote Control (Phone/Mobile Session Control)

**This is what you saw.** You can control a local Claude Code session from your phone or any browser.

### How it works
- Your CLI session runs locally on your machine
- The UI is proxied to `claude.ai/code` or the mobile app (iOS/Android)
- Full filesystem and MCP server access from the remote device
- Session survives network drops, laptop sleep, auto-reconnects

### Usage
```bash
# Server mode — accepts multiple connections
claude remote-control

# Single session with remote enabled
claude --remote-control "My Project"

# Enable mid-session
/remote-control
```

### Flags
- `--name "Title"` — custom session title
- `--spawn worktree` — each connection gets isolated worktree
- `--capacity N` — max concurrent sessions (default 32)

### Limitations
- Requires `claude.ai` OAuth login (not API key auth)
- Won't work with Bedrock/Vertex/Foundry providers

### What this means for us
- Can kick off a `/work-issue` from your phone while away from laptop
- Can monitor long `/execute` runs remotely
- `--spawn worktree` would let multiple sessions work on different features simultaneously

---

## 2. Adaptive Thinking / Extended Thinking

### How it works on Opus 4.6
- Thinking is enabled by default
- Opus 4.6 uses **adaptive reasoning** — dynamically allocates thinking tokens based on effort level
- Effort levels: low / medium / high / max
- "ultrathink" keyword in any prompt = high effort for that turn

### Controls
| Method | How |
|--------|-----|
| Per-turn effort | `/effort` command |
| Ultrathink keyword | Include "ultrathink" in your message |
| Toggle thinking | `Option+T` (Mac) |
| Global default | `/config` → `alwaysThinkingEnabled` |
| Disable adaptive | `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` env var |
| View thinking | `Ctrl+O` (verbose mode) — gray italic text |

### What this means for us
- We're already on Opus 4.6 — adaptive thinking is active
- For complex planning tasks (`/brainstorm`, `/plan`), could add "ultrathink" to agent prompts
- For quick tasks (`/fix`), lower effort is fine — saves tokens

---

## 3. New Hook Types (Beyond What We Use)

We currently use: `PreToolUse`, `PostToolUse`, `Stop`. New ones available:

| Hook | When it fires | Use case for us |
|------|---------------|-----------------|
| **`SessionStart`** | Session begin/resume, `compact` matcher on re-injection | Re-inject critical context after auto-compaction |
| **`StopFailure`** | API error (rate limit, auth fail) | Alert or retry logic |
| **`SubagentStart/Stop`** | Agent delegation lifecycle | Track which agents are running |
| **`PreCompact/PostCompact`** | Before/after context compaction | Save/restore critical state |
| **`PermissionRequest`** | Permission dialog appears | Auto-approve specific prompts |
| **`Notification`** | Claude needs attention | Desktop/mobile notifications |
| **`TaskCompleted`** | Task marked complete | Progress tracking |

### HIGH VALUE: SessionStart with compact matcher

This solves a real problem — when context gets compacted, Claude loses nuance. We can re-inject critical reminders:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Reminder: check .claude/CLAUDE.md for current project context. Run /catchup if context feels thin.'"
          }
        ]
      }
    ]
  }
}
```

### HIGH VALUE: PermissionRequest auto-approval

Auto-approve specific low-risk operations instead of clicking "allow" every time:

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\": {\"hookEventName\": \"PermissionRequest\", \"decision\": {\"behavior\": \"allow\"}}}'"
          }
        ]
      }
    ]
  }
}
```

---

## 4. New Settings & Configuration

### New settings.json options
| Setting | What it does |
|---------|-------------|
| `autoMemoryEnabled` | Toggle native auto memory (default true) |
| `autoMemoryDirectory` | Custom storage for memory files |
| `claudeMdExcludes` | Glob patterns to skip parent CLAUDE.md files (monorepo use) |
| `alwaysThinkingEnabled` | Global thinking default |
| `disableAllHooks` | Kill switch for all hooks |

### New CLI flags
| Flag | Use case |
|------|----------|
| `--bare` | Skip hooks/LSP/plugins — use for CI/scripted `-p` calls |
| `--console` | Anthropic Console auth |
| `--verbose` | Detailed hook/tool matching logs (debugging) |
| `--agent <name>` | Run entire session as a specific agent |
| `claude agents` | List all configured subagents |

---

## 5. Native Auto Memory vs Our Custom Memory

Claude Code now has built-in auto memory (`~/.claude/projects/<project>/memory/MEMORY.md`). First 200 lines loaded at session start.

### How it coexists with our system
| System | What it captures | Persistence |
|--------|-----------------|-------------|
| Native auto memory | User preferences, feedback, project/reference facts | Across all sessions automatically |
| Our session-log.md | Detailed session summaries, what was built, decisions, next steps | Manual via /end-session |
| Our dirty-files | Changed files per session | Cleared each session |
| Our CLAUDE.md Current Focus | What's actively in flight | Updated via /end-session |

### Verdict
They're complementary, not competing:
- Native memory = broad, automatic, user-preference-oriented
- Our system = structured, session-oriented, work-tracking-oriented
- Keep both. Don't fight the native system.

---

## 6. Agent Improvements

### Persistent memory for subagents
Agents can now have `memory: user|project|local` in frontmatter. We already use `memory: user` on code-reviewer, memory-updater, and compounder.

### Background agents
Set `background: true` in agent frontmatter or use `run_in_background` parameter. We're already using this for parallel research tasks.

### Worktree isolation
`isolation: worktree` gives each agent its own git worktree. Available and we should consider for executor agent — lets it work without blocking the main branch.

### Agent teams
Multiple agents coordinating in parallel with shared task messaging. Could be useful for epic execution — multiple features built simultaneously.

---

## 7. CLAUDE.md Best Practices (Latest)

### Loading order (priority)
1. Managed policy (org-enforced, can't be excluded)
2. User level (`~/.claude/CLAUDE.md`)
3. Project root (`.claude/CLAUDE.md`)
4. Parent directories (on-demand)
5. Child directories (lazy — only when working in that directory)

### Key recommendations
- **Under 200 lines** — first 200 lines loaded at session start, rest on-demand
- **CLAUDE.md survives compaction** — re-read fresh after `/compact`
- **Path-scoped rules** with `paths:` frontmatter are the recommended way to handle directory-specific rules
- **Symlinks** in `.claude/rules/` work for sharing rules across projects
- **`@path/to/file` imports** for shared content (recursive, 5-level max)
- **`claudeMdExcludes`** in settings to skip parent CLAUDE.md in monorepos

---

## 8. Action Items for Our Setup

### Immediate
1. **Add SessionStart compact hook** — re-inject critical context after compaction
2. **Try Remote Control** — `claude remote-control` for phone monitoring of sessions
3. **Consider worktree isolation for executor** — parallel feature builds

### Soon
4. **Add PermissionRequest hooks** — auto-approve low-risk operations we always allow
5. **Document native auto memory coexistence** — add guidance to our memory docs
6. **Use `--bare` for CI** — bd-tracker's CI triage could benefit from this flag
7. **Add `claudeMdExcludes`** — if we ever hit monorepo scenarios

### Explore
8. **Agent teams** — could enable true parallel epic execution
9. **Adaptive thinking hints in agent prompts** — "ultrathink" for planning agents
10. **`--agent` flag** — run entire sessions as a specific agent (could simplify /work-issue)

---

*Researched 2026-03-21. Verify specific features against `claude --version` and docs before relying on them.*
