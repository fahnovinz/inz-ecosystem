/**
 * Minimal fetch mock for GitHub API unit tests.
 * Routes by URL pathname (and optional query).
 */

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}

function notFound(message = "Not Found") {
  return jsonResponse({ message }, 404);
}

/**
 * @param {Record<string, unknown | ((url: URL) => unknown)>} routes
 *   Keys are path prefixes or exact paths under api.github.com, e.g. "/users/octocat"
 *   Values are response bodies or functions (url) => body
 */
function createMockFetch(routes) {
  const calls = [];

  async function mockFetch(input, init = {}) {
    const url = new URL(String(input));
    calls.push({ url: url.toString(), method: init.method || "GET", headers: init.headers || {} });

    const pathWithQuery = url.pathname + url.search;
    const path = url.pathname;

    // Prefer longest matching key
    const keys = Object.keys(routes).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (pathWithQuery.startsWith(key) || path === key || path.startsWith(key)) {
        const handler = routes[key];
        const body = typeof handler === "function" ? handler(url, init) : handler;
        if (body && body.__status) {
          const { __status, ...rest } = body;
          return jsonResponse(rest, __status);
        }
        return jsonResponse(body);
      }
    }

    return notFound(`No mock for ${pathWithQuery}`);
  }

  mockFetch.calls = calls;
  return mockFetch;
}

module.exports = { createMockFetch, jsonResponse, notFound };
