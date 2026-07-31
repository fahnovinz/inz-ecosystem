const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { fetchGitHubStats } = require("../src/github-stats");
const { setFetch, resetFetch } = require("../src/github-api");

describe("github-stats", () => {
  afterEach(() => {
    resetFetch();
  });

  it("aggregates profile, events, PRs, and repos from mocked API", async () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const created = "2020-01-15T00:00:00Z";

    setFetch(async (input) => {
      const url = new URL(String(input));
      const path = url.pathname;
      let body;

      if (path === "/users/demo") {
        body = {
          login: "demo",
          name: "Demo User",
          bio: "builder",
          public_repos: 2,
          followers: 3,
          following: 1,
          created_at: created,
          html_url: "https://github.com/demo",
        };
      } else if (path === "/users/demo/events/public") {
        body = [
          { type: "PushEvent", created_at: recent },
          { type: "PullRequestEvent", created_at: recent },
        ];
      } else if (path === "/search/issues") {
        body = { total_count: 4 };
      } else if (path === "/users/demo/repos") {
        body = [
          {
            full_name: "demo/app",
            private: false,
            fork: false,
            stargazers_count: 2,
            license: { spdx_id: "MIT" },
            language: "JavaScript",
            updated_at: recent,
          },
          {
            full_name: "demo/forked",
            private: false,
            fork: true,
            stargazers_count: 9,
            license: null,
            language: "Python",
            updated_at: recent,
          },
        ];
      } else if (path === "/repos/demo/app/contributors") {
        body = [{ login: "demo" }, { login: "alice" }];
      } else {
        return {
          ok: false,
          status: 404,
          json: async () => ({ message: "Not Found" }),
          text: async () => "Not Found",
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => body,
        text: async () => JSON.stringify(body),
      };
    });

    const report = await fetchGitHubStats("demo", { token: "t" });

    assert.equal(report.username, "demo");
    assert.equal(report.profile.name, "Demo User");
    assert.equal(report.profile.publicRepos, 2);
    assert.ok(report.accountAgeDays > 0);
    assert.equal(report.mergedPrs, 4);
    assert.equal(report.recentActivity.count, 2);
    assert.ok(report.recentActivity.types.includes("PushEvent"));
    // forks excluded from portfolio
    assert.equal(report.repoStats.totalPublic, 1);
    assert.equal(report.repoStats.totalStars, 2);
    assert.equal(report.repoStats.licensed, 1);
    assert.equal(report.repoStats.topLanguages[0].name, "JavaScript");
    assert.equal(report.repoStats.topContributors, 1);
    assert.equal(report.repoStats.topContributorRepo, "demo/app");
  });
});
