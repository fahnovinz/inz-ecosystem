const GITHUB_API = "https://api.github.com";

async function githubFetch(path, token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "claude-oss-kit",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${GITHUB_API}${path}`, { headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body.slice(0, 200)}`);
  }

  return response.json();
}

async function githubFetchAll(path, token, maxPages = 5) {
  const items = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const pagePath = `${path}${separator}per_page=100&page=${page}`;
    const batch = await githubFetch(pagePath, token);
    if (!Array.isArray(batch) || batch.length === 0) break;
    items.push(...batch);
    if (batch.length < 100) break;
  }

  return items;
}

module.exports = { githubFetch, githubFetchAll };