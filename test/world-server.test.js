const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const { startWorldServer, resolvePath, WORLD_DIR } = require("../src/world-server");

function request(url, { method = "GET", rawPath } = {}) {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request({ host: u.hostname, port: u.port, path: rawPath || u.pathname, method }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { body += c; });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

describe("world-server", () => {
  let server;
  let base;

  before(async () => {
    const started = await startWorldServer({ port: 0 });
    server = started.server;
    base = started.url;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  it("serves the VRAX World page", async () => {
    const res = await request(base);
    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /text\/html/);
    assert.match(res.body, /<title>VRAX World<\/title>/);
    assert.match(base, /^http:\/\/127\.0\.0\.1:\d+\/$/);
  });

  it("serves modules with a JavaScript MIME type", async () => {
    const res = await request(new URL("src/main.js", base).href);
    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /text\/javascript/);
    assert.equal(res.headers["x-content-type-options"], "nosniff");
  });

  it("answers HEAD without a body and rejects other methods", async () => {
    const head = await request(new URL("style.css", base).href, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.body, "");
    const post = await request(base, { method: "POST" });
    assert.equal(post.status, 405);
  });

  it("returns 404 for missing files", async () => {
    const res = await request(new URL("nope.js", base).href);
    assert.equal(res.status, 404);
  });

  it("never serves files outside the world folder", async () => {
    const res = await request(base, { rawPath: "/..%2f..%2fpackage.json" });
    assert.doesNotMatch(res.body, /"name": "inz-ecosystem"/);
    const bad = await request(base, { rawPath: "/%E0%A4%A" });
    assert.equal(bad.status, 403);
  });

  it("resolvePath keeps paths inside root", () => {
    const root = WORLD_DIR;
    assert.equal(resolvePath(root, "/"), path.join(root, "index.html"));
    assert.equal(resolvePath(root, "/src/main.js?x=1#y"), path.join(root, "src", "main.js"));
    assert.equal(resolvePath(root, "/../../package.json"), path.join(root, "package.json"));
    assert.equal(resolvePath(root, "/a%00b"), null);
    assert.equal(resolvePath(root, "/%zz"), null);
  });

  it("reports listen errors", async () => {
    const { port } = server.address();
    await assert.rejects(startWorldServer({ port }), /EADDRINUSE/);
  });
});
