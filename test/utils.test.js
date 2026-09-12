const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { daysBetween, parseRepo, parseUsername } = require("../src/utils");

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

  it("parseRepo rejects anything that would reshape the API path", () => {
    for (const bad of [
      "owner/repo?per_page=1",
      "owner/repo/extra",
      "owner//repo",
      "-leading/repo",
      "owner/repo#frag",
      "../../users/x",
      "",
      null,
      undefined,
    ]) {
      assert.throws(() => parseRepo(bad), /Invalid repo format/, `accepted ${bad}`);
    }
  });

  it("parseUsername accepts real logins and rejects the rest", () => {
    assert.equal(parseUsername("fahnovinz"), "fahnovinz");
    assert.equal(parseUsername("a-b-c1"), "a-b-c1");
    for (const bad of ["user?tab=repos", "nama spasi", "-lead", "trail-", "a".repeat(40), "", null]) {
      assert.throws(() => parseUsername(bad), /Invalid GitHub username/, `accepted ${bad}`);
    }
  });
});