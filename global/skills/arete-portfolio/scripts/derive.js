#!/usr/bin/env node
/**
 * derive.js — generate the derived half of the Areté portfolio map.
 *
 * Everything this prints is READ FROM THE REPOS, never hand-written: stack, activity,
 * remote, branch topology, compose services, MCP servers, and Project Config values.
 * That split is the whole point — derived facts get regenerated on demand, so they can't
 * silently rot, and the hand-written judgment (why an app exists, how it relates to the
 * others) lives in SKILL.md and references/<app>.md carrying its own `Verified:` date.
 *
 * Usage:
 *   node derive.js [--root ~/dev/arete] [--json]
 *
 * Writes markdown to stdout. The skill body says to redirect it into
 * references/inventory.md and commit it.
 *
 * Requires Node >= 16. Read-only: never writes to the scanned repos.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const rootIdx = args.indexOf("--root");
const ROOT =
  rootIdx !== -1 && args[rootIdx + 1]
    ? args[rootIdx + 1].replace(/^~/, os.homedir())
    : path.join(os.homedir(), "dev", "arete");

const ACTIVE_DAYS = 45;
const ARCHIVED_DAYS = 120;
const DAY = 86400;

function git(cwd, gitArgs) {
  try {
    return execFileSync("git", gitArgs, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function exists(...p) {
  return fs.existsSync(path.join(...p));
}

/** Framework fingerprints, so "node" becomes "next" and "elixir" becomes "phoenix + ash". */
function frameworks(dir) {
  const out = new Set();
  const pkg = readJson(path.join(dir, "package.json"));
  if (pkg) {
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const map = {
      next: "next", react: "react", "@remix-run/react": "remix",
      vite: "vite", tailwindcss: "tailwind", express: "express",
      "@modelcontextprotocol/sdk": "mcp-sdk", "@anthropic-ai/sdk": "anthropic-sdk",
      typescript: "ts", prisma: "prisma", vitest: "vitest", jest: "jest",
    };
    for (const [dep, label] of Object.entries(map)) if (deps[dep]) out.add(label);
  }
  const mix = path.join(dir, "mix.exs");
  if (fs.existsSync(mix)) {
    const t = fs.readFileSync(mix, "utf8");
    if (/:phoenix\b/.test(t)) out.add("phoenix");
    if (/:ash\b/.test(t)) out.add("ash");
    if (/:ash_postgres\b/.test(t)) out.add("ash_postgres");
    if (/:oban\b/.test(t)) out.add("oban");
    if (/:jido\b/.test(t)) out.add("jido");
    if (/:req_llm\b/.test(t)) out.add("req_llm");
    if (/:live_view\b|:phoenix_live_view\b/.test(t)) out.add("liveview");
  }
  for (const f of ["pyproject.toml", "requirements.txt"]) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    const t = fs.readFileSync(p, "utf8").toLowerCase();
    if (/fastapi/.test(t)) out.add("fastapi");
    if (/streamlit/.test(t)) out.add("streamlit");
    if (/pydantic/.test(t)) out.add("pydantic");
    if (/duckdb/.test(t)) out.add("duckdb");
    if (/anthropic/.test(t)) out.add("anthropic-sdk");
    if (/pandas|polars/.test(t)) out.add("dataframes");
  }
  return [...out];
}

function stack(dir) {
  const s = [];
  if (exists(dir, "mix.exs")) s.push("elixir");
  if (exists(dir, "package.json")) s.push("node");
  if (exists(dir, "pyproject.toml") || exists(dir, "requirements.txt")) s.push("python");
  if (exists(dir, "go.mod")) s.push("go");
  const tf = (() => {
    try {
      return fs.readdirSync(dir).some((f) => f.endsWith(".tf"));
    } catch {
      return false;
    }
  })();
  if (tf || exists(dir, "terraform")) s.push("terraform");
  return s;
}

function composeServices(dir) {
  for (const f of ["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"]) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, "utf8").split("\n");
    const svcs = [];
    let inServices = false;
    for (const line of lines) {
      if (/^services:\s*$/.test(line)) { inServices = true; continue; }
      if (inServices && /^\S/.test(line)) break;            // left the services block
      const m = inServices && line.match(/^  ([A-Za-z0-9._-]+):\s*$/);
      if (m) svcs.push(m[1]);
    }
    return svcs;
  }
  return [];
}

function mcpServers(dir) {
  const cfg = readJson(path.join(dir, ".mcp.json"));
  return cfg && cfg.mcpServers ? Object.keys(cfg.mcpServers) : [];
}

/**
 * Pull the values our commands actually read out of the Project Config block.
 * A project CLAUDE.md is valid at EITHER ./CLAUDE.md or ./.claude/CLAUDE.md — checking
 * only the latter reported repos as having no context when they did.
 */
function projectConfig(dir) {
  const candidates = [path.join(dir, ".claude", "CLAUDE.md"), path.join(dir, "CLAUDE.md")];
  const p = candidates.find((c) => fs.existsSync(c));
  if (!p) return null;
  const t = fs.readFileSync(p, "utf8");
  const grab = (key) => {
    const m = t.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, "m"));
    return m ? m[1].split("#")[0].trim() : null;
  };
  const testBlock = t.match(/^test_commands:\s*\n((?:\s*-\s*.+\n?)+)/m);
  return {
    at: path.relative(dir, p),
    lines: t.split("\n").length,
    base_branch: grab("base_branch"),
    pm_tool: grab("pm_tool"),
    test_commands: testBlock
      ? testBlock[1].split("\n").map((l) => l.replace(/^\s*-\s*/, "").trim()).filter(Boolean)
      : [],
  };
}

function scan() {
  if (!fs.existsSync(ROOT)) {
    console.error(`derive.js: root not found: ${ROOT}`);
    process.exit(1);
  }
  const now = Math.floor(Date.now() / 1000);
  const repos = [];

  for (const name of fs.readdirSync(ROOT).sort()) {
    const dir = path.join(ROOT, name);
    if (!fs.existsSync(path.join(dir, ".git"))) continue;

    const ts = parseInt(git(dir, ["log", "-1", "--format=%at"]) || "0", 10);
    const ageDays = ts ? Math.floor((now - ts) / DAY) : null;
    const tier =
      ageDays === null ? "unknown" : ageDays <= ACTIVE_DAYS ? "active" : ageDays >= ARCHIVED_DAYS ? "archived" : "dormant";

    const remote = git(dir, ["remote", "get-url", "origin"]);
    const branches = git(dir, ["branch", "-r", "--format=%(refname:short)"])
      .split("\n")
      .map((b) => b.replace(/^origin\//, ""))
      .filter(Boolean);

    repos.push({
      name,
      tier,
      ageDays,
      lastCommit: ts ? new Date(ts * 1000).toISOString().slice(0, 10) : null,
      commits90d: parseInt(git(dir, ["rev-list", "--count", "--since=90.days", "HEAD"]) || "0", 10),
      stack: stack(dir),
      frameworks: frameworks(dir),
      remote: remote ? remote.replace(/^.*[:/]/, "").replace(/\.git$/, "") : null,
      hasDevelop: branches.includes("develop"),
      defaultBranch: branches.includes("main") ? "main" : branches.includes("master") ? "master" : branches[0] || null,
      compose: composeServices(dir),
      mcp: mcpServers(dir),
      claudeMd: projectConfig(dir),
      readmeFirstLine: (() => {
        for (const f of ["README.md", "readme.md"]) {
          const p = path.join(dir, f);
          if (!fs.existsSync(p)) continue;
          const line = fs.readFileSync(p, "utf8").split("\n").find((l) => l.trim() && !l.startsWith("#") && !l.startsWith("!["));
          return line ? line.trim().slice(0, 110) : null;
        }
        return null;
      })(),
    });
  }
  return repos;
}

function familyOf(name) {
  const rules = [
    [/^areteos/, "areteos"], [/^arilearn/, "arilearn"], [/^ari-/, "ari"],
    [/^bd-|^bdc-/, "bd"], [/^contact-intelligence/, "contact-intelligence"],
    [/terraform|^clerk-/, "infrastructure"], [/^claude|^codex-setup/, "claude-config"],
    [/^ms-|^microsoft-|^debtwire/, "integrations"],
    [/site$|^website$|wordpress/, "web-presence"],
  ];
  for (const [re, fam] of rules) if (re.test(name)) return fam;
  return "standalone";
}

function md(repos) {
  const gen = new Date().toISOString().slice(0, 10);
  const byTier = (t) => repos.filter((r) => r.tier === t);
  const L = [];

  L.push("# Areté portfolio — derived inventory", "");
  L.push(`**Generated:** ${gen} · **Root:** \`${ROOT.replace(os.homedir(), "~")}\` · **Repos:** ${repos.length}`);
  L.push("");
  L.push("> Generated by `scripts/derive.js`. **Do not hand-edit** — regenerate instead.");
  L.push("> Curated judgment (why an app exists, how it relates to others) lives in `../SKILL.md`");
  L.push("> and `<app>.md`, each carrying its own `Verified:` date.");
  L.push("");
  L.push(`Activity tiers: **active** ≤${ACTIVE_DAYS}d · **dormant** ${ACTIVE_DAYS + 1}–${ARCHIVED_DAYS - 1}d · **archived** ≥${ARCHIVED_DAYS}d since last commit.`);
  L.push("");
  L.push(`| Tier | Count |`, `|---|---|`);
  for (const t of ["active", "dormant", "archived", "unknown"]) {
    const n = byTier(t).length;
    if (n) L.push(`| ${t} | ${n} |`);
  }
  L.push("");

  for (const tier of ["active", "dormant", "archived", "unknown"]) {
    const rs = byTier(tier);
    if (!rs.length) continue;
    L.push(`## ${tier[0].toUpperCase() + tier.slice(1)} (${rs.length})`, "");
    if (tier === "archived") {
      L.push("**Do not build on these without checking first.** No commits in " + ARCHIVED_DAYS + "+ days —");
      L.push("several are superseded by an active repo in the same family.", "");
    }
    L.push("| Repo | Family | Last | 90d | Stack | Frameworks | CLAUDE.md | develop |");
    L.push("|---|---|---|---|---|---|---|---|");
    for (const r of rs.sort((a, b) => (a.ageDays ?? 1e9) - (b.ageDays ?? 1e9))) {
      L.push(
        `| \`${r.name}\` | ${familyOf(r.name)} | ${r.lastCommit || "?"} | ${r.commits90d} | ${r.stack.join(", ") || "—"} | ${r.frameworks.join(", ") || "—"} | ${r.claudeMd ? `${r.claudeMd.lines}L` : "—"} | ${r.hasDevelop ? "yes" : "no"} |`
      );
    }
    L.push("");
  }

  L.push("## Families", "");
  const fams = {};
  for (const r of repos) (fams[familyOf(r.name)] ||= []).push(r);
  for (const [fam, rs] of Object.entries(fams).sort((a, b) => b[1].length - a[1].length)) {
    const live = rs.filter((r) => r.tier === "active").map((r) => `\`${r.name}\``);
    const dead = rs.filter((r) => r.tier === "archived").map((r) => `\`${r.name}\``);
    L.push(`**${fam}** (${rs.length}) — active: ${live.join(", ") || "none"}${dead.length ? ` · archived: ${dead.join(", ")}` : ""}`);
    L.push("");
  }

  const withCompose = repos.filter((r) => r.compose.length);
  if (withCompose.length) {
    L.push("## Compose services", "");
    L.push("| Repo | Services |", "|---|---|");
    for (const r of withCompose) L.push(`| \`${r.name}\` | ${r.compose.join(", ")} |`);
    L.push("");
  }

  const withMcp = repos.filter((r) => r.mcp.length);
  if (withMcp.length) {
    L.push("## MCP servers declared", "");
    L.push("| Repo | Servers |", "|---|---|");
    for (const r of withMcp) L.push(`| \`${r.name}\` | ${r.mcp.join(", ")} |`);
    L.push("");
  }

  L.push("## Project Config coverage", "");
  L.push("Repos our commands can adapt to. A missing `base_branch` means `/pr` and `/goal` fall back and may have to ask.", "");
  L.push("| Repo | base_branch | pm_tool | test_commands |", "|---|---|---|---|");
  for (const r of repos.filter((x) => x.claudeMd)) {
    const c = r.claudeMd;
    L.push(`| \`${r.name}\` | ${c.base_branch || "—"} | ${c.pm_tool || "—"} | ${c.test_commands.length ? "`" + c.test_commands[0] + "`" : "—"} |`);
  }
  const missing = repos.filter((r) => !r.claudeMd && r.tier === "active").map((r) => `\`${r.name}\``);
  if (missing.length) {
    L.push("");
    L.push(`**Active repos with no \`.claude/CLAUDE.md\`:** ${missing.join(", ")} — run \`init-claude-setup\` then \`/init\` in each.`);
  }
  L.push("");

  const noDevelop = repos.filter((r) => r.tier === "active" && !r.hasDevelop).map((r) => `\`${r.name}\``);
  if (noDevelop.length) {
    L.push("## Branch-flow exceptions", "");
    L.push(`Active repos with **no \`develop\` branch**: ${noDevelop.join(", ")}.`);
    L.push("");
    L.push("The branch rule is feature → develop → main. In these repos `guard-bash` returns *ask*");
    L.push("rather than blocking a PR into `main`, so each is a decision waiting to be made:");
    L.push("create `develop`, or accept `main` as the base deliberately.");
    L.push("");
  }

  return L.join("\n");
}

const repos = scan();
process.stdout.write(asJson ? JSON.stringify(repos, null, 2) + "\n" : md(repos) + "\n");
