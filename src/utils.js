const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Whole days between an ISO timestamp and now (or `to`). */
function daysBetween(from, to = new Date()) {
  const start = new Date(from);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`Invalid date "${from}"`);
  }
  return Math.floor((to - start) / MS_PER_DAY);
}

/** YYYY-MM-DD, n days ago in UTC — GitHub timestamps are UTC, so local time would skew. */
function daysAgo(n) {
  return new Date(Date.now() - n * MS_PER_DAY).toISOString().slice(0, 10);
}

/** YYYY-MM-DD, one calendar year ago in UTC. */
function oneYearAgo() {
  const now = new Date();
  const then = new Date(
    Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate())
  );
  return then.toISOString().slice(0, 10);
}

/**
 * Accepts `owner/repo`, `github.com/owner/repo`, or a full clone/browse URL,
 * and normalises it so callers only ever deal with `owner/repo`.
 */
function parseRepo(input) {
  const value = String(input ?? "")
    .trim()
    .replace(/^git@github\.com:/i, "")
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");

  const match = value.match(
    /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,38})?)\/([A-Za-z0-9_][A-Za-z0-9_.-]*)$/
  );

  if (!match || match[2] === "." || match[2] === "..") {
    throw new Error(`Invalid repo format "${input}". Use owner/repo`);
  }

  return { owner: match[1], repo: match[2], fullName: `${match[1]}/${match[2]}` };
}

/** GitHub usernames: 1–39 chars, alphanumeric or single hyphens, no leading/trailing hyphen. */
function parseUser(input) {
  const value = String(input ?? "")
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "");

  if (!/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(value)) {
    throw new Error(`Invalid GitHub username "${input}"`);
  }

  return value;
}

module.exports = { daysBetween, daysAgo, oneYearAgo, parseRepo, parseUser, MS_PER_DAY };
