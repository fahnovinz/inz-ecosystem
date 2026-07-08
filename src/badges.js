const { githubFetch } = require("./github-api");

function buildBadges(repo) {
  const base = `https://img.shields.io/github`;
  const slug = `${repo.owner.login}/${repo.name}`;

  const items = [
    {
      label: "stars",
      markdown: `![GitHub stars](${base}/stars/${slug}?style=flat-square)`,
    },
    {
      label: "forks",
      markdown: `![GitHub forks](${base}/forks/${slug}?style=flat-square)`,
    },
    {
      label: "issues",
      markdown: `![GitHub issues](${base}/issues/${slug}?style=flat-square)`,
    },
    {
      label: "last commit",
      markdown: `![Last commit](${base}/last-commit/${slug}?style=flat-square)`,
    },
  ];

  if (repo.license?.spdx_id) {
    items.push({
      label: "license",
      markdown: `![License](https://img.shields.io/github/license/${slug}?style=flat-square)`,
    });
  }

  if (repo.language) {
    items.push({
      label: "top language",
      markdown: `![Top language](https://img.shields.io/github/languages/top/${slug}?style=flat-square)`,
    });
  }

  return {
    fullName: repo.full_name,
    url: repo.html_url,
    badges: items,
    markdown: items.map((item) => item.markdown).join("\n"),
  };
}

async function fetchRepoBadges(repoInput, options = {}) {
  const [owner, repo] = repoInput.split("/");
  const repoData = await githubFetch(`/repos/${owner}/${repo}`, options.token);
  return buildBadges(repoData);
}

module.exports = { fetchRepoBadges, buildBadges };