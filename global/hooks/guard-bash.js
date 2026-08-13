#!/usr/bin/env node
/**
 * guard-bash.js
 * Fires on PreToolUse for Bash. Three jobs:
 *
 *   1. Block the handful of catastrophic commands that `permissions.deny` doesn't
 *      already cover. The `rm -rf` family is deliberately NOT here — settings.json
 *      denies `Bash(rm -rf *)` outright, so duplicating it would be two things to
 *      maintain for one outcome.
 *
 *   2. Enforce the branch-flow rule: feature -> develop -> main. This lived only as
 *      prose in CLAUDE.md, which is context Claude can deviate from. It already
 *      failed once — a fix got merged straight to `main` and auto-deployed to
 *      production. Prose asks; a hook enforces.
 *
 *   3. Enforce the prose caps in rules/writing-style.md on anything headed for
 *      GitHub. Same reasoning as (2): "be concise" sat in CLAUDE.md for months
 *      while PR bodies shipped 320-character single-clause-per-dash bullets.
 *      The checks are deliberately narrow — length and a short list of
 *      unambiguous filler openers — because a guard that misfires gets disabled.
 *
 * Exit 0 = allow. Exit 2 = block. JSON on stdout can also return "ask" so an
 * ambiguous case becomes a human decision instead of a guess.
 *
 * Requires Node.js >= 16. Fails open (allow) on any internal error — a broken
 * guard must never wedge the session.
 */

const [major] = process.versions.node.split(".").map(Number);
if (major < 16) {
  process.stderr.write("[guard-bash] Node >= 16 required. Hook disabled.\n");
  process.exit(0);
}

const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

// Catastrophic and NOT covered by permissions.deny.
const BLOCKED_PATTERNS = [
  { re: /:\(\)\s*\{\s*:\|:&\s*\}\s*;\s*:/, why: "fork bomb" },
  { re: /\bdd\b[^|;]*\bof=\/dev\/(disk|sd|hd|nvme)/, why: "raw write to a disk device" },
  { re: /\bmkfs(\.\w+)?\b/, why: "filesystem reformat" },
  { re: />\s*\/dev\/(disk|sd|hd|nvme)\d/, why: "redirect onto a disk device" },
  { re: /\bgit\s+push\b[^|;]*\s--mirror\b/, why: "git push --mirror can delete remote refs" },
];

// --- branch-flow detection -------------------------------------------------

const PROTECTED = /^(main|master)$/;

/** `gh pr create ... --base main` / `-B main` */
function prBaseTarget(cmd) {
  if (!/\bgh\s+pr\s+create\b/.test(cmd)) return null;
  const m = cmd.match(/(?:--base[=\s]+|-B\s*)(["']?)([\w./-]+)\1/);
  return m ? m[2] : null;
}

/**
 * `git push origin main`, `git push origin HEAD:main`, `git push origin foo:master`.
 * Flag tokens are dropped so `git push --set-upstream origin main` still resolves.
 */
function pushTarget(cmd) {
  if (!/\bgit\s+push\b/.test(cmd)) return null;
  const seg = cmd.split(/[;&|]{1,2}/).find((s) => /\bgit\s+push\b/.test(s)) || cmd;
  const tokens = seg.trim().split(/\s+/);
  const i = tokens.findIndex((t) => t === "push");
  if (i === -1) return null;
  const args = tokens.slice(i + 1).filter((t) => !t.startsWith("-"));
  const refspec = args[1]; // args[0] is the remote
  if (!refspec) return null;
  const branch = refspec.includes(":") ? refspec.split(":").pop() : refspec;
  return branch ? branch.replace(/^refs\/heads\//, "") : null;
}

/** Local-only check — no network, so the hook stays fast. */
function hasDevelop(cwd) {
  for (const ref of ["refs/remotes/origin/develop", "refs/heads/develop"]) {
    try {
      execFileSync("git", ["rev-parse", "--verify", "--quiet", ref], {
        cwd,
        stdio: ["ignore", "ignore", "ignore"],
      });
      return true;
    } catch {
      /* keep looking */
    }
  }
  return false;
}

// --- GitHub prose caps -----------------------------------------------------

// Caps come from rules/writing-style.md. Bullet length is the primary signal:
// the observed failure mode is a small number of enormous bullets, not many
// small ones, so a total-size cap alone would let the worst bodies through.
// 180 chars ≈ the 25-word cap in writing-style.md. Calibrated against real
// bodies: aretecp/bd-pulse#2667's worst bullet measures 250 of prose, so a
// 250 cap let the exact case this was built for through by one character.
const BULLET_CHARS = 180;
const BODY_CHARS = { pr: 4000, comment: 2500 };

// Only phrases with no honest use in a PR body or issue comment. Anything
// arguable (`comprehensive`, `robust`, `simply`) is left to writing-style.md —
// this list has to stay small enough that a hit is never a judgement call.
const FILLER = [
  /\b(?:I(?:'ve| have)|we(?:'ve| have))\s+successfully\b/i,
  /\bsuccessfully\s+(?:implemented|added|created|completed|fixed|updated)\b/i,
  /\bthis\s+PR\s+(?:does|aims to|serves to|seeks to)\b/i,
  /\b(?:great|excellent|good)\s+(?:question|point|catch)\b/i,
  /\bit(?:'s| is)\s+worth\s+noting\s+that\b/i,
  /\b(?:in summary|to summarize|in conclusion)\b/i,
  /\blet me know if you have any (?:questions|concerns)\b/i,
];

/** Which gh write-command this is, or null if it isn't one. */
function ghBodyKind(cmd) {
  if (/\bgh\s+pr\s+(?:create|edit)\b/.test(cmd)) return "pr";
  if (/\bgh\s+(?:issue|pr)\s+comment\b/.test(cmd)) return "comment";
  if (/\bgh\s+issue\s+create\b/.test(cmd)) return "comment";
  return null;
}

/**
 * Pull the body text out of the command. `--body-file` is read from disk;
 * `--body` takes everything after the flag, which is crude but correct for the
 * heredoc form our skills use (`--body "$(cat <<'EOF' ... EOF)"`) since the
 * text sits inline in the command string. Returns null when there's nothing to
 * check — an unreadable file or a missing flag must not block the call.
 */
function extractBody(cmd, cwd) {
  const file = cmd.match(/--body-file[=\s]+(["']?)([^\s"']+)\1/);
  if (file) {
    const p = file[2];
    if (p === "-" || p === "/dev/stdin") return null; // piped; nothing to read
    try {
      return fs.readFileSync(path.resolve(cwd, p), "utf8");
    } catch {
      return null;
    }
  }
  const i = cmd.search(/--body[=\s]/);
  if (i === -1) return null;
  let body = cmd.slice(i).replace(/^--body[=\s]+/, "");

  // Strip the shell wrapper so line 1 of `body` is line 1 of the markdown.
  // Without this a single-line `--body "- ..."` keeps its leading quote, the
  // bullet regex misses, and the longest bullets sail through unchecked.
  body = body.replace(/^"\$\(\s*cat\s*<<-?\s*['"]?\w+['"]?\s*\n?/, "");
  body = body.replace(/\n?\w+\s*\n?\)"\s*$/, "");
  body = body.replace(/^(["'])([\s\S]*)\1\s*$/, "$2");
  return body.replace(/^["']/, "").replace(/["']\s*$/, "");
}

/**
 * Length of a line's PROSE — URLs, inline code and markdown link targets are
 * stripped first. A bullet is long because of clauses, not because it cites a
 * path or a link, and blocking the latter would be pure noise.
 */
function proseLength(line) {
  return line
    .replace(/`[^`]*`/g, "")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim().length;
}

/** Returns a block reason, or null if the body passes. */
function checkProse(body, kind) {
  for (const re of FILLER) {
    const hit = body.match(re);
    if (hit) {
      return (
        `filler phrase "${hit[0]}" in a ${kind} body.\n` +
        `rules/writing-style.md bans it. Delete the phrase and state the fact.`
      );
    }
  }

  for (const line of body.split("\n")) {
    if (!/^\s*[-*]\s+/.test(line)) continue;
    const len = proseLength(line);
    if (len > BULLET_CHARS) {
      return (
        `a bullet runs ${len} chars of prose (cap ${BULLET_CHARS}):\n` +
        `  ${line.trim().slice(0, 120)}...\n` +
        `Split it. One clause per bullet — no trailing "— which resolves..." tails.`
      );
    }
  }

  const cap = BODY_CHARS[kind];
  if (body.length > cap) {
    return (
      `${kind} body is ${body.length} chars (cap ${cap}).\n` +
      `Cut narration and self-assessment; keep facts, paths and tradeoffs.`
    );
  }
  return null;
}

function decide(decision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: decision,
        permissionDecisionReason: reason,
      },
    }) + "\n"
  );
  process.exit(0);
}

async function main() {
  let input = "";
  const rl = readline.createInterface({ input: process.stdin });
  for await (const line of rl) input += line;

  let hookData = {};
  try {
    hookData = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const command = hookData.tool_input?.command || "";
  const cwd = hookData.cwd || process.cwd();

  for (const { re, why } of BLOCKED_PATTERNS) {
    if (re.test(command)) {
      console.error(`[guard-bash] BLOCKED (${why}): ${command}`);
      process.exit(2);
    }
  }

  const base = prBaseTarget(command);
  const pushed = pushTarget(command);
  const target = base || pushed;
  if (target && PROTECTED.test(target)) {
    const verb = base ? `open a PR against \`${target}\`` : `push directly to \`${target}\``;
    if (hasDevelop(cwd)) {
      console.error(
        `[guard-bash] BLOCKED: attempted to ${verb}, but this repo has a \`develop\` branch.\n` +
          `Branch flow is feature -> develop -> main. ${target} is release + production deploy.\n` +
          (base
            ? `Re-run with --base develop.`
            : `Push your feature branch and open a PR into develop instead.`)
      );
      process.exit(2);
    }
    return decide(
      "ask",
      `This would ${verb}. No local \`develop\` ref was found, so this may be a ` +
        `single-branch repo — or origin/develop just isn't fetched yet. Confirm with ` +
        `\`git ls-remote --heads origin develop\` before proceeding.`
    );
  }

  // Prose caps run last: a body-shape complaint on a command that was going to
  // be blocked for its base branch anyway would just bury the real problem.
  const kind = ghBodyKind(command);
  if (kind) {
    const body = extractBody(command, cwd);
    const reason = body && checkProse(body, kind);
    if (reason) {
      console.error(`[guard-bash] BLOCKED: ${reason}`);
      process.exit(2);
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
