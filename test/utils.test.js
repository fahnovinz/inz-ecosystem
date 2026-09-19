const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { daysBetween, daysAgo, oneYearAgo, parseRepo, parseUser } = require("../src/utils");

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

describe("utils — input normalisation", () => {
  it("parseRepo accepts browse, clone and ssh URLs", () => {
    const expected = { owner: "fahnovinz", repo: "inz-ecosystem", fullName: "fahnovinz/inz-ecosystem" };
    for (const input of [
      "fahnovinz/inz-ecosystem",
      "  fahnovinz/inz-ecosystem  ",
      "github.com/fahnovinz/inz-ecosystem",
      "https://github.com/fahnovinz/inz-ecosystem",
      "https://github.com/fahnovinz/inz-ecosystem.git",
      "https://github.com/fahnovinz/inz-ecosystem/",
      "git@github.com:fahnovinz/inz-ecosystem.git",
    ]) {
      assert.deepEqual(parseRepo(input), expected, `failed for ${input}`);
    }
  });

  it("parseRepo rejects traversal and empty segments", () => {
    for (const input of ["../etc", "owner/..", "owner/", "/repo", "", null]) {
      assert.throws(() => parseRepo(input), /Invalid repo format/, `accepted ${input}`);
    }
  });

  it("parseUser strips @ and profile URLs", () => {
    assert.equal(parseUser("@fahnovinz"), "fahnovinz");
    assert.equal(parseUser("https://github.com/fahnovinz"), "fahnovinz");
    assert.equal(parseUser("a-b-c"), "a-b-c");
  });

  it("parseUser rejects names GitHub would not issue", () => {
    for (const input of ["-lead", "trail-", "double--hyphen", "has space", "a".repeat(40), ""]) {
      assert.throws(() => parseUser(input), /Invalid GitHub username/, `accepted ${input}`);
    }
  });

  it("daysAgo and oneYearAgo return UTC calendar dates", () => {
    assert.match(daysAgo(90), /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(daysAgo(0), new Date().toISOString().slice(0, 10));
    const year = Number(oneYearAgo().slice(0, 4));
    assert.equal(year, new Date().getUTCFullYear() - 1);
  });

  it("daysBetween rejects unparseable dates", () => {
    assert.throws(() => daysBetween("not-a-date"), /Invalid date/);
  });
});
