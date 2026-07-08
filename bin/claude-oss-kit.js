#!/usr/bin/env node

const { checkEligibility } = require("../src/check-eligibility");
const { printReport } = require("../src/report");
const { generateApplicationDraft } = require("../src/application-draft");

const args = process.argv.slice(2);
const command = args[0] || "check";

function printHelp() {
  console.log(`
claude-oss-kit — Toolkit untuk program Claude for Open Source

Usage:
  claude-oss-kit check <github-username> [--token GITHUB_TOKEN]
  claude-oss-kit draft <github-username> [--repo owner/repo]
  claude-oss-kit help

Commands:
  check   Cek kelayakan berdasarkan profil GitHub publik
  draft   Generate draft teks aplikasi (max 500 kata)
  help    Tampilkan bantuan ini

Environment:
  GITHUB_TOKEN  Opsional, meningkatkan rate limit API GitHub

Apply: https://claude.com/contact-sales/claude-for-oss
Form:  https://claude.com/open-source-max
`);
}

function parseFlag(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

async function main() {
  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const username = args[1];
  if (!username) {
    console.error("Error: GitHub username wajib diisi.\n");
    printHelp();
    process.exit(1);
  }

  const token = parseFlag("--token") || process.env.GITHUB_TOKEN;
  const repo = parseFlag("--repo");

  try {
    if (command === "check") {
      const report = await checkEligibility(username, { token });
      printReport(report);
      process.exit(report.readyToApply ? 0 : 1);
    }

    if (command === "draft") {
      const report = await checkEligibility(username, { token });
      const draft = generateApplicationDraft(report, { repo });
      console.log(draft);
      return;
    }

    console.error(`Error: perintah tidak dikenal "${command}"\n`);
    printHelp();
    process.exit(1);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();