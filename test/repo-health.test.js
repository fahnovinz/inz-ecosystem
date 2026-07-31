const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  fetchRepoHealth,
  scoreFromContext,
  CHECKS,
  hasWorkflows,
} = require("../src/repo-health");
const { setFetch, resetFetch } = require("../src/github-api");

describe("repo-health scoring (pure)", () => {
  it("exports eight weighted checks totaling 100", () => {
    assert.equal(CHECKS.length, 8);
    const total = CHECKS.reduce((s, c) => s + c.weight, 0);
    assert.equal(total, 100);
  });

  it("scoreFromContext grades Excellent when all pass", () => {
    const { score, grade, checks } = scoreFromContext({
      repo: {
        description: "A solid project",
        license: { spdx_id: "MIT" },
        has_issues: true,
        pushed_at: new Date().toISOString(),
      },
      topics: ["cli"],
      hasReadme: true,
      hasContributing: true,
      hasCi: true,
    });

    assert.equal(score, 100);
    assert.equal(grade, "Excellent");
    assert.ok(checks.every((c) => c.passed));
  });

  it("fails description and CI when empty / missing", () => {
    const { score, checks } = scoreFromContext({
      repo: {
        description: "  ",
        license: null,
        has_issues: false,
        pushed_at: "2010-01-01T00:00:00Z",
      },
      topics: [],
      hasReadme: false,
      hasContributing: false,
      hasCi: false,
    });

    assert.equal(score, 0);
    assert.equal(checks.find((c) => c.id === "description").passed, false);
    assert.equal(checks.find((c) => c.id === "ci").passed, false);
  });
});

describe("repo-health network (mocked)", () => {
  afterEach(() => {
    resetFetch();
  });

  it("hasWorkflows true when Actions API lists a workflow", async () => {
    setFetch(async (input) => {
      const path = new URL(String(input)).pathname;
      if (path.endsWith("/actions/workflows")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ total_count: 1, workflows: [{ name: "CI" }] }),
          text: async () => "",
        };
      }
      return { ok: false, status: 404, json: async () => ({}), text: async () => "no" };
    });

    assert.equal(await hasWorkflows("o", "r", null), true);
  });

  it("hasWorkflows falls back to .github/workflows directory listing", async () => {
    setFetch(async (input) => {
      const path = new URL(String(input)).pathname;
      if (path.endsWith("/actions/workflows")) {
        return {
          ok: false,
          status: 403,
          json: async () => ({ message: "Actions disabled" }),
          text: async () => "Actions disabled",
        };
      }
      if (path.endsWith("/contents/.github/workflows")) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { name: "ci.yml", type: "file" },
            { name: "README.md", type: "file" },
          ],
          text: async () => "",
        };
      }
      return { ok: false, status: 404, json: async () => ({}), text: async () => "no" };
    });

    assert.equal(await hasWorkflows("o", "r", null), true);
  });

  it("fetchRepoHealth builds score from mocked endpoints", async () => {
    const pushed = new Date().toISOString();

    setFetch(async (input) => {
      const path = new URL(String(input)).pathname;
      let body;
      let status = 200;

      if (path === "/repos/acme/widget") {
        body = {
          full_name: "acme/widget",
          html_url: "https://github.com/acme/widget",
          description: "Test widget",
          license: { spdx_id: "MIT" },
          has_issues: true,
          pushed_at: pushed,
          stargazers_count: 1,
          forks_count: 0,
          open_issues_count: 0,
          language: "JavaScript",
          default_branch: "main",
        };
      } else if (path === "/repos/acme/widget/topics") {
        body = { names: ["test", "cli"] };
      } else if (path === "/repos/acme/widget/contents/README.md") {
        body = { name: "README.md", type: "file" };
      } else if (path === "/repos/acme/widget/contents/CONTRIBUTING.md") {
        body = { name: "CONTRIBUTING.md", type: "file" };
      } else if (path === "/repos/acme/widget/actions/workflows") {
        body = { total_count: 1, workflows: [{ path: ".github/workflows/ci.yml" }] };
      } else {
        status = 404;
        body = { message: "Not Found" };
      }

      return {
        ok: status < 400,
        status,
        json: async () => body,
        text: async () => JSON.stringify(body),
      };
    });

    const report = await fetchRepoHealth("acme/widget");
    assert.equal(report.fullName, "acme/widget");
    assert.equal(report.score, 100);
    assert.equal(report.grade, "Excellent");
    assert.equal(report.meta.license, "MIT");
    assert.ok(report.checks.find((c) => c.id === "ci").passed);
  });
});
