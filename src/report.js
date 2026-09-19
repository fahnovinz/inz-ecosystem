const DASH = "—";

function printStatsReport(report) {
  const { profile, repoStats, recentActivity } = report;

  console.log("\n  INZ GitHub Stats\n");
  console.log(`  @${report.username}  ${profile.url}`);
  if (profile.name) console.log(`  ${profile.name}`);
  if (profile.bio) console.log(`  ${profile.bio}`);
  console.log("");
  console.log(`  Joined        ${profile.createdAt} (${report.accountAgeDays}d ago)`);
  console.log(`  Followers     ${profile.followers}`);
  console.log(`  Public repos  ${profile.publicRepos}`);
  console.log("");
  console.log(`  Activity (${recentActivity.windowDays || 90}d)`);
  console.log(`  Events        ${recentActivity.count}`);
  console.log(`  Types         ${recentActivity.types.join(", ") || DASH}`);
  console.log(`  Merged PRs    ${report.mergedPrs} (12mo, third-party)`);
  console.log("");
  console.log("  Portfolio");
  console.log(`  Repos         ${repoStats.totalPublic}`);
  console.log(`  Stars         ${repoStats.totalStars}`);
  console.log(`  Licensed      ${repoStats.licensed}/${repoStats.totalPublic}`);
  if (repoStats.archived) console.log(`  Archived      ${repoStats.archived}`);
  if (repoStats.topLanguages.length) {
    const langs = repoStats.topLanguages.map((l) => `${l.name} (${l.repos})`).join(", ");
    console.log(`  Languages     ${langs}`);
  }
  if (repoStats.topContributorRepo) {
    console.log(
      `  Collaborators ${repoStats.topContributors} on ${repoStats.topContributorRepo}`
    );
  }

  if (repoStats.topRepos.length) {
    console.log("");
    console.log("  Top repos (by stars)");
    for (const repo of repoStats.topRepos) {
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

  const failed = report.checks.filter((check) => !check.passed && check.remedy);
  if (failed.length) {
    console.log("");
    console.log("  Next steps");
    for (const check of failed) {
      console.log(`  → ${check.remedy} (+${check.weight})`);
    }
  }

  console.log("");
  console.log("  Meta");
  console.log(`  Stars         ${report.meta.stars}`);
  console.log(`  Open issues   ${report.meta.openIssues}`);
  console.log(`  Language      ${report.meta.language || DASH}`);
  console.log(`  License       ${report.meta.license || DASH}`);
  console.log(`  Last push     ${report.meta.pushedAt}`);
  if (report.meta.archived) console.log("  Archived      yes");
  console.log("");
}

function printBadgesReport(report) {
  console.log(`\n  INZ Badges — ${report.fullName}\n`);
  console.log(report.markdown);
  console.log("");
}

function printProductsReport(catalog) {
  console.log("\n  INZ Ecosystem — Product Catalog\n");
  console.log(`  ${catalog.homepage}`);
  console.log(
    `  ${catalog.summary.products} product(s) · ${catalog.summary.tools} tool(s) · v${catalog.version}`
  );
  console.log("");

  const products = catalog.products.filter((p) => p.kind === "product");
  const tools = catalog.products.filter((p) => p.kind === "tool");

  if (products.length) {
    console.log("  Flagship product");
    for (const p of products) {
      console.log(`  ★ ${p.name}  [${p.status}]`);
      console.log(`    ${p.tagline}`);
      console.log(`    ${p.url}`);
      if (p.stack?.length) console.log(`    Stack  ${p.stack.join(" · ")}`);
      for (const h of p.highlights || []) {
        console.log(`    · ${h}`);
      }
      console.log("");
    }
  }

  if (tools.length) {
    console.log("  Developer tools");
    for (const p of tools) {
      console.log(`  • ${p.name}`);
      console.log(`    ${p.tagline}`);
      if (p.command) console.log(`    $ ${p.command}`);
      console.log("");
    }
  }

  console.log("  Tip: inz health fahnovinz/vraxtal-vault\n");
}

module.exports = {
  printStatsReport,
  printHealthReport,
  printBadgesReport,
  printProductsReport,
};
