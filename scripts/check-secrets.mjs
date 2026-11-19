#!/usr/bin/env node
// Offline, redacted pre-publication checks. This is a heuristic guard, not a security audit.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const git = (...args) =>
  execFileSync("git", args, { maxBuffer: 128 * 1024 * 1024 });
const root = git("rev-parse", "--show-toplevel").toString().trim();
process.chdir(root);
const history = process.argv.includes("--history");
const findings = new Set();
const rules = [
  [
    "private-key",
    /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g,
  ],
  ["aws-access-key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  [
    "github-token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g,
  ],
  [
    "provider-token",
    /\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,}|hf_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}|AIza[A-Za-z0-9_-]{35})\b/g,
  ],
  [
    "jwt",
    /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{20,}\b/g,
  ],
  [
    "credential-url",
    /\b(?:postgres(?:ql)?|mysql|redis|mongodb(?:\+srv)?|https?):\/\/[^\s/:@]+:([^\s/@]+)@[^\s/]+/gi,
  ],
  [
    "secret-assignment",
    /\b(?:[A-Z0-9_]*(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PASSPHRASE|PRIVATE[_-]?KEY|ACCESS[_-]?KEY)[A-Z0-9_]*)["']?\s*[:=]\s*["']([A-Za-z0-9_+/=.-]{12,})["']/gi,
  ],
  [
    "env-secret-assignment",
    /^\s*(?:export\s+)?[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASSPHRASE)[A-Z0-9_]*\s*=\s*([^\s#"']{12,})/gm,
  ],
];
const placeholder =
  /^(?:\$\{.*\}|\.{3}|change[-_]?me|replace[-_]?me|your[-_].*|example[-_].*|placeholder|undefined|null|true|false|[xX*]+)$/i;
const safeEnvExample =
  /(?:^|\/)(?:\.env(?:\.[\w-]+)?\.(?:example|sample|template)|[^/]+\.env\.(?:example|sample|template))$/;
function riskyPath(file) {
  if (safeEnvExample.test(file)) return false;
  return /(?:^|\/)(?:\.env(?:\.[^/]+)?|\.data|\.aws|\.ssh|id_rsa|id_ed25519)(?:\/|$)|\.(?:pem|key|p12|pfx)$/i.test(
    file,
  );
}
function scan(file, bytes, scope) {
  if (riskyPath(file)) findings.add(`${scope} ${file}: sensitive filename`);
  if (bytes.includes(0)) return; // Text rules cannot inspect binary screenshots or archives.
  const text = bytes.toString("utf8");
  for (const [name, pattern] of rules) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (match[1] && placeholder.test(match[1])) continue;
      const line = text.slice(0, match.index).split("\n").length;
      findings.add(`${scope} ${file}:${line}: ${name} [REDACTED]`);
    }
  }
}
const tracked = git("ls-files", "-z").toString().split("\0").filter(Boolean);
const untracked = git("ls-files", "--others", "--exclude-standard", "-z")
  .toString()
  .split("\0")
  .filter(Boolean);
for (const file of [...new Set([...tracked, ...untracked])]) {
  if (existsSync(file)) scan(file, readFileSync(file), "worktree");
}
// Scan the index too: staged content can differ from the file on disk.
for (const entry of git("ls-files", "--stage", "-z")
  .toString()
  .split("\0")
  .filter(Boolean)) {
  const [metadata, file] = entry.split("\t");
  const oid = metadata.split(" ")[1];
  scan(file, git("cat-file", "blob", oid), "index");
}
let blobCount = 0;
if (history) {
  const objects = git("rev-list", "--objects", "--all", "--reflog")
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);
  for (const entry of objects) {
    const space = entry.indexOf(" ");
    if (space < 0) continue;
    const oid = entry.slice(0, space),
      file = entry.slice(space + 1);
    if (git("cat-file", "-t", oid).toString().trim() !== "blob") continue;
    blobCount++;
    scan(file, git("cat-file", "blob", oid), `history:${oid.slice(0, 12)}`);
  }
  // Path-only history catches renames of an identical blob to a sensitive filename.
  for (const file of git("log", "--all", "--reflog", "--format=", "--name-only")
    .toString()
    .split("\n")
    .filter(Boolean)) {
    if (riskyPath(file)) findings.add(`history ${file}: sensitive filename`);
  }
}
console.log(
  `Checked ${tracked.length} tracked files, ${untracked.length} untracked non-ignored files, staged blobs${history ? ` and ${blobCount} historical blobs (all local refs + reflogs)` : ""}.`,
);
if (findings.size) {
  console.error([...findings].join("\n"));
  console.error(
    "Review findings before publication. Secret values are never printed.",
  );
  process.exitCode = 1;
} else {
  console.log(
    "No matches for the configured secret patterns or sensitive filenames.",
  );
}
console.log(
  "Limits: heuristic text matching; ignored local files, binary contents, unreachable objects, remote-only refs, Issues/Actions/artifacts and previously copied data are not covered.",
);
