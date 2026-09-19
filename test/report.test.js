const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  printStatsReport,
  printHealthReport,
  printBadgesReport,
  printProductsReport,
} = require("../src/report");

function capture(fn) {
  const chunks = [];
  const original = console.log;
  console.log = (...args) => {
    chunks.push(args.map(String).join(" "));
  };
  try {
    fn();
  } finally {
    console.log = original;
  }
  return chunks.join("\n");
}

describe("report printers", () => {
  it("printStatsReport includes profile and portfolio lines", () => {
    const out = capture(() =>
      printStatsReport({
        username: "demo",
        accountAgeDays: 100,
        profile: {
          name: "Demo",
          bio: "bio",
          url: "https://github.com/demo",
          createdAt: "2020-01-01",
          followers: 1,
          publicRepos: 2,
        },
        recentActivity: { count: 3, types: ["PushEvent"] },
        mergedPrs: 1,
        repoStats: {
          totalPublic: 2,
          totalStars: 4,
          licensed: 1,
          topLanguages: [{ name: "JS", repos: 2 }],
          topRepos: [
            {
              name: "demo/app",
              stars: 4,
              language: "JS",
              license: "MIT",
            },
          ],
        },
      })
    );

    assert.match(out, /INZ GitHub Stats/);
    assert.match(out, /@demo/);
    assert.match(out, /Merged PRs/);
    assert.match(out, /demo\/app/);
    assert.match(out, /Languages/);
  });

  it("printHealthReport shows score and checks", () => {
    const out = capture(() =>
      printHealthReport({
        fullName: "a/b",
        score: 85,
        grade: "Good",
        url: "https://github.com/a/b",
        checks: [
          { label: "README present", passed: true },
          { label: "CI workflow detected", passed: false },
        ],
        meta: {
          stars: 1,
          openIssues: 0,
          language: "JavaScript",
          license: "MIT",
          pushedAt: "2026-01-01",
        },
      })
    );

    assert.match(out, /85\/100/);
    assert.match(out, /\[ok\] README present/);
    assert.match(out, /\[--\] CI workflow detected/);
  });

  it("printBadgesReport prints markdown block", () => {
    const out = capture(() =>
      printBadgesReport({
        fullName: "a/b",
        markdown: "![stars](https://img.shields.io/x)",
      })
    );
    assert.match(out, /INZ Badges/);
    assert.match(out, /shields\.io/);
  });

  it("printProductsReport lists flagship and tools", () => {
    const out = capture(() =>
      printProductsReport({
        homepage: "https://github.com/fahnovinz/inz-ecosystem",
        version: "0.3.2",
        summary: { products: 1, tools: 1 },
        products: [
          {
            kind: "product",
            name: "VRAXTAL VAULT",
            status: "flagship",
            tagline: "vault",
            url: "https://github.com/fahnovinz/vraxtal-vault",
            stack: ["Node.js"],
            highlights: ["encrypted"],
          },
          {
            kind: "tool",
            name: "INZ Stats",
            tagline: "stats",
            command: "inz stats <u>",
          },
        ],
      })
    );

    assert.match(out, /Flagship product/);
    assert.match(out, /VRAXTAL VAULT/);
    assert.match(out, /Developer tools/);
    assert.match(out, /inz stats/);
  });
});

describe("report printers — optional sections", () => {
  it("printStatsReport shows archived count and top collaborator repo", () => {
    const out = capture(() =>
      printStatsReport({
        username: "demo",
        accountAgeDays: 10,
        profile: { url: "https://github.com/demo", createdAt: "2020-01-01", followers: 0, publicRepos: 1 },
        recentActivity: { windowDays: 90, count: 0, types: [] },
        mergedPrs: 0,
        repoStats: {
          totalPublic: 3,
          totalStars: 0,
          licensed: 1,
          archived: 2,
          topContributors: 4,
          topContributorRepo: "demo/app",
          topLanguages: [],
          topRepos: [],
        },
      })
    );

    assert.match(out, /Archived\s+2/);
    assert.match(out, /Collaborators 4 on demo\/app/);
    assert.match(out, /Types\s+—/);
  });

  it("printHealthReport lists next steps for failing checks only", () => {
    const out = capture(() =>
      printHealthReport({
        fullName: "demo/app",
        url: "https://github.com/demo/app",
        score: 75,
        grade: "Good",
        checks: [
          { id: "readme", label: "README present", weight: 15, passed: true },
          { id: "topics", label: "Topics configured", weight: 10, passed: false, remedy: "Add topics." },
        ],
        meta: {
          stars: 0,
          openIssues: 0,
          language: null,
          license: null,
          pushedAt: "2026-01-01T00:00:00Z",
          archived: true,
        },
      })
    );

    assert.match(out, /Next steps/);
    assert.match(out, /→ Add topics\. \(\+10\)/);
    assert.ok(!out.includes("README present (+"), "passing checks must not appear as next steps");
    assert.match(out, /Archived\s+yes/);
  });
});
