#!/usr/bin/env bash
# init-project.sh
# Scaffolds .claude/ and docs/ in the current project directory
# Run from your project root: bash /path/to/claude-setup/init-project.sh

set -euo pipefail

TEMPLATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/project-template"
PROJECT_DIR="$(pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"

echo "🗂  Initializing Claude Code config for: $PROJECT_NAME"
echo "   Target: $PROJECT_DIR"
echo ""

# Create dirs
mkdir -p "$PROJECT_DIR"/.claude/{agents,skills,commands,memory}
mkdir -p "$PROJECT_DIR"/docs

copy_if_missing() {
  local src="$1"
  local dst="$2"
  if [[ -f "$dst" ]]; then
    echo "  ⏭  SKIP (exists): $dst"
  else
    cp "$src" "$dst"
    echo "  ✅  Created: $dst"
  fi
}

copy_if_missing "$TEMPLATE_DIR/.claude/CLAUDE.md"              "$PROJECT_DIR/.claude/CLAUDE.md"
copy_if_missing "$TEMPLATE_DIR/.claude/settings.json"          "$PROJECT_DIR/.claude/settings.json"
copy_if_missing "$TEMPLATE_DIR/.claude/memory/session-log.md"  "$PROJECT_DIR/.claude/memory/session-log.md"
copy_if_missing "$TEMPLATE_DIR/docs/architecture.md"           "$PROJECT_DIR/docs/architecture.md"

# Add .claude/memory to .gitignore (session logs are personal)
GITIGNORE="$PROJECT_DIR/.gitignore"
if [[ -f "$GITIGNORE" ]]; then
  if ! grep -q ".claude/memory" "$GITIGNORE"; then
    echo "" >> "$GITIGNORE"
    echo "# Claude Code session memory (personal, not shared)" >> "$GITIGNORE"
    echo ".claude/memory/" >> "$GITIGNORE"
    echo "  ✅  Added .claude/memory/ to .gitignore"
  fi
fi

echo ""
echo "✅ Project initialized."
echo ""
echo "Next:"
echo "  1. Edit .claude/CLAUDE.md — fill in stack, commands, key paths"
echo "  2. Edit docs/architecture.md — document the system design"
echo "  3. Run Claude Code: claude"
echo "  4. Type /catchup to load context"
