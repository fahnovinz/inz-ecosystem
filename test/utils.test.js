const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { daysBetween, parseRepo } = require("../src/utils");

describe("utils", () => {
  it("daysBetween calculates correctly", () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const result = daysBetween(thirtyDaysAgo.toISOString());
    assert.ok(result >= 29 && result <= 31);
  });

  it("parseRepo accepts owner/repo", () => {
    const parsed = parseRepo("fahnovinz/inz-ecosystem");
    assert.equal(parsed.owner, "fahnovinz");
    assert.equal(parsed.repo, "inz-ecosystem");
  });

  it("parseRepo rejects invalid input", () => {
    assert.throws(() => parseRepo("not-a-repo"), /Invalid repo format/);
  });
});