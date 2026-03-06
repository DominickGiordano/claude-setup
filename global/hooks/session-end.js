#!/usr/bin/env node
/**
 * session-end.js
 * Fires on Stop hook. Appends a timestamped session summary prompt
 * to the active project's memory log so learnings aren't lost.
 *
 * Requires: Node.js >= 16. Exits 0 silently if unavailable.
 * Install: referenced in ~/.claude/settings.json Stop hook
 */

const [major] = process.versions.node.split(".").map(Number);
if (major < 16) { process.exit(0); }

const fs = require("fs");
const path = require("path");
const readline = require("readline");

async function main() {
  // Read hook input from stdin
  let input = "";
  const rl = readline.createInterface({ input: process.stdin });
  for await (const line of rl) {
    input += line;
  }

  let hookData = {};
  try {
    hookData = JSON.parse(input);
  } catch {
    process.exit(0); // non-blocking — don't break Claude if hook fails
  }

  const cwd = hookData.cwd || process.cwd();
  const memoryDir = path.join(cwd, ".claude", "memory");
  const logFile = path.join(memoryDir, "session-log.md");

  // Only write if we're inside a project with a .claude folder
  if (!fs.existsSync(path.join(cwd, ".claude"))) {
    process.exit(0);
  }

  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split("T")[0];
  const sessionId = hookData.session_id ? hookData.session_id.slice(0, 8) : "unknown";

  const entry = `
---
## Session ${timestamp} (${sessionId})
> Auto-captured on Stop. Edit or delete stale entries freely.

<!-- Claude: summarize what was built, decisions made, and anything to remember next session -->

`;

  fs.appendFileSync(logFile, entry, "utf8");

  // Output JSON to signal success without blocking
  console.log(JSON.stringify({ continue: true, suppressOutput: true }));
}

main().catch(() => process.exit(0));
