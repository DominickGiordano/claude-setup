#!/usr/bin/env node
/**
 * guard-bash.js
 * Fires on PreToolUse for Bash. Two jobs:
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

  process.exit(0);
}

main().catch(() => process.exit(0));
