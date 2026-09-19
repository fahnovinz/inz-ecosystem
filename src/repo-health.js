const { githubFetch } = require("./github-api");
const { daysBetween, parseRepo } = require("./utils");

const FRESHNESS_DAYS = 90;

/** Common homes for a contributing guide, in the order GitHub itself resolves them. */
const CONTRIBUTING_PATHS = [
  "CONTRIBUTING.md",
  ".github/CONTRIBUTING.md",
  "docs/CONTRIBUTING.md",
  "CONTRIBUTING",
];

async function fetchTopics(owner, repo, token) {
  try {
    const data = await githubFetch(`/repos/${owner}/${repo}/topics`, token);
    return data;
  } catch {
    return { names: [] };
  }
}

function isFresh(pushedAt) {
  if (!pushedAt) return false;
  try {
    return daysBetween(pushedAt) <= FRESHNESS_DAYS;
  } catch {
    return false;
  }
}

const CHECKS = [
  {
    id: "description",
    label: "Repository description",
    weight: 10,
    test: (ctx) => Boolean(ctx.repo.description?.trim()),
  },
  {
    id: "readme",
    label: "README present",
    weight: 15,
    test: (ctx) => ctx.hasReadme,
  },
  {
    id: "license",
    label: "License declared",
    weight: 15,
    test: (ctx) => Boolean(ctx.repo.license),
  },
  {
    id: "topics",
    label: "Topics configured",
    weight: 10,
    test: (ctx) => ctx.topics.length > 0,
  },
  {
    id: "ci",
    label: "CI workflow detected",
    weight: 15,
    test: (ctx) => ctx.hasCi,
  },
  {
    id: "contributing",
    label: "CONTRIBUTING guide",
    weight: 10,
    test: (ctx) => ctx.hasContributing,
  },
  {
    id: "issues",
    label: "Issue tracking enabled",
    weight: 10,
    test: (ctx) => ctx.repo.has_issues,
  },
  {
    id: "recent",
    label: `Updated within ${FRESHNESS_DAYS} days`,
    weight: 15,
    test: (ctx) => isFresh(ctx.repo.pushed_at),
  },
];

/** Actionable advice per failing check — a score without a next step is just a number. */
const REMEDIES = {
  description: "Add a one-line description in repo settings (also shown in search results).",
  readme: "Add a README.md covering what it does, install, and usage.",
  license: "Add a LICENSE file so others know the terms of reuse.",
  topics: "Add 3–8 topics in repo settings to make the project discoverable.",
  ci: "Add a workflow under .github/workflows/ that at least runs the test suite.",
  contributing: "Add CONTRIBUTING.md describing how to run tests and open a PR.",
  issues: "Enable Issues in repo settings so users have a place to report bugs.",
  recent: `Push something — the repo looks stale after ${FRESHNESS_DAYS} days.`,
};

async function fileExists(owner, repo, path, token) {
  try {
    await githubFetch(`/repos/${owner}/${repo}/contents/${path}`, token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Root `README.md` first (cheap, and the common case), then the dedicated readme
 * endpoint, which resolves any casing or extension GitHub itself accepts.
 */
async function hasReadmeFile(owner, repo, token) {
  if (await fileExists(owner, repo, "README.md", token)) return true;
  try {
    const data = await githubFetch(`/repos/${owner}/${repo}/readme`, token);
    return Boolean(data && data.name);
  } catch {
    return false;
  }
}

async function hasContributingFile(owner, repo, token) {
  for (const candidate of CONTRIBUTING_PATHS) {
    if (await fileExists(owner, repo, candidate, token)) return true;
  }
  return false;
}

/**
 * Prefer the Actions workflows API; fall back to listing `.github/workflows/*.{yml,yaml}`
 * so a workflow_dispatch-only or billing-limited Actions account still counts as "CI present".
 */
async function hasWorkflows(owner, repo, token) {
  try {
    const workflows = await githubFetch(`/repos/${owner}/${repo}/actions/workflows`, token);
    if ((workflows.total_count || 0) > 0) return true;
  } catch {
    // continue to filesystem fallback
  }

  try {
    const files = await githubFetch(`/repos/${owner}/${repo}/contents/.github/workflows`, token);
    if (!Array.isArray(files)) return false;
    return files.some((f) => f.type === "file" && /\.(ya?ml)$/i.test(f.name));
  } catch {
    return false;
  }
}

function scoreFromContext(ctx) {
  const checks = CHECKS.map((check) => {
    const passed = check.test(ctx);
    return {
      id: check.id,
      label: check.label,
      weight: check.weight,
      passed,
      ...(passed ? {} : { remedy: REMEDIES[check.id] }),
    };
  });

  const score = checks.reduce((sum, check) => sum + (check.passed ? check.weight : 0), 0);

  let grade = "Needs work";
  if (score >= 90) grade = "Excellent";
  else if (score >= 70) grade = "Good";
  else if (score >= 50) grade = "Fair";

  return { checks, score, grade };
}

async function fetchRepoHealth(repoInput, options = {}) {
  const token = options.token;
  const { owner, repo } = parseRepo(repoInput);

  const [repoData, topicsPayload, hasReadme, hasContributing, hasCi] = await Promise.all([
    githubFetch(`/repos/${owner}/${repo}`, token),
    fetchTopics(owner, repo, token),
    hasReadmeFile(owner, repo, token),
    hasContributingFile(owner, repo, token),
    hasWorkflows(owner, repo, token),
  ]);

  const ctx = {
    repo: repoData,
    topics: topicsPayload.names || [],
    hasReadme,
    hasContributing,
    hasCi,
  };

  const { checks, score, grade } = scoreFromContext(ctx);

  return {
    fullName: repoData.full_name,
    url: repoData.html_url,
    score,
    grade,
    checks,
    meta: {
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      language: repoData.language,
      license: repoData.license?.spdx_id || null,
      pushedAt: repoData.pushed_at,
      defaultBranch: repoData.default_branch,
      archived: Boolean(repoData.archived),
    },
  };
}

module.exports = {
  fetchRepoHealth,
  CHECKS,
  REMEDIES,
  scoreFromContext,
  hasWorkflows,
  hasReadmeFile,
  hasContributingFile,
};
