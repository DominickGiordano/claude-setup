# Constitution — Areté Amendments

`constitution.md` is vendored verbatim from Kenn's Clanker Constitution and must
stay that way. Everything Areté-specific goes here.

Upstream states its own precedence: "Direct user instructions and more specific
repository instructions override these defaults." So the order is:

1. What Dominick says in the session
2. The project's own `CLAUDE.md`
3. `~/.claude/CLAUDE.md` and the other files in `~/.claude/rules/`
4. `constitution.md`

## Where we deliberately differ

**§2 "Do not impose specification, planning, or approval ceremony on
straightforward work"** loses to `CLAUDE.md`'s **"Plan before code — always"**.
Ceremony is the point here: `/brainstorm → /plan → /execute` exists because
plans get reviewed before code gets written. The escape hatch is already built
in — `/fix` is the no-plan path for small, well-understood changes, and
`CLAUDE.md` says to skip the plan for single-file, no-risk, sub-30-minute work.
Use `/fix`; do not reinterpret §2 as licence to skip planning on a feature.

**§7 "Put durable project guidance in AGENTS.md; have CLAUDE.md import or
symlink it"** — we do the opposite. `CLAUDE.md` is primary across our repos and
`init-claude-setup` scaffolds it. Some repos (`github-actions`) carry an
`AGENTS.md` for Codex; where both exist, `CLAUDE.md` is the source of truth and
`AGENTS.md` is the copy.

## Where it reinforces something we already enforce

These are not new obligations — they name principles behind existing machinery,
so read them together rather than as competing instructions.

- **§4 Protect existing work** → `git-discipline.md`, plus `permissions.deny` in
  `settings.json` already blocks `git reset --hard`, `git clean -f`, and
  `git push --force`. The rule explains why those denies exist.
- **§5 Verify reality** → `root-cause.md`. "Never claim success without fresh
  evidence" is the same rule as "do NOT ship a second root-cause fix without
  diagnostic data from the first failure."
- **§6 Communicate for humans** → `writing-style.md`. §6 is the principle
  ("lead with the outcome", "avoid walls of text"); `writing-style.md` is the
  enforceable version, with named phrases, per-surface caps, and a `guard-bash.js`
  check on anything headed for GitHub.

## Re-vendoring

Upstream versions by date. Ours is pinned at v2026.08.11. To update, re-run the
command in the comment at the top of `constitution.md`, re-read this file for
conflicts, and bump the version noted here.
