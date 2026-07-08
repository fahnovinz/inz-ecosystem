const { githubFetch, githubFetchAll } = require("./github-api");

const CRITERIA = {
  accountAgeDays: 730,
  recentActivityDays: 90,
  mergedPrsToOthers: 100,
  externalContributors: 20,
  dependentRepos: 500,
  dependentPackages: 100,
  monthlyDownloads: 200000,
  openssfScore: 0.4,
};

function daysBetween(from, to = new Date()) {
  return Math.floor((to - new Date(from)) / (1000 * 60 * 60 * 24));
}

function oneYearAgo() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().slice(0, 10);
}

function ninetyDaysAgo() {
  const date = new Date();
  date.setDate(date.getDate() - 90);
  return date.toISOString().slice(0, 10);
}

async function countMergedPrsToOthers(username, token) {
  const since = oneYearAgo();
  const query = `q=is:pr+author:${username}+is:merged+merged:>=${since}+-user:${username}`;
  const result = await githubFetch(`/search/issues?${query}&per_page=1`, token);
  return result.total_count || 0;
}

async function countRecentEvents(username, token) {
  const events = await githubFetchAll(`/users/${username}/events/public`, token, 3);
  const cutoff = ninetyDaysAgo();
  const recent = events.filter((event) => event.created_at.slice(0, 10) >= cutoff);
  const types = new Set(recent.map((event) => event.type));
  return { count: recent.length, types: [...types] };
}

async function analyzeOwnedRepos(username, token) {
  const repos = await githubFetchAll(`/users/${username}/repos?type=owner&sort=updated`, token, 3);
  const ossRepos = repos.filter((repo) => !repo.private && !repo.fork);

  let bestContributorCount = 0;
  let bestRepo = null;

  for (const repo of ossRepos.slice(0, 10)) {
    try {
      const contributors = await githubFetch(
        `/repos/${repo.full_name}/contributors?per_page=100`,
        token
      );
      const externalCount = contributors.filter(
        (contributor) => contributor.login.toLowerCase() !== username.toLowerCase()
      ).length;

      if (externalCount > bestContributorCount) {
        bestContributorCount = externalCount;
        bestRepo = repo.full_name;
      }
    } catch {
      // Repo might be empty or inaccessible
    }
  }

  return {
    totalOssRepos: ossRepos.length,
    bestExternalContributors: bestContributorCount,
    bestContributorRepo: bestRepo,
    topRepos: ossRepos.slice(0, 5).map((repo) => ({
      name: repo.full_name,
      stars: repo.stargazers_count,
      license: repo.license?.spdx_id || "none",
      updated: repo.updated_at,
    })),
  };
}

function evaluateCriteria(profile, accountAgeDays, recentActivity, mergedPrs, repoStats) {
  const checks = [];

  checks.push({
    id: "general-account-age",
    track: "general",
    label: "Akun GitHub minimal 2 tahun",
    required: true,
    passed: accountAgeDays >= CRITERIA.accountAgeDays,
    value: `${accountAgeDays} hari`,
    target: `>= ${CRITERIA.accountAgeDays} hari`,
  });

  checks.push({
    id: "general-recent-activity",
    track: "general",
    label: "Aktivitas OSS publik dalam 90 hari terakhir",
    required: true,
    passed: recentActivity.count > 0,
    value: `${recentActivity.count} event (${recentActivity.types.join(", ") || "none"})`,
    target: ">= 1 aktivitas",
  });

  checks.push({
    id: "general-osi-license",
    track: "general",
    label: "Minimal 1 repo dengan lisensi OSI-approved",
    required: true,
    passed: repoStats.topRepos.some((repo) => repo.license !== "none"),
    value: repoStats.topRepos.map((repo) => `${repo.name}: ${repo.license}`).join("; ") || "none",
    target: "MIT, Apache-2.0, BSD, GPL, dll.",
  });

  checks.push({
    id: "maintainer-merged-prs",
    track: "maintainer",
    label: "100+ PR merged ke repo orang lain (12 bulan)",
    required: false,
    passed: mergedPrs >= CRITERIA.mergedPrsToOthers,
    value: mergedPrs,
    target: `>= ${CRITERIA.mergedPrsToOthers}`,
  });

  checks.push({
    id: "maintainer-external-contributors",
    track: "maintainer",
    label: "20+ kontributor eksternal di repo yang kamu maintain",
    required: false,
    passed: repoStats.bestExternalContributors >= CRITERIA.externalContributors,
    value: `${repoStats.bestExternalContributors}${repoStats.bestContributorRepo ? ` (${repoStats.bestContributorRepo})` : ""}`,
    target: `>= ${CRITERIA.externalContributors}`,
  });

  checks.push({
    id: "maintainer-downloads",
    track: "maintainer",
    label: "200.000+ download/bulan di package registry",
    required: false,
    passed: false,
    value: "Perlu dicek manual (npm/PyPI/crates.io)",
    target: `>= ${CRITERIA.monthlyDownloads.toLocaleString()}`,
    manual: true,
  });

  checks.push({
    id: "maintainer-dependents",
    track: "maintainer",
    label: "500+ dependent repos atau 100+ dependent packages",
    required: false,
    passed: false,
    value: "Perlu dicek manual (GitHub dependency graph)",
    target: `>= ${CRITERIA.dependentRepos} repos / ${CRITERIA.dependentPackages} packages`,
    manual: true,
  });

  checks.push({
    id: "maintainer-openssf",
    track: "maintainer",
    label: "OpenSSF criticality score >= 0.4",
    required: false,
    passed: false,
    value: "Perlu dicek manual di openssf.org",
    target: `>= ${CRITERIA.openssfScore}`,
    manual: true,
  });

  checks.push({
    id: "ecosystem-impact",
    track: "ecosystem",
    label: "Ecosystem Impact Track (penjelasan 500 kata)",
    required: false,
    passed: false,
    value: "Apply dengan narasi dampak proyek kamu",
    target: "Jelaskan proyek yang ecosystem-nya bergantung padanya",
    manual: true,
  });

  const generalPassed = checks.filter((check) => check.track === "general" && check.required).every((check) => check.passed);
  const maintainerPassed = checks.filter((check) => check.track === "maintainer" && !check.manual).some((check) => check.passed);

  return {
    checks,
    generalPassed,
    maintainerPassed,
    readyToApply: generalPassed && (maintainerPassed || true),
    recommendedTrack: maintainerPassed ? "maintainer" : "ecosystem",
  };
}

async function checkEligibility(username, options = {}) {
  const token = options.token;
  const profile = await githubFetch(`/users/${username}`, token);
  const accountAgeDays = daysBetween(profile.created_at);

  const [recentActivity, mergedPrs, repoStats] = await Promise.all([
    countRecentEvents(username, token),
    countMergedPrsToOthers(username, token),
    analyzeOwnedRepos(username, token),
  ]);

  const evaluation = evaluateCriteria(profile, accountAgeDays, recentActivity, mergedPrs, repoStats);

  return {
    username,
    profile: {
      name: profile.name,
      bio: profile.bio,
      publicRepos: profile.public_repos,
      followers: profile.followers,
      createdAt: profile.created_at,
      url: profile.html_url,
    },
    accountAgeDays,
    recentActivity,
    mergedPrs,
    repoStats,
    ...evaluation,
    applyUrl: "https://claude.com/open-source-max",
    programUrl: "https://claude.com/contact-sales/claude-for-oss",
    termsUrl: "https://www.anthropic.com/claude-for-oss-terms",
  };
}

module.exports = { checkEligibility, CRITERIA };