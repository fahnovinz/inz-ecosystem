const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  fetchGitHubStats,
  countMergedPrs,
  countRecentEvents,
  analyzeRepos,
} = require("../src/github-stats");
const { setFetch, resetFetch } = require("../src/github-api");

function ok(body) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function fail(status, message) {
  return {
    ok: false,
    status,
    json: async () => ({ message }),
    text: async () => message,
  };
}

/** Route mock by exact pathname (query string ignored). */
function routeFetch(handlers) {
  return async (input) => {
    const url = new URL(String(input));
    const path = url.pathname;
    for (const [match, handler] of handlers) {
      const hit = typeof match === "function" ? match(path, url) : path === match;
      if (hit) {
        const body = typeof handler === "function" ? handler(url) : handler;
        if (body && body.__fail) return fail(body.__fail, body.message || "error");
        return ok(body);
      }
    }
    return fail(404, `No mock for ${path}`);
  };
}

const recentIso = () => new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
const oldIso = () => new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();

describe("fetchGitHubStats (full flow E2E, mocked network)", () => {
  afterEach(() => {
    resetFetch();
  });

  it("returns complete report shape from all API branches", async () => {
    const recent = recentIso();
    const created = "2019-06-01T12:00:00Z";

    setFetch(
      routeFetch([
        [
          "/users/indie",
          {
            login: "indie",
            name: "Indie Dev",
            bio: "builds tools",
            public_repos: 5,
            followers: 10,
            following: 2,
            created_at: created,
            html_url: "https://github.com/indie",
          },
        ],
        [
          "/users/indie/events/public",
          [
            { type: "PushEvent", created_at: recent },
            { type: "IssuesEvent", created_at: recent },
            { type: "WatchEvent", created_at: oldIso() }, // outside 90d window
          ],
        ],
        ["/search/issues", { total_count: 7 }],
        [
          "/users/indie/repos",
          [
            {
              full_name: "indie/alpha",
              private: false,
              fork: false,
              stargazers_count: 5,
              license: { spdx_id: "MIT" },
              language: "JavaScript",
              updated_at: recent,
            },
            {
              full_name: "indie/beta",
              private: false,
              fork: false,
              stargazers_count: 3,
              license: null,
              language: "JavaScript",
              updated_at: recent,
            },
            {
              full_name: "indie/gamma",
              private: false,
              fork: false,
              stargazers_count: 1,
              license: { spdx_id: "Apache-2.0" },
              language: "Python",
              updated_at: recent,
            },
            {
              full_name: "indie/secret",
              private: true,
              fork: false,
              stargazers_count: 99,
              language: "Go",
              updated_at: recent,
            },
            {
              full_name: "indie/forked-tool",
              private: false,
              fork: true,
              stargazers_count: 50,
              language: "Rust",
              updated_at: recent,
            },
            {
              full_name: "indie/nolang",
              private: false,
              fork: false,
              stargazers_count: 0,
              license: null,
              language: null,
              updated_at: recent,
            },
          ],
        ],
        [
          "/repos/indie/alpha/contributors",
          [{ login: "indie" }, { login: "alice" }, { login: "bob" }],
        ],
        [
          "/repos/indie/beta/contributors",
          [{ login: "indie" }, { login: "carol" }],
        ],
        [
          "/repos/indie/gamma/contributors",
          { __fail: 403, message: "Forbidden" },
        ],
        [
          "/repos/indie/nolang/contributors",
          [{ login: "INDIE" }], // case-insensitive self filter
        ],
      ])
    );

    const report = await fetchGitHubStats("indie", { token: "ghp_test" });

    // profile
    assert.equal(report.username, "indie");
    assert.deepEqual(report.profile, {
      name: "Indie Dev",
      bio: "builds tools",
      publicRepos: 5,
      followers: 10,
      following: 2,
      createdAt: created,
      url: "https://github.com/indie",
    });
    assert.ok(report.accountAgeDays > 1000);

    // events: WatchEvent is old → only 2 recent; types unique
    assert.equal(report.recentActivity.count, 2);
    assert.ok(report.recentActivity.types.includes("PushEvent"));
    assert.ok(report.recentActivity.types.includes("IssuesEvent"));
    assert.ok(!report.recentActivity.types.includes("WatchEvent"));

    // PRs
    assert.equal(report.mergedPrs, 7);

    // repos: private + fork excluded → alpha, beta, gamma, nolang
    assert.equal(report.repoStats.totalPublic, 4);
    assert.equal(report.repoStats.totalStars, 5 + 3 + 1 + 0);
    assert.equal(report.repoStats.licensed, 2);

    // language ranking: JS x2 before Python x1; null language skipped
    assert.deepEqual(report.repoStats.topLanguages, [
      { name: "JavaScript", repos: 2 },
      { name: "Python", repos: 1 },
    ]);

    // top contributors: alpha has 2 external > beta 1; gamma failed → skipped
    assert.equal(report.repoStats.topContributors, 2);
    assert.equal(report.repoStats.topContributorRepo, "indie/alpha");

    // topRepos list
    assert.equal(report.repoStats.topRepos.length, 4);
    assert.equal(report.repoStats.topRepos[0].name, "indie/alpha");
    assert.equal(report.repoStats.topRepos[0].license, "MIT");
    assert.equal(report.repoStats.topRepos[1].license, "none");
    assert.equal(report.repoStats.topRepos[3].language, "—");
    assert.equal(report.repoStats.topRepos[3].name, "indie/nolang");
  });

  it("handles empty activity and zero PR total_count", async () => {
    setFetch(
      routeFetch([
        [
          "/users/empty",
          {
            login: "empty",
            name: null,
            bio: null,
            public_repos: 0,
            followers: 0,
            following: 0,
            created_at: "2024-01-01T00:00:00Z",
            html_url: "https://github.com/empty",
          },
        ],
        ["/users/empty/events/public", []],
        ["/search/issues", {}], // missing total_count → 0
        ["/users/empty/repos", []],
      ])
    );

    const report = await fetchGitHubStats("empty");

    assert.equal(report.profile.name, null);
    assert.equal(report.mergedPrs, 0);
    assert.equal(report.recentActivity.count, 0);
    assert.deepEqual(report.recentActivity.types, []);
    assert.equal(report.repoStats.totalPublic, 0);
    assert.equal(report.repoStats.totalStars, 0);
    assert.equal(report.repoStats.licensed, 0);
    assert.equal(report.repoStats.topContributors, 0);
    assert.equal(report.repoStats.topContributorRepo, null);
    assert.deepEqual(report.repoStats.topLanguages, []);
    assert.deepEqual(report.repoStats.topRepos, []);
  });

  it("propagates profile fetch errors", async () => {
    setFetch(async () => fail(404, "Not Found"));
    await assert.rejects(() => fetchGitHubStats("missing"), /GitHub API 404/);
  });
});

describe("github-stats helpers (unit, mocked network)", () => {
  afterEach(() => {
    resetFetch();
  });

  it("countMergedPrs reads total_count", async () => {
    setFetch(routeFetch([["/search/issues", { total_count: 12 }]]));
    assert.equal(await countMergedPrs("u", "t"), 12);
  });

  it("countMergedPrs defaults missing total_count to 0", async () => {
    setFetch(routeFetch([["/search/issues", { incomplete_results: false }]]));
    assert.equal(await countMergedPrs("u"), 0);
  });

  it("countRecentEvents filters by 90-day window", async () => {
    setFetch(
      routeFetch([
        [
          "/users/u/events/public",
          [
            { type: "PushEvent", created_at: recentIso() },
            { type: "CreateEvent", created_at: oldIso() },
          ],
        ],
      ])
    );
    const result = await countRecentEvents("u");
    assert.equal(result.count, 1);
    assert.deepEqual(result.types, ["PushEvent"]);
  });

  it("analyzeRepos picks highest external contributor repo", async () => {
    setFetch(
      routeFetch([
        [
          "/users/u/repos",
          [
            {
              full_name: "u/a",
              private: false,
              fork: false,
              stargazers_count: 1,
              license: { spdx_id: "MIT" },
              language: "Go",
              updated_at: recentIso(),
            },
            {
              full_name: "u/b",
              private: false,
              fork: false,
              stargazers_count: 2,
              license: { spdx_id: "MIT" },
              language: "Go",
              updated_at: recentIso(),
            },
          ],
        ],
        ["/repos/u/a/contributors", [{ login: "u" }, { login: "x" }]],
        [
          "/repos/u/b/contributors",
          [{ login: "u" }, { login: "x" }, { login: "y" }, { login: "z" }],
        ],
      ])
    );

    const stats = await analyzeRepos("u");
    assert.equal(stats.topContributors, 3);
    assert.equal(stats.topContributorRepo, "u/b");
    assert.equal(stats.totalPublic, 2);
    assert.equal(stats.totalStars, 3);
  });

  it("analyzeRepos skips contributor API failures", async () => {
    setFetch(
      routeFetch([
        [
          "/users/u/repos",
          [
            {
              full_name: "u/locked",
              private: false,
              fork: false,
              stargazers_count: 0,
              language: "C",
              updated_at: recentIso(),
            },
          ],
        ],
        ["/repos/u/locked/contributors", { __fail: 403, message: "Forbidden" }],
      ])
    );

    const stats = await analyzeRepos("u");
    assert.equal(stats.topContributors, 0);
    assert.equal(stats.topContributorRepo, null);
    assert.equal(stats.totalPublic, 1);
  });
});
