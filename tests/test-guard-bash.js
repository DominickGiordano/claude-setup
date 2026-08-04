#!/usr/bin/env node
// Test harness for guard-bash.js. Cases live in this file so the patterns under
// test never appear in a shell command line (the guard would block its own test).
const { spawnSync } = require("child_process");
const path = require("path");

const HOOK = process.argv[2];
const WITH_DEV = process.argv[3]; // repo that has a develop branch
const NO_DEV = process.argv[4]; // repo that does not

const D = "/dev/" + "disk";
const cases = [
  ["repo WITH develop", "gh pr create --base main --title x", WITH_DEV, "deny"],
  ["repo WITH develop", "gh pr create -B main", WITH_DEV, "deny"],
  ["repo WITH develop", "gh pr create --base=main", WITH_DEV, "deny"],
  ["repo WITH develop", "gh pr create --base develop", WITH_DEV, "allow"],
  ["repo WITH develop", "git push origin main", WITH_DEV, "deny"],
  ["repo WITH develop", "git push --set-upstream origin main", WITH_DEV, "deny"],
  ["repo WITH develop", "git push origin HEAD:master", WITH_DEV, "deny"],
  ["repo WITH develop", "git push origin feature/x", WITH_DEV, "allow"],
  ["repo WITH develop", "git push origin develop", WITH_DEV, "allow"],
  ["no develop", "gh pr create --base main", NO_DEV, "ask"],
  ["catastrophic", "mkfs.ext4 " + D + "2", WITH_DEV, "deny"],
  ["catastrophic", "dd if=/dev/zero of=" + D + "3", WITH_DEV, "deny"],
  ["catastrophic", "git push --mirror origin", WITH_DEV, "deny"],
  ["catastrophic", ":(){ :|:& };:", WITH_DEV, "deny"],
  ["benign", "npm test", WITH_DEV, "allow"],
  ["benign", 'git commit -m "fix: thing"', WITH_DEV, "allow"],
  ["benign", "echo main", WITH_DEV, "allow"],
  ["benign", "git log main..HEAD --oneline", WITH_DEV, "allow"],
  ["benign", "gh pr list --base main", WITH_DEV, "allow"],
];

let fail = 0;
for (const [group, command, cwd, want] of cases) {
  const r = spawnSync("node", [HOOK], {
    input: JSON.stringify({ tool_input: { command }, cwd }),
    encoding: "utf8",
  });
  let got = "allow";
  if (r.status === 2) got = "deny";
  else if (r.stdout && r.stdout.trim()) {
    try {
      const d = JSON.parse(r.stdout).hookSpecificOutput?.permissionDecision;
      if (d) got = d;
    } catch {}
  }
  const ok = got === want;
  if (!ok) fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  [${group}] want=${want} got=${got}  ${command}`
  );
}
console.log(fail === 0 ? "\nAll cases passed." : `\n${fail} case(s) FAILED.`);
process.exit(fail === 0 ? 0 : 1);
