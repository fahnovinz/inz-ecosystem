const DEFAULT_API = "https://api.github.com";
const USER_AGENT = "inz-ecosystem";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;

/** Base URL — override with GITHUB_API_URL for GitHub Enterprise. */
function apiBase() {
  return String(process.env.GITHUB_API_URL || DEFAULT_API).replace(/\/+$/, "");
}

/** @type {typeof fetch | null} */
let fetchImpl = null;

/** Process-wide request defaults so the CLI can set `--timeout` once. */
let requestDefaults = {
  timeoutMs: DEFAULT_TIMEOUT_MS,
  retries: DEFAULT_RETRIES,
  retryDelayMs: DEFAULT_RETRY_DELAY_MS,
};

function setRequestDefaults(overrides = {}) {
  requestDefaults = { ...requestDefaults, ...overrides };
  return requestDefaults;
}

function resetRequestDefaults() {
  requestDefaults = {
    timeoutMs: DEFAULT_TIMEOUT_MS,
    retries: DEFAULT_RETRIES,
    retryDelayMs: DEFAULT_RETRY_DELAY_MS,
  };
}

/** Test helper: inject a mock fetch. Call resetFetch() in after(). */
function setFetch(impl) {
  fetchImpl = impl;
}

function resetFetch() {
  fetchImpl = null;
}

/** Resolved lazily so requiring this module never throws on old runtimes. */
function currentFetch() {
  if (fetchImpl) return fetchImpl;
  if (typeof globalThis.fetch !== "function") {
    throw new Error("global fetch is unavailable — inz requires Node.js 18 or newer");
  }
  return globalThis.fetch.bind(globalThis);
}

/** Error carrying the HTTP status so callers can branch without parsing strings. */
class GitHubApiError extends Error {
  constructor(status, message, { rateLimited = false, retryAfterMs = null } = {}) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.rateLimited = rateLimited;
    this.retryAfterMs = retryAfterMs;
  }
}

/** Mock responses in tests have no Headers object — read defensively. */
function readHeader(response, name) {
  const headers = response && response.headers;
  if (!headers || typeof headers.get !== "function") return null;
  return headers.get(name);
}

function rateLimitInfo(response) {
  const remaining = readHeader(response, "x-ratelimit-remaining");
  if (remaining !== "0") return null;
  const reset = Number(readHeader(response, "x-ratelimit-reset"));
  const resetAt = Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000) : null;
  return {
    resetAt,
    retryAfterMs: resetAt ? Math.max(0, resetAt.getTime() - Date.now()) : null,
  };
}

/** Turn an HTTP status into something a human can act on. */
function explain(status, response) {
  const limit = status === 403 || status === 429 ? rateLimitInfo(response) : null;
  if (limit) {
    const when = limit.resetAt ? limit.resetAt.toISOString() : "shortly";
    return {
      hint: `rate limit exhausted (resets ${when}). Set GITHUB_TOKEN or pass --token for a higher quota.`,
      rateLimited: true,
      retryAfterMs: limit.retryAfterMs,
    };
  }
  if (status === 401) {
    return { hint: "token rejected — check GITHUB_TOKEN or --token." };
  }
  if (status === 403) {
    return { hint: "access forbidden — the resource may be private or the token lacks scopes." };
  }
  if (status === 404) {
    return { hint: "not found — check the spelling, or pass a token if the resource is private." };
  }
  return {};
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Request timeouts need AbortSignal.timeout (Node 18+); degrade quietly if absent. */
function timeoutSignal(timeoutMs) {
  if (!timeoutMs || typeof AbortSignal?.timeout !== "function") return undefined;
  return AbortSignal.timeout(timeoutMs);
}

/**
 * GET a GitHub REST path and return parsed JSON.
 *
 * Retries transient failures (5xx and network errors) with linear backoff;
 * 4xx responses fail fast because retrying them never helps.
 *
 * @param {string} path Path under the API base, e.g. "/users/octocat"
 * @param {string} [token] GitHub token
 * @param {{ timeoutMs?: number, retries?: number, retryDelayMs?: number }} [options]
 */
async function githubFetch(path, token, options = {}) {
  const { timeoutMs, retries, retryDelayMs } = { ...requestDefaults, ...options };

  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": USER_AGENT,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${apiBase()}${path}`;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let response;

    try {
      response = await currentFetch()(url, { headers, signal: timeoutSignal(timeoutMs) });
    } catch (error) {
      // Network error / timeout — worth one more try.
      lastError = new Error(`GitHub API request failed: ${error.message}`);
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      throw lastError;
    }

    if (response.ok) {
      return response.json();
    }

    const body = await response.text().catch(() => "");
    const { hint, rateLimited, retryAfterMs } = explain(response.status, response);
    const detail = hint || body.slice(0, 200);
    lastError = new GitHubApiError(
      response.status,
      `GitHub API ${response.status}: ${detail}`.trim(),
      { rateLimited: Boolean(rateLimited), retryAfterMs: retryAfterMs ?? null }
    );

    if (response.status >= 500 && attempt < retries) {
      await sleep(retryDelayMs * (attempt + 1));
      continue;
    }

    throw lastError;
  }

  throw lastError;
}

/**
 * Follow paginated list endpoints until a short page, an empty page, or maxPages.
 *
 * @param {string} path Path, with or without an existing query string
 * @param {string} [token]
 * @param {number} [maxPages]
 * @param {{ perPage?: number } & Parameters<typeof githubFetch>[2]} [options]
 */
async function githubFetchAll(path, token, maxPages = 5, options = {}) {
  const { perPage = 100, ...fetchOptions } = options;
  const items = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const pagePath = `${path}${separator}per_page=${perPage}&page=${page}`;
    const batch = await githubFetch(pagePath, token, fetchOptions);
    if (!Array.isArray(batch) || batch.length === 0) break;
    items.push(...batch);
    if (batch.length < perPage) break;
  }

  return items;
}

module.exports = {
  githubFetch,
  githubFetchAll,
  setFetch,
  resetFetch,
  setRequestDefaults,
  resetRequestDefaults,
  GitHubApiError,
  GITHUB_API: DEFAULT_API,
};
