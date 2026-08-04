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
3. Write a PR description with:
   - **What**: brief summary of changes
   - **Why**: context/motivation
   - **How**: approach taken
   - **Testing**: how to verify it works
4. Suggest a conventional commit-style PR title: `feat:`, `fix:`, `chore:`, etc.
5. Stage and commit if there are unstaged changes (ask first)

$ARGUMENTS
