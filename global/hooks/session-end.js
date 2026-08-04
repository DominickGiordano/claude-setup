#!/usr/bin/env node
/**
 * session-end.js
 * Fires on the SessionEnd hook — once, when the session actually terminates.
 *
 * This used to be wired to `Stop`, which fires at the end of EVERY TURN. That is
 * why the session log filled with stubs and why "run /end-session religiously"
 * became a documented gotcha: the hook was firing dozens of times per session and
 * the dedup guards below were load-bearing. On SessionEnd it fires once, so the
 * guards are now just belt-and-braces.
 *
 * Writes a stub only when files were actually changed (dirty-files non-empty) and
 * /end-session didn't already write a real entry.
 *
 * Requires Node.js >= 16. Exits 0 silently if unavailable.
 * Install: referenced in ~/.claude/settings.json SessionEnd hook.
 */

const [major] = process.versions.node.split(".").map(Number);
if (major < 16) { process.exit(0); }

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// `clear` and `resume` continue the work rather than ending it, so a stub there
// would interrupt a session that is still in progress.
const SKIP_REASONS = new Set(["clear", "resume"]);

async function main() {
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

  if (SKIP_REASONS.has(hookData.reason)) {
    process.exit(0);
  }

  const cwd = hookData.cwd || process.cwd();
  const memoryDir = path.join(cwd, ".claude", "memory");
  const logFile = path.join(memoryDir, "session-log.md");

  // Only write if we're inside a project with a .claude folder
  if (!fs.existsSync(path.join(cwd, ".claude"))) {
    process.exit(0);
  }

  // Nothing changed — a read-only session needs no stub.
  const dirtyFile = path.join(memoryDir, "dirty-files");
  const dirty = fs.existsSync(dirtyFile)
    ? fs.readFileSync(dirtyFile, "utf8").trim()
    : "";
  if (!dirty) {
    process.exit(0);
  }

  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split("T")[0];
  const sessionId = hookData.session_id ? hookData.session_id.slice(0, 8) : "unknown";

  if (fs.existsSync(logFile)) {
    const existing = fs.readFileSync(logFile, "utf8");
    // /end-session already wrote a real entry for today — don't shadow it.
    const todayPattern = new RegExp(`## Session ${timestamp}[\\s\\S]*?### What was built`);
    if (todayPattern.test(existing)) {
      process.exit(0);
    }
    if (existing.includes(`(${sessionId})`)) {
      process.exit(0);
    }
  }

  const files = dirty.split("\n").filter(Boolean);
  const unique = [...new Set(files)];
  const shown = unique.slice(0, 15);
  const more = unique.length - shown.length;

  const entry = `
---
## Session ${timestamp} (${sessionId})
> Auto-captured on SessionEnd — /end-session was not run.
> Run /sync-memory to backfill the details from git.

### Files touched (${unique.length})
${shown.map((f) => `- ${f}`).join("\n")}${more > 0 ? `\n- …and ${more} more` : ""}

`;

  fs.appendFileSync(logFile, entry, "utf8");
  process.exit(0);
}

main().catch(() => process.exit(0));
