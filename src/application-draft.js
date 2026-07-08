function generateApplicationDraft(report, options = {}) {
  const repo = options.repo || report.repoStats.bestContributorRepo || `${report.username}/YOUR_REPO`;
  const track = report.recommendedTrack;

  const usagePlan = [
    "I plan to use Claude Max to accelerate open-source maintenance and community support:",
    "",
    "1. Code review and triage for incoming pull requests and issues",
    "2. Documentation improvements and contributor onboarding guides",
    "3. Refactoring, test coverage, and CI reliability for my maintained repositories",
    "4. Designing new features based on community feedback",
    "",
    "This will help me ship higher-quality releases faster while keeping the project accessible to new contributors.",
  ].join("\n");

  let qualification;

  if (track === "maintainer" && report.mergedPrs >= 100) {
    qualification = [
      `I qualify under the Maintainer Track as an active open-source contributor.`,
      "",
      `Over the past 12 months, I have authored ${report.mergedPrs} pull requests merged into public repositories I do not own. My GitHub account (@${report.username}) has been active since ${report.profile.createdAt}, with continuous public open-source activity including commits, pull requests, and repository maintenance.`,
      "",
      `I maintain ${report.repoStats.totalOssRepos} public repositories under OSI-approved licenses. My primary project is ${repo}, which I actively maintain—triaging issues, reviewing contributions, and releasing updates.`,
      "",
      `Open-source software is foundational to how I work and how the broader developer ecosystem builds. Claude Max would directly support my ability to maintain quality, respond to contributors, and ship dependable tooling for the community.`,
    ].join("\n");
  } else if (report.repoStats.bestExternalContributors >= 20) {
    qualification = [
      `I qualify under the Maintainer Track as a community builder.`,
      "",
      `I maintain ${repo}, a public open-source project under an OSI-approved license. The repository has ${report.repoStats.bestExternalContributors} unique external contributors with merged pull requests, reflecting sustained community participation beyond my own contributions.`,
      "",
      `My role includes reviewing PRs, guiding new contributors, maintaining CI pipelines, and prioritizing roadmap items based on real user needs. I have ${report.repoStats.totalOssRepos} public repositories and remain active in the open-source ecosystem with ${report.mergedPrs} merged PRs to third-party projects in the last 12 months.`,
      "",
      `This project serves as practical infrastructure for developers. Claude Max would help me scale maintainer capacity—faster reviews, better docs, and more responsive support for the contributors who depend on this work.`,
    ].join("\n");
  } else {
    qualification = [
      `I am applying under the Ecosystem Impact Track.`,
      "",
      `I maintain ${repo}, an open-source developer tool distributed under the MIT license. While my project is still growing, it addresses a concrete need: helping open-source maintainers verify eligibility and prepare high-quality applications for support programs, while also providing reusable CLI tooling for contribution analytics.`,
      "",
      `My GitHub account (@${report.username}, created ${report.profile.createdAt}) shows ongoing public activity. I have ${report.mergedPrs} pull requests merged into third-party repositories over the last 12 months, and I maintain ${report.repoStats.totalOssRepos} public repositories with OSI-approved licensing.`,
      "",
      `The ecosystem depends on maintainers who often lack tooling and time. This project reduces friction for legitimate contributors seeking resources to sustain their work. I use Claude daily in my development workflow; extending that capacity would directly improve how quickly I can ship fixes, review community PRs, and document contribution paths for new participants.`,
      "",
      `I am committed to authentic, substantive open-source work—not metric inflation—and would use Claude Max responsibly to benefit the projects and contributors I serve.`,
    ].join("\n");
  }

  const wordCount = qualification.split(/\s+/).filter(Boolean).length;

  return [
    "========== DRAFT APLIKASI CLAUDE FOR OSS ==========",
    "Form: https://claude.com/open-source-max",
    "",
    "--- FIELD 1: Sign in with GitHub ---",
    `Gunakan akun: @${report.username}`,
    "",
    "--- FIELD 2: Email ---",
    "Gunakan email yang terhubung ke akun GitHub kamu",
    "",
    "--- FIELD 3: How you plan to use your subscription ---",
    usagePlan,
    "",
    "--- FIELD 4: Why you qualify (max 500 words) ---",
    qualification,
    "",
    `--- Word count: ${wordCount} / 500 ---`,
    wordCount > 500 ? "PERINGATAN: Draft melebihi 500 kata. Ringkas sebelum submit!" : "OK: Draft dalam batas 500 kata.",
    "",
    "========== CATATAN ==========",
    "- Edit draft ini dengan detail spesifik proyek kamu",
    "- Jangan copy-paste tanpa personalisasi",
    "- Jangan inflate metrics (melanggar Terms of Service)",
    "- Submit hanya sekali; duplicate application diabaikan",
  ].join("\n");
}

module.exports = { generateApplicationDraft };