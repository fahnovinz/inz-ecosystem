const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { buildBadges, fetchRepoBadges } = require("../src/badges");
const { setFetch, resetFetch } = require("../src/github-api");

describe("badges", () => {
  afterEach(() => {
    resetFetch();
  });

  it("builds markdown for a repo", () => {
    const result = buildBadges({
      full_name: "fahnovinz/inz-ecosystem",
      html_url: "https://github.com/fahnovinz/inz-ecosystem",
      name: "inz-ecosystem",
      owner: { login: "fahnovinz" },
      license: { spdx_id: "MIT" },
      language: "JavaScript",
    });

    assert.match(result.markdown, /GitHub stars/);
    assert.match(result.markdown, /GitHub forks/);
    assert.match(result.markdown, /License/);
    assert.match(result.markdown, /languages\/top\/fahnovinz\/inz-ecosystem/);
  });

  it("omits license and language badges when missing", () => {
    const result = buildBadges({
      full_name: "a/b",
      html_url: "https://github.com/a/b",
      name: "b",
      owner: { login: "a" },
    });
    assert.ok(!result.markdown.includes("license"));
    assert.ok(!result.markdown.includes("languages/top"));
  });

  it("fetchRepoBadges loads repo then builds badges", async () => {
    setFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        full_name: "a/b",
        html_url: "https://github.com/a/b",
        name: "b",
        owner: { login: "a" },
        license: { spdx_id: "MIT" },
        language: "JS",
      }),
      text: async () => "",
    }));

    const result = await fetchRepoBadges("a/b", { token: "t" });
    assert.equal(result.fullName, "a/b");
    assert.match(result.markdown, /GitHub stars/);
  });

  it("rejects a malformed repo before any request goes out", async () => {
    let called = false;
    setFetch(async () => {
      called = true;
      throw new Error("should never run");
    });
    await assert.rejects(() => fetchRepoBadges("owner/repo?per_page=1"), /Invalid repo format/);
    await assert.rejects(() => fetchRepoBadges("justowner"), /Invalid repo format/);
    assert.equal(called, false);
  });
});