#!/usr/bin/env bash
# install.sh
# Deploys Dominick's global Claude Code config to ~/.claude
# Run from the root of this repo: bash install.sh
#
# Safe to re-run — copies don't overwrite existing files unless you pass --force

set -euo pipefail

FORCE=false
[[ "${1:-}" == "--force" ]] && FORCE=true

CLAUDE_DIR="$HOME/.claude"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/global"

echo "🚀 Installing Claude Code config to $CLAUDE_DIR"

# Check hook runtimes
echo "Checking hook runtimes..."
bash "$SCRIPT_DIR/hooks/check-runtime.sh"
echo ""

# Create directories
mkdir -p "$CLAUDE_DIR"/{agents,skills,commands,output-styles,hooks}

copy_file() {
  local src="$1"
  local dst="$2"
  if [[ -f "$dst" ]] && [[ "$FORCE" == "false" ]]; then
    echo "  ⏭  SKIP (exists): $dst"
  else
    cp "$src" "$dst"
    echo "  ✅  $dst"
  fi
}

# CLAUDE.md
copy_file "$SCRIPT_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"

# settings.json — merge if exists, don't blindly overwrite
if [[ -f "$CLAUDE_DIR/settings.json" ]] && [[ "$FORCE" == "false" ]]; then
  echo "  ⏭  SKIP (exists): $CLAUDE_DIR/settings.json — merge manually if needed"
else
  copy_file "$SCRIPT_DIR/settings.json" "$CLAUDE_DIR/settings.json"
fi

# Agents
for f in "$SCRIPT_DIR"/agents/*.md; do
  copy_file "$f" "$CLAUDE_DIR/agents/$(basename "$f")"
done

# Skills
for f in "$SCRIPT_DIR"/skills/*.md; do
  copy_file "$f" "$CLAUDE_DIR/skills/$(basename "$f")"
done

# Commands
for f in "$SCRIPT_DIR"/commands/*.md; do
  copy_file "$f" "$CLAUDE_DIR/commands/$(basename "$f")"
done

# Hooks
for f in "$SCRIPT_DIR"/hooks/*.js; do
  copy_file "$f" "$CLAUDE_DIR/hooks/$(basename "$f")"
  chmod +x "$CLAUDE_DIR/hooks/$(basename "$f")"
done

echo ""
echo "✅ Done. Global config installed."
echo ""
echo "Next steps:"
echo "  1. Open a new project and run: bash init-project.sh"
echo "  2. Fill in .claude/CLAUDE.md with your project stack"
echo "  3. Start Claude Code and run /catchup"
echo ""
echo "Re-run with --force to overwrite existing files."
