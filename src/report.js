function printStatsReport(report) {
  console.log("\n  INZ GitHub Stats\n");
  console.log(`  @${report.username}  ${report.profile.url}`);
  if (report.profile.name) console.log(`  ${report.profile.name}`);
  if (report.profile.bio) console.log(`  ${report.profile.bio}`);
  console.log("");
  console.log(`  Joined        ${report.profile.createdAt} (${report.accountAgeDays}d ago)`);
  console.log(`  Followers     ${report.profile.followers}`);
  console.log(`  Public repos  ${report.profile.publicRepos}`);
  console.log("");
  console.log("  Activity (90d)");
  console.log(`  Events        ${report.recentActivity.count}`);
  console.log(`  Types         ${report.recentActivity.types.join(", ") || "—"}`);
  console.log(`  Merged PRs    ${report.mergedPrs} (12mo, third-party)`);
  console.log("");
  console.log("  Portfolio");
  console.log(`  Repos         ${report.repoStats.totalPublic}`);
  console.log(`  Stars         ${report.repoStats.totalStars}`);
  console.log(`  Licensed      ${report.repoStats.licensed}`);
  if (report.repoStats.topLanguages.length) {
    const langs = report.repoStats.topLanguages.map((l) => `${l.name} (${l.repos})`).join(", ");
    console.log(`  Languages     ${langs}`);
  }

  if (report.repoStats.topRepos.length) {
    console.log("");
    console.log("  Top repos");
    for (const repo of report.repoStats.topRepos) {
      console.log(`  • ${repo.name}`);
      console.log(`    ${repo.stars} stars · ${repo.language} · ${repo.license}`);
    }
  }

  console.log("");
}

function printHealthReport(report) {
  console.log(`\n  INZ Repo Health — ${report.fullName}\n`);
  console.log(`  Score   ${report.score}/100 (${report.grade})`);
  console.log(`  URL     ${report.url}`);
  console.log("");
  console.log("  Checks");
  for (const check of report.checks) {
    const mark = check.passed ? "[ok]" : "[--]";
    console.log(`  ${mark} ${check.label}`);
  }
  console.log("");
  console.log("  Meta");
  console.log(`  Stars         ${report.meta.stars}`);
  console.log(`  Open issues   ${report.meta.openIssues}`);
  console.log(`  Language      ${report.meta.language || "—"}`);
  console.log(`  License       ${report.meta.license || "—"}`);
  console.log(`  Last push     ${report.meta.pushedAt}`);
  console.log("");
}

function printBadgesReport(report) {
  console.log(`\n  INZ Badges — ${report.fullName}\n`);
  console.log(report.markdown);
  console.log("");
}

module.exports = { printStatsReport, printHealthReport, printBadgesReport };