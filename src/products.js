// INZ Ecosystem product catalog.
// Keep this list in sync with README.md and packages/<name>/README.md.

const PRODUCTS = [
  {
    id: "vraxtal-vault",
    name: "VRAXTAL VAULT",
    kind: "product",
    status: "flagship",
    tagline: "Self-hosted encrypted personal vault for documents, photos, and video",
    repo: "fahnovinz/vraxtal-vault",
    url: "https://github.com/fahnovinz/vraxtal-vault",
    license: "MIT",
    stack: ["Node.js", "Express", "AES-256-GCM", "SQLite", "Cloudflare Tunnel"],
    highlights: [
      "Password-wrapped AES-256-GCM encryption at rest",
      "Loopback-only bind (127.0.0.1) — TLS via tunnel/proxy",
      "Production deploy scripts (systemd, backup, health)",
      "SECURITY.md, tests, open-source hygiene",
    ],
  },
  {
    id: "github-stats",
    name: "INZ Stats",
    kind: "tool",
    status: "stable",
    tagline: "GitHub profile & portfolio analytics",
    command: "inz stats <username>",
    repo: "fahnovinz/inz-ecosystem",
    url: "https://github.com/fahnovinz/inz-ecosystem",
    license: "MIT",
    stack: ["Node.js", "GitHub REST API"],
    highlights: [
      "Activity (90d), merged PRs, language breakdown",
      "JSON output for scripting",
    ],
  },
  {
    id: "repo-health",
    name: "INZ Health",
    kind: "tool",
    status: "stable",
    tagline: "Repository health score (README, license, CI, freshness)",
    command: "inz health <owner/repo>",
    repo: "fahnovinz/inz-ecosystem",
    url: "https://github.com/fahnovinz/inz-ecosystem",
    license: "MIT",
    stack: ["Node.js", "GitHub REST API"],
    highlights: [
      "100-point maintainer checklist",
      "Grade + per-check pass/fail",
    ],
  },
  {
    id: "badges",
    name: "INZ Badges",
    kind: "tool",
    status: "stable",
    tagline: "Generate shields.io badge markdown for any public repo",
    command: "inz badges <owner/repo>",
    repo: "fahnovinz/inz-ecosystem",
    url: "https://github.com/fahnovinz/inz-ecosystem",
    license: "MIT",
    stack: ["Node.js"],
    highlights: [
      "Paste-ready markdown for README polish",
    ],
  },
];

function listProducts(options = {}) {
  const { kind } = options;
  let items = PRODUCTS.slice();
  if (kind) {
    items = items.filter((p) => p.kind === kind);
  }
  return {
    ecosystem: "INZ Ecosystem",
    version: require("../package.json").version,
    homepage: "https://github.com/fahnovinz/inz-ecosystem",
    author: "fahnovinz",
    products: items,
    summary: {
      total: items.length,
      products: items.filter((p) => p.kind === "product").length,
      tools: items.filter((p) => p.kind === "tool").length,
      flagship: items.find((p) => p.status === "flagship")?.id || null,
    },
  };
}

module.exports = { PRODUCTS, listProducts };
