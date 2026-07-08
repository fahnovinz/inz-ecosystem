#!/usr/bin/env node

const { fetchGitHubStats } = require("../src/github-stats");
const { printStatsReport } = require("../src/report");

const args = process.argv.slice(2);
const command = args[0] || "help";

function printHelp() {
  console.log(`
inz — INZ Ecosystem CLI

Usage:
  inz stats <github-username> [--token GITHUB_TOKEN]
  inz help

Commands:
  stats   Show GitHub profile & repo analytics
  help    Show this help

Environment:
  GITHUB_TOKEN  Optional, increases GitHub API rate limit
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

  if (command === "stats") {
    const username = args[1];
    if (!username) {
      console.error("Error: GitHub username required.\n");
      printHelp();
      process.exit(1);
    }

    const token = parseFlag("--token") || process.env.GITHUB_TOKEN;

    try {
      const report = await fetchGitHubStats(username, { token });
      printStatsReport(report);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    return;
  }

  console.error(`Error: unknown command "${command}"\n`);
  printHelp();
  process.exit(1);
}

main();