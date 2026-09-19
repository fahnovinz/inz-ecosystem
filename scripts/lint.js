#!/usr/bin/env node
/**
 * Dependency-free syntax gate: parses every tracked JS file with `node --check`.
 *
 * Replaces the hand-maintained file list that CI used to carry, so adding a
 * module no longer means remembering to add it to the workflow too.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DIRS = ["bin", "src", "test", "scripts"];
const SKIP = new Set(["node_modules", "coverage", ".git"]);

function collect(dir) {
  const absolute = path.join(ROOT, dir);
  if (!fs.existsSync(absolute)) return [];

  return fs
    .readdirSync(absolute, { withFileTypes: true })
    .flatMap((entry) => {
      if (SKIP.has(entry.name)) return [];
      const relative = path.join(dir, entry.name);
      if (entry.isDirectory()) return collect(relative);
      return entry.name.endsWith(".js") ? [relative] : [];
    });
}

const files = DIRS.flatMap(collect).sort();
const failures = [];

for (const file of files) {
  try {
    execFileSync(process.execPath, ["--check", path.join(ROOT, file)], { stdio: "pipe" });
  } catch (error) {
    failures.push(`${file}\n${String(error.stderr || error.message).trim()}`);
  }
}

if (failures.length) {
  console.error(`lint: ${failures.length} file(s) failed to parse\n`);
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log(`lint: ${files.length} JavaScript file(s) parsed cleanly`);
