const { githubFetch } = require("./github-api");
const { parseRepo } = require("./utils");

const SHIELDS = "https://img.shields.io/github";
const DEFAULT_STYLE = "flat-square";

/**
 * Build paste-ready shields.io markdown for a repo payload.
 *
 * @param {object} repo GitHub repository object
 * @param {{ style?: string }} [options]
 */
function buildBadges(repo, options = {}) {
  const style = options.style || DEFAULT_STYLE;
  const slug = `${repo.owner.login}/${repo.name}`;
  const badge = (alt, kind) =>
    `![${alt}](${SHIELDS}/${kind}/${slug}?style=${encodeURIComponent(style)})`;

  const items = [
    { label: "stars", markdown: badge("GitHub stars", "stars") },
    { label: "forks", markdown: badge("GitHub forks", "forks") },
    { label: "issues", markdown: badge("GitHub issues", "issues") },
    { label: "last commit", markdown: badge("Last commit", "last-commit") },
  ];

  if (repo.license?.spdx_id) {
    items.push({ label: "license", markdown: badge("License", "license") });
  }

  if (repo.language) {
    items.push({ label: "top language", markdown: badge("Top language", "languages/top") });
  }

  return {
    fullName: repo.full_name,
    url: repo.html_url,
    style,
    badges: items,
    markdown: items.map((item) => item.markdown).join("\n"),
  };
}

async function fetchRepoBadges(repoInput, options = {}) {
  const { owner, repo } = parseRepo(repoInput);
  const repoData = await githubFetch(`/repos/${owner}/${repo}`, options.token);
  return buildBadges(repoData, options);
}

module.exports = { fetchRepoBadges, buildBadges, DEFAULT_STYLE };
