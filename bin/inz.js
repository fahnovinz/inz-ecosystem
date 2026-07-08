#!/usr/bin/env node

const { fetchGitHubStats } = require("../src/github-stats");
const { fetchRepoHealth } = require("../src/repo-health");
const { fetchRepoBadges } = require("../src/badges");
const { printStatsReport, printHealthReport, printBadgesReport } = require("../src/report");
const { parseRepo } = require("../src/utils");

const VERSION = "0.2.0";
const args = process.argv.slice(2);
const command = args[0] || "help";

function hasFlag(name) {
  return args.includes(name);
}

function parseFlag(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function positionalArg() {
  return args[1];
}

function printHelp() {
  console.log(`
inz — INZ Ecosystem CLI v${VERSION}

Usage:
  inz stats <username>              Profile & portfolio analytics
  inz health <owner/repo>           Repository health score
  inz badges <owner/repo>           Generate README badge markdown
  inz version                       Show version
  inz help                          Show this help

Options:
  --json                            Output as JSON
  --token <token>                   GitHub token (or set GITHUB_TOKEN)

Examples:
  inz stats fahnovinz
  inz health fahnovinz/inz-ecosystem
  inz badges fahnovinz/inz-ecosystem --json
`);
}

function output(data, printer) {
  if (hasFlag("--json")) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  printer(data);
}

async function main() {
  const token = parseFlag("--token") || process.env.GITHUB_TOKEN;

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "version" || command === "-v") {
    console.log(`inz v${VERSION}`);
    return;
  }

  if (command === "stats") {
    const username = positionalArg();
    if (!username) {
      console.error("Error: username required.\n");
      printHelp();
      process.exit(1);
    }

    try {
      const report = await fetchGitHubStats(username, { token });
      output(report, printStatsReport);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    return;
  }

  if (command === "health") {
    const repo = positionalArg();
    if (!repo) {
      console.error("Error: owner/repo required.\n");
      printHelp();
      process.exit(1);
    }

    try {
      parseRepo(repo);
      const report = await fetchRepoHealth(repo, { token });
      output(report, printHealthReport);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    return;
  }

  if (command === "badges") {
    const repo = positionalArg();
    if (!repo) {
      console.error("Error: owner/repo required.\n");
      printHelp();
      process.exit(1);
    }

    try {
      parseRepo(repo);
      const report = await fetchRepoBadges(repo, { token });
      output(report, printBadgesReport);
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