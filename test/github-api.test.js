const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { githubFetch, githubFetchAll, setFetch, resetFetch } = require("../src/github-api");
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
