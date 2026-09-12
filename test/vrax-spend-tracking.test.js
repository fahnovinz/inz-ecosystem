const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const dir = path.join(__dirname, "..", "packages", "vrax-spend-tracking");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const js = fs.readFileSync(path.join(dir, "app.js"), "utf8");
const css = fs.readFileSync(path.join(dir, "styles.css"), "utf8");

const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));

describe("vrax-spend-tracking", () => {
  it("app.js compiles", () => {
    assert.doesNotThrow(() => new vm.Script(js, { filename: "app.js" }));
  });

  it("every element the script looks up exists in the markup", () => {
    const looked = new Set([...js.matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]));
    const missing = [...looked].filter((id) => !htmlIds.has(id));
    assert.deepEqual(missing, [], `script reads ids absent from index.html: ${missing}`);
  });

  it("every label points at a control that exists", () => {
    const labelled = [...html.matchAll(/\bfor="([^"]+)"/g)].map((m) => m[1]);
    const dangling = labelled.filter((id) => !htmlIds.has(id));
    assert.deepEqual(dangling, [], `labels point at missing ids: ${dangling}`);
  });

  it("ids are unique", () => {
    const all = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    const dupes = all.filter((id, i) => all.indexOf(id) !== i);
    assert.deepEqual(dupes, [], `duplicate ids: ${dupes}`);
  });

  it("buttons inside forms declare a type", () => {
    const untyped = [...html.matchAll(/<button(?![^>]*\btype=)[^>]*>/g)].map((m) => m[0]);
    assert.deepEqual(untyped, [], `buttons without type: ${untyped}`);
  });

  it("never builds markup from strings", () => {
    const code = js.split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
    for (const bad of ["innerHTML", "outerHTML", "document.write", "eval("]) {
      assert.ok(!code.includes(bad), `app.js uses ${bad}`);
    }
  });

  it("steps dates by the calendar, never by fixed milliseconds", () => {
    // A 24h step lands on the wrong day when DST makes a day 23 or 25 hours long.
    assert.ok(!/getTime\(\)\s*[+-][^;]*\bDAY\b/.test(js), "app.js walks dates in milliseconds");
  });

  it("every colour token used is declared on bare :root", () => {
    const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
    const declared = new Set([...root.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const used = new Set([...css.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]));
    const undeclared = [...used].filter((name) => !declared.has(name));
    assert.deepEqual(undeclared, [], `tokens used but not in :root: ${undeclared}`);
  });
});
