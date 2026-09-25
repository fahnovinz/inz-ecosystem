// Tiny static server for VRAX World (packages/vrax-world). Zero dependencies.
// Binds to 127.0.0.1 by default; pass host "0.0.0.0" to open it on your LAN.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const WORLD_DIR = path.join(__dirname, "..", "packages", "vrax-world");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

// Maps a request path to a file inside root, or null when it would escape root.
function resolvePath(root, urlPath) {
  let p;
  try {
    p = decodeURIComponent(String(urlPath).split("?")[0].split("#")[0]);
  } catch {
    return null;
  }
  if (p.includes("\0")) return null;
  if (p.endsWith("/")) p += "index.html";
  const base = path.resolve(root);
  const full = path.resolve(base, "." + path.posix.normalize("/" + p));
  if (full !== base && !full.startsWith(base + path.sep)) return null;
  return full;
}

function createWorldServer({ root = WORLD_DIR } = {}) {
  return http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end();
      return;
    }
    const file = resolvePath(root, req.url || "/");
    if (!file) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Content-Length": st.size,
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      fs.createReadStream(file).pipe(res);
    });
  });
}

function startWorldServer({ port = 5173, host = "127.0.0.1", root } = {}) {
  return new Promise((resolve, reject) => {
    const server = createWorldServer({ root });
    server.once("error", reject);
    server.listen(port, host, () => {
      const { port: actual } = server.address();
      const shown = host === "0.0.0.0" || host === "::" ? "localhost" : host;
      resolve({ server, url: `http://${shown}:${actual}/` });
    });
  });
}

module.exports = { createWorldServer, startWorldServer, resolvePath, WORLD_DIR, MIME };
