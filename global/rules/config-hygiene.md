---
paths:
  - "**/CLAUDE.md"
  - "**/CLAUDE.local.md"
  - "**/AGENTS.md"
  - "**/.claude/**"
---

# Claude Config Hygiene

Loads when editing Claude configuration itself.

- Do NOT put project-specific rules in `~/.claude/CLAUDE.md`. Move them to the
  project's `.claude/CLAUDE.md` or `.claude/rules/`.
- Do NOT let a project `CLAUDE.md` exceed 200 lines. Split path-specific content to
  `.claude/rules/` files with `paths:` frontmatter.
- `paths:` on a rule or skill LIMITS when it loads. Use it to scope something that
  only applies to certain files — never expecting it to broaden activation.
- Prefer a skill over a CLAUDE.md section when the content is a procedure rather than
  a standing fact. A skill body costs nothing until it's invoked; CLAUDE.md is in
  context every session.
- Do NOT restate linter/formatter rules. Reference the config file instead.
- Do NOT write long explanatory paragraphs. Use short imperative bullets.
- Do NOT update `CLAUDE.md` without reading it first and checking the line count after.
- Do NOT create speculative commands, skills, or agents. Build them when the need is
  confirmed.
- Do NOT put ephemeral state (current focus, branch lists, deploy checklists) in
  CLAUDE.md. Use memory files instead.
- Do NOT duplicate CLAUDE.md content in MEMORY.md. Memory is for non-obvious context;
  CLAUDE.md is for rules.
- If a rule must hold regardless of what Claude decides, put it in `settings.json`
  (`permissions.deny`) or a hook — not a CLAUDE.md bullet.
