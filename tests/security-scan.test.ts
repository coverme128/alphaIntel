import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const scanner = path.resolve("scripts/check-secrets.mjs");
function repo(run: (dir: string, git: (...args: string[]) => void) => void) {
  const dir = mkdtempSync(path.join(tmpdir(), "alpha-secret-test-"));
  const git = (...args: string[]) => {
    execFileSync("git", args, { cwd: dir, stdio: "pipe" });
  };
  try {
    git("init");
    git("config", "user.name", "Test Fixture");
    git("config", "user.email", "test@example.invalid");
    run(dir, git);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
function scan(dir: string, history = false) {
  return spawnSync(
    process.execPath,
    [scanner, ...(history ? ["--history"] : [])],
    {
      cwd: dir,
      encoding: "utf8",
    },
  );
}
// Deliberately synthetic; assemble at runtime so this fixture is not a token-shaped repository string.
const fakeToken = () => "gh" + "p_" + "A".repeat(36);

test("secret scan allows sanitized templates but rejects local env variants without echoing values", () => {
  repo((dir, git) => {
    writeFileSync(
      path.join(dir, ".env.example"),
      "PORT=4317\nAPI_KEY=your-placeholder-value\n",
    );
    git("add", ".env.example");
    assert.equal(scan(dir).status, 0);
    writeFileSync(
      path.join(dir, ".env.production.local"),
      `API_KEY=${fakeToken()}\n`,
    );
    const result = scan(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /sensitive filename/);
    assert.match(result.stderr, /github-token/);
    assert.ok(!result.stderr.includes(fakeToken()));
  });
});

test("secret scan detects staged secrets even when the working file is cleaned", () => {
  repo((dir, git) => {
    writeFileSync(path.join(dir, "config.txt"), fakeToken());
    git("add", "config.txt");
    writeFileSync(path.join(dir, "config.txt"), "safe");
    const result = scan(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /index config.txt:1: github-token/);
    assert.ok(!result.stderr.includes(fakeToken()));
  });
});

test("history scan detects a secret removed from current HEAD", () => {
  repo((dir, git) => {
    writeFileSync(path.join(dir, "config.txt"), fakeToken());
    git("add", "config.txt");
    git("commit", "-m", "synthetic fixture");
    writeFileSync(path.join(dir, "config.txt"), "safe");
    git("add", "config.txt");
    git("commit", "-m", "remove synthetic fixture");
    assert.equal(scan(dir).status, 0);
    const result = scan(dir, true);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /history:.*config.txt:1: github-token/);
    assert.ok(!result.stderr.includes(fakeToken()));
  });
});
