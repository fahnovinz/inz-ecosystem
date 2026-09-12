function daysBetween(from, to = new Date()) {
  return Math.floor((to - new Date(from)) / (1000 * 60 * 60 * 24));
}

function daysAgo(n) {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().slice(0, 10);
}

function oneYearAgo() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().slice(0, 10);
}

// GitHub logins: alphanumeric with single hyphens, never leading or trailing, max 39.
const USERNAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const REPO_NAME = /^[A-Za-z0-9_.-]+$/;

function parseRepo(input) {
  const parts = String(input ?? "").split("/");
  if (parts.length !== 2 || !USERNAME.test(parts[0]) || !REPO_NAME.test(parts[1])) {
    throw new Error(`Invalid repo format "${input}". Use owner/repo`);
  }
  return { owner: parts[0], repo: parts[1], fullName: `${parts[0]}/${parts[1]}` };
}

function parseUsername(input) {
  const name = String(input ?? "");
  if (!USERNAME.test(name)) {
    throw new Error(`Invalid GitHub username "${input}".`);
  }
  return name;
}

module.exports = { daysBetween, daysAgo, oneYearAgo, parseRepo, parseUsername };
