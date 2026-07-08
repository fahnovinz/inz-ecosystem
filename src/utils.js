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

function parseRepo(input) {
  const match = input.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match) {
    throw new Error(`Invalid repo format "${input}". Use owner/repo`);
  }
  return { owner: match[1], repo: match[2], fullName: input };
}

module.exports = { daysBetween, daysAgo, oneYearAgo, parseRepo };