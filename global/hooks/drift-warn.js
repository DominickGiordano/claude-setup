#!/usr/bin/env node
/**
 * drift-warn.js
 * Fires on SessionStart.
 * Compares ~/.claude/{skills,agents} against the install manifest at ~/.claude/.installed-state
 * and warns if local additions exist (skills/agents/commands present in ~/.claude but not in
 * the repo at last install). Surfaces real drift — files Dom may have added locally that
 * haven't been promoted back to the source-of-truth repo.
 *
 * Skips silently if no manifest (clean install hasn't happened yet).
 * Zero token cost — just file I/O, no LLM calls.
 * Requires Node.js >= 16.
 */

const [major] = process.versions.node.split(".").map(Number);
if (major < 16) { process.exit(0); }

const fs = require("fs");
const path = require("path");
const os = require("os");

const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, ".claude");
const MANIFEST = path.join(CLAUDE_DIR, ".installed-state");
const SKILLS_DIR = path.join(CLAUDE_DIR, "skills");
const AGENTS_DIR = path.join(CLAUDE_DIR, "agents");

function parseManifest(raw) {
  const out = {};
  for (const line of raw.split("\n")) {
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key === "skills" || key === "commands" || key === "agents") {
      out[key] = val ? val.split(",").map(s => s.trim()).filter(Boolean) : [];
    } else {
      out[key] = val;
    }
  }
  return out;
}

function listSkillNames(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => fs.existsSync(path.join(dir, d.name, "SKILL.md")))
    .map(d => d.name);
}

function listAgentNames(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".md"))
    .map(f => f.slice(0, -3));
}

function main() {
  if (!fs.existsSync(MANIFEST)) {
    process.exit(0);
  }

  let manifest;
  try {
    manifest = parseManifest(fs.readFileSync(MANIFEST, "utf8"));
  } catch {
    process.exit(0);
  }

  const knownSkills = new Set([
    ...(manifest.skills || []),
    ...(manifest.commands || []),
  ]);
  const knownAgents = new Set(manifest.agents || []);

  const installedSkills = listSkillNames(SKILLS_DIR);
  const installedAgents = listAgentNames(AGENTS_DIR);

  const driftSkills = installedSkills.filter(s => !knownSkills.has(s));
  const driftAgents = installedAgents.filter(a => !knownAgents.has(a));

  if (driftSkills.length === 0 && driftAgents.length === 0) {
    process.exit(0);
  }

  const lines = ["Drift detected — local files not in the claude-setup repo:"];
  if (driftSkills.length > 0) {
    lines.push(`  Skills/commands: ${driftSkills.join(", ")}`);
  }
  if (driftAgents.length > 0) {
    lines.push(`  Agents: ${driftAgents.join(", ")}`);
  }
  lines.push(`  Repo: ${manifest.repo || "(unknown)"}`);
  lines.push(`  Promote with: update-claude-setup --promote, or delete if obsolete.`);

  process.stderr.write(lines.join("\n") + "\n");
  process.exit(0);
}

main();
