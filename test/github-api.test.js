const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  githubFetch,
  githubFetchAll,
  setFetch,
  resetFetch,
  setRequestDefaults,
  resetRequestDefaults,
} = require("../src/github-api");
const { createMockFetch } = require("./helpers/mock-fetch");

describe("github-api", () => {
  afterEach(() => {
    resetFetch();
  });

  it("githubFetch returns JSON and sends auth header", async () => {
    const mock = createMockFetch({
      "/users/octocat": { login: "octocat", id: 1 },
    });
    setFetch(mock);

    const data = await githubFetch("/users/octocat", "tok_test");
    assert.equal(data.login, "octocat");
    assert.equal(mock.calls.length, 1);
    assert.match(mock.calls[0].url, /api\.github\.com\/users\/octocat/);
    assert.equal(mock.calls[0].headers.Authorization, "Bearer tok_test");
  });

  it("githubFetch throws on non-OK with body snippet", async () => {
    setFetch(
      createMockFetch({
        "/repos/x/y": { __status: 404, message: "Not Found" },
      })
    );

    await assert.rejects(() => githubFetch("/repos/x/y"), /GitHub API 404/);
  });

  it("githubFetchAll paginates until short page", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const page2 = [{ id: 100 }, { id: 101 }];

    setFetch(async (input) => {
      const url = new URL(String(input));
      const page = url.searchParams.get("page") || "1";
      const body = page === "1" ? page1 : page2;
      return {
        ok: true,
        status: 200,
        json: async () => body,
        text: async () => JSON.stringify(body),
      };
    });

    const items = await githubFetchAll("/users/octocat/repos?type=owner", null, 5);
    assert.equal(items.length, 102);
    assert.equal(items[0].id, 0);
    assert.equal(items[101].id, 101);
  });

  it("githubFetchAll stops on empty batch", async () => {
    setFetch(
      createMockFetch({
        "/users/empty/repos": [],
      })
    );

    const items = await githubFetchAll("/users/empty/repos", null, 3);
    assert.deepEqual(items, []);
  });
});

describe("github-api — errors and resilience", () => {
  afterEach(() => {
    resetFetch();
    resetRequestDefaults();
    delete process.env.GITHUB_API_URL;
  });

  function response({ status = 200, body = {}, headers = {} } = {}) {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name) => headers[name.toLowerCase()] ?? null },
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  }

  it("explains an exhausted rate limit instead of echoing the raw body", async () => {
    const reset = Math.floor(Date.now() / 1000) + 600;
    setFetch(async () =>
      response({
        status: 403,
        body: { message: "API rate limit exceeded" },
        headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) },
      })
    );

    await assert.rejects(() => githubFetch("/users/octocat", null, { retries: 0 }), (error) => {
      assert.equal(error.name, "GitHubApiError");
      assert.equal(error.status, 403);
      assert.equal(error.rateLimited, true);
      assert.match(error.message, /rate limit exhausted/);
      assert.match(error.message, /GITHUB_TOKEN/);
      return true;
    });
  });

  it("hints at a bad token on 401 and a typo on 404", async () => {
    setFetch(async () => response({ status: 401, body: { message: "Bad credentials" } }));
    await assert.rejects(() => githubFetch("/user", "bad", { retries: 0 }), /token rejected/);

    setFetch(async () => response({ status: 404, body: { message: "Not Found" } }));
    await assert.rejects(() => githubFetch("/repos/a/b", null, { retries: 0 }), /not found/);
  });

  it("retries 5xx then succeeds", async () => {
    let attempts = 0;
    setFetch(async () => {
      attempts += 1;
      if (attempts < 3) return response({ status: 502, body: { message: "Bad gateway" } });
      return response({ body: { login: "octocat" } });
    });

    const data = await githubFetch("/users/octocat", null, { retries: 2, retryDelayMs: 0 });
    assert.equal(data.login, "octocat");
    assert.equal(attempts, 3);
  });

  it("does not retry 4xx", async () => {
    let attempts = 0;
    setFetch(async () => {
      attempts += 1;
      return response({ status: 422, body: { message: "Unprocessable" } });
    });

    await assert.rejects(() => githubFetch("/search/issues", null, { retries: 3, retryDelayMs: 0 }));
    assert.equal(attempts, 1);
  });

  it("retries network failures and surfaces the last one", async () => {
    let attempts = 0;
    setFetch(async () => {
      attempts += 1;
      throw new Error("socket hang up");
    });

    await assert.rejects(
      () => githubFetch("/users/octocat", null, { retries: 1, retryDelayMs: 0 }),
      /GitHub API request failed: socket hang up/
    );
    assert.equal(attempts, 2);
  });

  it("honours GITHUB_API_URL for Enterprise hosts", async () => {
    process.env.GITHUB_API_URL = "https://ghe.example.com/api/v3/";
    const seen = [];
    setFetch(async (input) => {
      seen.push(String(input));
      return response({ body: { login: "octocat" } });
    });

    await githubFetch("/users/octocat");
    assert.equal(seen[0], "https://ghe.example.com/api/v3/users/octocat");
  });

  it("setRequestDefaults applies to later calls", async () => {
    let attempts = 0;
    setFetch(async () => {
      attempts += 1;
      return response({ status: 500, body: { message: "boom" } });
    });

    setRequestDefaults({ retries: 0, retryDelayMs: 0 });
    await assert.rejects(() => githubFetch("/users/octocat"));
    assert.equal(attempts, 1);
  });

  it("sends the pinned API version header", async () => {
    const mock = createMockFetch({ "/users/octocat": { login: "octocat" } });
    setFetch(mock);
    await githubFetch("/users/octocat");
    assert.equal(mock.calls[0].headers["X-GitHub-Api-Version"], "2022-11-28");
  });
});
