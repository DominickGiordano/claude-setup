# Git and Issue Discipline

## Commits

- Branch naming: `<type>/<issue-number>-<short-desc>` (e.g. `feature/42-coverage-calc`)
- Commit messages use conventional prefix + issue number: `feat: #42 add coverage calculation`
- Prefixes: `feat:` (or `feature:`), `fix:`, `chore:`, `docs:`, `refactor:`, `test:` —
  required for changelog generation. Both `feat:` and `feature:` are accepted.
- Do NOT tag issue numbers (`#N`) in commits unless the commit is directly related to
  that issue.
- PRs must use `Closes #N` in the description — the branch name alone does NOT auto-link.
- No `Co-Authored-By` trailer. This is enforced by `includeCoAuthoredBy: false` and
  `attribution` in `~/.claude/settings.json` — don't re-add it by hand.

## Issues

- Post a work plan comment before starting implementation.
- Post a completion comment when done — what changed, root cause, discovered issues.
- Move the card on the project board to match actual status.
- Create new issues for problems discovered during debugging — don't let them get lost.
