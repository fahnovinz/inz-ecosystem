const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { run, parseArgs, UsageError, EXIT_OK } = require("../bin/inz.js");
const { setFetch, resetFetch } = require("../src/github-api");

/** Run a command with stdout captured so assertions can inspect the output. */
async function capture(argv) {
  const original = console.log;
  const lines = [];
  console.log = (...args) => lines.push(args.join(" "));
  try {
    const code = await run(argv);
    return { code, out: lines.join("\n") };
  } finally {
    console.log = original;
  }
}

describe("cli — argument parsing", () => {
  it("separates positionals from flags", () => {
    const { positionals, flags } = parseArgs(["health", "a/b", "c/d", "--json", "--token", "t"]);
    assert.deepEqual(positionals, ["health", "a/b", "c/d"]);
    assert.equal(flags["--json"], true);
    assert.equal(flags["--token"], "t");
  });

  it("supports --flag=value", () => {
    const { flags } = parseArgs(["products", "--kind=tool"]);
    assert.equal(flags["--kind"], "tool");
  });

  it("rejects unknown options and value-less flags", () => {
    assert.throws(() => parseArgs(["products", "--nope"]), UsageError);
    assert.throws(() => parseArgs(["badges", "a/b", "--style"]), UsageError);
  });
});

describe("cli — commands", () => {
  afterEach(() => {
    resetFetch();
  });

  it("prints help when given no arguments", async () => {
    const { code, out } = await capture([]);
    assert.equal(code, EXIT_OK);
    assert.match(out, /inz — INZ Ecosystem CLI/);
  });

  it("products --json emits parseable JSON", async () => {
    const { out } = await capture(["products", "--json"]);
    const parsed = JSON.parse(out);
    assert.equal(parsed.ecosystem, "INZ Ecosystem");
    assert.ok(parsed.products.length > 0);
  });

  it("rejects an invalid --kind", async () => {
    await assert.rejects(() => run(["products", "--kind", "widget"]), UsageError);
  });

  it("rejects an unknown command and a missing argument", async () => {
    await assert.rejects(() => run(["frobnicate"]), /unknown command/);
    await assert.rejects(() => run(["health"]), /owner\/repo required/);
    await assert.rejects(() => run(["stats"]), /username required/);
  });

  it("rejects a non-numeric --timeout", async () => {
    await assert.rejects(() => run(["products", "--timeout", "soon"]), /--timeout must be/);
  });

  it("health scores several repos and averages them", async () => {
    setFetch(async (input) => {
      const path = new URL(String(input)).pathname;
      const body = path.match(/^\/repos\/[^/]+\/[^/]+$/)
        ? {
            full_name: path.slice("/repos/".length),
            html_url: `https://github.com${path.slice("/repos".length)}`,
            description: "demo",
            license: { spdx_id: "MIT" },
            has_issues: true,
            pushed_at: new Date().toISOString(),
            stargazers_count: 0,
            forks_count: 0,
            open_issues_count: 0,
            language: "JavaScript",
            default_branch: "main",
          }
        : null;

      if (!body) return { ok: false, status: 404, json: async () => ({}), text: async () => "no" };
      return { ok: true, status: 200, json: async () => body, text: async () => "" };
    });

    const { out } = await capture(["health", "acme/one", "acme/two", "--json"]);
    const parsed = JSON.parse(out);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].fullName, "acme/one");
    assert.ok(parsed[0].checks.some((c) => !c.passed && c.remedy));
  });
});
