const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildBadges } = require("../src/badges");

describe("badges", () => {
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
});