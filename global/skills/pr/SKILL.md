---
name: pr
description: "Prepare a pull request for current changes."
disable-model-invocation: true
---

Prepare a pull request for current changes.

0. Determine the base branch: read `base_branch` from the `## Project Config`
   block in the project's CLAUDE.md (default: `develop`, fallback `main`). Use it
   as `{base}` below — do NOT assume `main`.
1. Run `git diff {base} --stat` to see what changed
2. Run `git log {base}..HEAD --oneline` to see commits
3. If the hand-written logic runs past ~400 lines (docs, tests, lockfiles and
   generated files don't count), stop and offer the split from the `pr-sizing`
   skill before opening anything. `guard-bash.js` asks the same question at
   `gh pr create`, but by then the branch is already one lump
4. Write a PR description — three parts, nothing else:
   - **What**: what changed. Bullets, ≤ 25 words each, one clause each.
   - **Why**: the motivation. One or two lines.
   - **Test**: how the reviewer confirms it works.

   No **How** section — it restates the diff the reviewer is already looking at.
   Include `Closes #N` if there's an issue. See `~/.claude/rules/writing-style.md`
   for the caps; `guard-bash.js` enforces them at `gh pr create` time.
5. Suggest a conventional commit-style PR title: `feat:`, `fix:`, `chore:`, etc.
6. Stage and commit if there are unstaged changes (ask first)

$ARGUMENTS
