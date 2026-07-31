const { githubFetch } = require("./github-api");
const { daysBetween } = require("./utils");

async function fetchTopics(owner, repo, token) {
  try {
    // Topics endpoint needs the mercurial/mercy preview historically; vnd.github+json works on modern API.
    const data = await githubFetch(`/repos/${owner}/${repo}/topics`, token);
    return data;
  } catch {
    return { names: [] };
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
    label: "Updated within 90 days",
    weight: 15,
    test: (ctx) => daysBetween(ctx.repo.pushed_at) <= 90,
  },
];

async function fileExists(owner, repo, path, token) {
  try {
    await githubFetch(`/repos/${owner}/${repo}/contents/${path}`, token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Prefer Actions workflows API; fall back to listing `.github/workflows/*.{yml,yaml}`
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
  const checks = CHECKS.map((check) => ({
    id: check.id,
    label: check.label,
    weight: check.weight,
    passed: check.test(ctx),
  }));

  const score = checks.reduce((sum, check) => sum + (check.passed ? check.weight : 0), 0);

  let grade = "Needs work";
  if (score >= 90) grade = "Excellent";
  else if (score >= 70) grade = "Good";
  else if (score >= 50) grade = "Fair";

  return { checks, score, grade };
}

async function fetchRepoHealth(repoInput, options = {}) {
  const token = options.token;
  const [owner, repo] = repoInput.split("/");

  const [repoData, topicsPayload, hasReadme, hasContributing, hasCi] = await Promise.all([
    githubFetch(`/repos/${owner}/${repo}`, token),
    fetchTopics(owner, repo, token),
    fileExists(owner, repo, "README.md", token),
    fileExists(owner, repo, "CONTRIBUTING.md", token),
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
    },
  };
}

module.exports = { fetchRepoHealth, CHECKS, scoreFromContext, hasWorkflows };
