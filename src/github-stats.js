const { githubFetch, githubFetchAll } = require("./github-api");
const { daysBetween, daysAgo, oneYearAgo, parseUser } = require("./utils");

const CONTRIBUTOR_PROBE_LIMIT = 10;
const TOP_REPO_LIMIT = 5;
const TOP_LANGUAGE_LIMIT = 5;
const ACTIVITY_WINDOW_DAYS = 90;

/** Merged PRs opened against *other people's* repos in the last 12 months. */
async function countMergedPrs(username, token) {
  const user = parseUser(username);
  const since = oneYearAgo();
  const query = `is:pr author:${user} is:merged merged:>=${since} -user:${user}`;
  const result = await githubFetch(
    `/search/issues?q=${encodeURIComponent(query)}&per_page=1`,
    token
  );
  return result.total_count || 0;
}

async function countRecentEvents(username, token) {
  const user = parseUser(username);
  const events = await githubFetchAll(`/users/${user}/events/public`, token, 3);
  const cutoff = daysAgo(ACTIVITY_WINDOW_DAYS);
  const recent = events.filter(
    (event) => typeof event?.created_at === "string" && event.created_at.slice(0, 10) >= cutoff
  );
  const types = new Set(recent.map((event) => event.type));
  return { windowDays: ACTIVITY_WINDOW_DAYS, count: recent.length, types: [...types].sort() };
}

/** Repo with the most contributors other than the user — a proxy for "real" collaboration. */
async function findTopContributorRepo(repos, username, token) {
  const probes = repos.slice(0, CONTRIBUTOR_PROBE_LIMIT).map(async (repo) => {
    try {
      const contributors = await githubFetch(
        `/repos/${repo.full_name}/contributors?per_page=100`,
        token
      );
      if (!Array.isArray(contributors)) return { repo: repo.full_name, external: 0 };
      const external = contributors.filter(
        (c) => String(c?.login || "").toLowerCase() !== username.toLowerCase()
      ).length;
      return { repo: repo.full_name, external };
    } catch {
      return null; // private, empty, or rate-limited — not fatal for the report
    }
  });

  const results = (await Promise.all(probes)).filter(Boolean);
  const best = results.reduce(
    (top, item) => (item.external > top.external ? item : top),
    { repo: null, external: 0 }
  );

  return { topContributors: best.external, topContributorRepo: best.external > 0 ? best.repo : null };
}

async function analyzeRepos(username, token) {
  const user = parseUser(username);
  const repos = await githubFetchAll(`/users/${user}/repos?type=owner&sort=updated`, token, 3);
  const publicRepos = repos.filter((repo) => !repo.private && !repo.fork);

  const { topContributors, topContributorRepo } = await findTopContributorRepo(
    publicRepos,
    user,
    token
  );

  const totalStars = publicRepos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
  const licensed = publicRepos.filter((repo) => repo.license).length;
  const archived = publicRepos.filter((repo) => repo.archived).length;
  const languages = {};

  for (const repo of publicRepos) {
    if (!repo.language) continue;
    languages[repo.language] = (languages[repo.language] || 0) + 1;
  }

  const topLanguages = Object.entries(languages)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP_LANGUAGE_LIMIT)
    .map(([name, count]) => ({ name, repos: count }));

  // Sorted by stars, then recency — "top" should mean most noticed, not most recently touched.
  const topRepos = publicRepos
    .slice()
    .sort(
      (a, b) =>
        (b.stargazers_count || 0) - (a.stargazers_count || 0) ||
        new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
    )
    .slice(0, TOP_REPO_LIMIT)
    .map((repo) => ({
      name: repo.full_name,
      stars: repo.stargazers_count || 0,
      license: repo.license?.spdx_id || "none",
      language: repo.language || "—",
      updated: repo.updated_at,
    }));

  return {
    totalPublic: publicRepos.length,
    totalStars,
    licensed,
    archived,
    topContributors,
    topContributorRepo,
    topLanguages,
    topRepos,
  };
}

async function fetchGitHubStats(username, options = {}) {
  const user = parseUser(username);
  const token = options.token;
  const profile = await githubFetch(`/users/${user}`, token);
  const accountAgeDays = daysBetween(profile.created_at);

  const [recentActivity, mergedPrs, repoStats] = await Promise.all([
    countRecentEvents(user, token),
    countMergedPrs(user, token),
    analyzeRepos(user, token),
  ]);

  return {
    username: user,
    profile: {
      name: profile.name,
      bio: profile.bio,
      publicRepos: profile.public_repos,
      followers: profile.followers,
      following: profile.following,
      createdAt: profile.created_at,
      url: profile.html_url,
    },
    accountAgeDays,
    recentActivity,
    mergedPrs,
    repoStats,
  };
}

module.exports = {
  fetchGitHubStats,
  countMergedPrs,
  countRecentEvents,
  analyzeRepos,
  findTopContributorRepo,
};
