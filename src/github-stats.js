const { githubFetch, githubFetchAll } = require("./github-api");
const { daysBetween, daysAgo, oneYearAgo } = require("./utils");

async function countMergedPrs(username, token) {
  const since = oneYearAgo();
  const query = `q=is:pr+author:${username}+is:merged+merged:>=${since}+-user:${username}`;
  const result = await githubFetch(`/search/issues?${query}&per_page=1`, token);
  return result.total_count || 0;
}

async function countRecentEvents(username, token) {
  const events = await githubFetchAll(`/users/${username}/events/public`, token, 3);
  const cutoff = daysAgo(90);
  const recent = events.filter((event) => event.created_at.slice(0, 10) >= cutoff);
  const types = new Set(recent.map((event) => event.type));
  return { count: recent.length, types: [...types] };
}

async function analyzeRepos(username, token) {
  const repos = await githubFetchAll(`/users/${username}/repos?type=owner&sort=updated`, token, 3);
  const publicRepos = repos.filter((repo) => !repo.private && !repo.fork);

  let topContributors = 0;
  let topContributorRepo = null;

  for (const repo of publicRepos.slice(0, 10)) {
    try {
      const contributors = await githubFetch(
        `/repos/${repo.full_name}/contributors?per_page=100`,
        token
      );
      const external = contributors.filter(
        (c) => c.login.toLowerCase() !== username.toLowerCase()
      ).length;

      if (external > topContributors) {
        topContributors = external;
        topContributorRepo = repo.full_name;
      }
    } catch {
      // skip inaccessible repos
    }
  }

  const totalStars = publicRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const licensed = publicRepos.filter((repo) => repo.license).length;
  const languages = {};

  for (const repo of publicRepos) {
    if (!repo.language) continue;
    languages[repo.language] = (languages[repo.language] || 0) + 1;
  }

  const topLanguages = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, repos: count }));

  return {
    totalPublic: publicRepos.length,
    totalStars,
    licensed,
    topContributors,
    topContributorRepo,
    topLanguages,
    topRepos: publicRepos.slice(0, 5).map((repo) => ({
      name: repo.full_name,
      stars: repo.stargazers_count,
      license: repo.license?.spdx_id || "none",
      language: repo.language || "—",
      updated: repo.updated_at,
    })),
  };
}

async function fetchGitHubStats(username, options = {}) {
  const token = options.token;
  const profile = await githubFetch(`/users/${username}`, token);
  const accountAgeDays = daysBetween(profile.created_at);

  const [recentActivity, mergedPrs, repoStats] = await Promise.all([
    countRecentEvents(username, token),
    countMergedPrs(username, token),
    analyzeRepos(username, token),
  ]);

  return {
    username,
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

module.exports = { fetchGitHubStats };