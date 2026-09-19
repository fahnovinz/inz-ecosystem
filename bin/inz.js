#!/usr/bin/env node

const { fetchGitHubStats } = require("../src/github-stats");
const { fetchRepoHealth } = require("../src/repo-health");
const { fetchRepoBadges } = require("../src/badges");
const { listProducts } = require("../src/products");
const { setRequestDefaults } = require("../src/github-api");
const {
  printStatsReport,
  printHealthReport,
  printBadgesReport,
  printProductsReport,
} = require("../src/report");

const VERSION = require("../package.json").version;

const EXIT_OK = 0;
const EXIT_ERROR = 1;
const EXIT_USAGE = 2;

const VALUE_FLAGS = new Set(["--token", "--kind", "--style", "--timeout"]);
const BOOLEAN_FLAGS = new Set(["--json", "--help", "-h", "--version", "-v"]);

/** Usage problems exit 2; runtime failures exit 1. Scripts can tell them apart. */
class UsageError extends Error {}

function parseArgs(argv) {
  const positionals = [];
  const flags = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (!arg.startsWith("-")) {
      positionals.push(arg);
      continue;
    }

    const eq = arg.indexOf("=");
    const name = eq === -1 ? arg : arg.slice(0, eq);

    if (VALUE_FLAGS.has(name)) {
      const value = eq === -1 ? argv[(i += 1)] : arg.slice(eq + 1);
      if (value === undefined) throw new UsageError(`option "${name}" needs a value`);
      flags[name] = value;
      continue;
    }

    if (BOOLEAN_FLAGS.has(name) && eq === -1) {
      flags[name] = true;
      continue;
    }

    throw new UsageError(`unknown option "${name}"`);
  }

  return { positionals, flags };
}

function printHelp() {
  console.log(`
inz — INZ Ecosystem CLI v${VERSION}

Usage:
  inz products                      List ecosystem products & tools
  inz stats <username>              Profile & portfolio analytics
  inz health <owner/repo>...        Repository health score (accepts several)
  inz badges <owner/repo>           Generate README badge markdown
  inz version                       Show version
  inz help                          Show this help

Options:
  --json                            Output as JSON
  --kind product|tool               Filter the products command
  --style <shields-style>           Badge style (default: flat-square)
  --token <token>                   GitHub token (or set GITHUB_TOKEN)
  --timeout <ms>                    Per-request timeout (default: 15000)

Examples:
  inz products --kind tool
  inz stats fahnovinz
  inz health fahnovinz/vraxtal-vault fahnovinz/inz-ecosystem
  inz badges https://github.com/fahnovinz/inz-ecosystem --json

Exit codes: 0 ok · 1 runtime error · 2 usage error
`);
}

function output(data, printer, flags) {
  if (flags["--json"]) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  printer(data);
}

function requireArgs(positionals, what) {
  if (positionals.length === 0) throw new UsageError(`${what} required`);
  return positionals;
}

const COMMANDS = {
  async products(positionals, flags) {
    const kind = flags["--kind"];
    if (kind && kind !== "product" && kind !== "tool") {
      throw new UsageError('--kind must be "product" or "tool"');
    }
    output(listProducts(kind ? { kind } : {}), printProductsReport, flags);
  },

  async stats(positionals, flags, options) {
    const [username] = requireArgs(positionals, "username");
    const report = await fetchGitHubStats(username, options);
    output(report, printStatsReport, flags);
  },

  async health(positionals, flags, options) {
    const repos = requireArgs(positionals, "owner/repo");
    const reports = [];

    for (const repo of repos) {
      reports.push(await fetchRepoHealth(repo, options));
    }

    if (flags["--json"]) {
      console.log(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2));
      return;
    }

    reports.forEach(printHealthReport);

    if (reports.length > 1) {
      const average = Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length);
      console.log(`  Average score across ${reports.length} repos: ${average}/100\n`);
    }
  },

  async badges(positionals, flags, options) {
    const [repo] = requireArgs(positionals, "owner/repo");
    const report = await fetchRepoBadges(repo, { ...options, style: flags["--style"] });
    output(report, printBadgesReport, flags);
  },

  async version() {
    console.log(`inz v${VERSION}`);
  },

  async help() {
    printHelp();
  },
};

COMMANDS.catalog = COMMANDS.products;

async function run(argv) {
  const { positionals, flags } = parseArgs(argv);

  if (flags["--help"] || flags["-h"] || positionals.length === 0) {
    printHelp();
    return EXIT_OK;
  }

  if (flags["--version"] || flags["-v"]) {
    await COMMANDS.version();
    return EXIT_OK;
  }

  const [command, ...rest] = positionals;
  const handler = COMMANDS[command];

  if (!handler) {
    throw new UsageError(`unknown command "${command}"`);
  }

  const timeout = flags["--timeout"];
  if (timeout !== undefined && !/^\d+$/.test(timeout)) {
    throw new UsageError("--timeout must be a positive number of milliseconds");
  }

  if (timeout) {
    setRequestDefaults({ timeoutMs: Number(timeout) });
  }

  await handler(rest, flags, { token: flags["--token"] || process.env.GITHUB_TOKEN });

  return EXIT_OK;
}

function main(argv) {
  // Piping into `head` closes stdout early; that is not an error worth a stack trace.
  process.stdout.on("error", (error) => {
    if (error.code === "EPIPE") process.exit(EXIT_OK);
  });

  return run(argv)
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      if (error instanceof UsageError) {
        console.error(`Error: ${error.message}\n`);
        printHelp();
        process.exitCode = EXIT_USAGE;
        return;
      }
      console.error(`Error: ${error.message}`);
      process.exitCode = EXIT_ERROR;
    });
}

// Importable for tests; only drives the process when run as a command.
if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { run, main, parseArgs, printHelp, UsageError, EXIT_OK, EXIT_ERROR, EXIT_USAGE };
