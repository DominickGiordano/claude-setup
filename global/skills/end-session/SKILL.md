---
name: end-session
description: "Use the memory-updater agent to summarize this session."
disable-model-invocation: true
---

Use the memory-updater agent to summarize this session.

1. Read `.claude/memory/dirty-files` for changed files
2. Review what was built or discussed
3. Append a structured summary to `.claude/memory/session-log.md`
4. Record doc staleness **before clearing** — the SessionEnd hook can't see a drained
   `dirty-files`, so this is the one thing that must happen here and not there:
   `echo '{"cwd":"'"$PWD"'"}' | node ~/.claude/hooks/doc-staleness.js record`
5. Clear `.claude/memory/dirty-files`
6. If `.claude/memory/stale-docs` is non-empty, name the stale docs and offer
   `/repo-docs --refresh`. Don't refresh unprompted.
7. Confirm: "Session logged. [N] files changed. Next steps: [...]"

$ARGUMENTS
