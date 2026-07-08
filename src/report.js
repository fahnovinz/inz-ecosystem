function statusIcon(passed) {
  return passed ? "[PASS]" : "[FAIL]";
}

function printReport(report) {
  console.log("\n=== Claude for OSS Eligibility Report ===\n");
  console.log(`GitHub: @${report.username} (${report.profile.url})`);
  console.log(`Akun dibuat: ${report.profile.createdAt} (${report.accountAgeDays} hari)`);
  console.log(`Repo publik: ${report.profile.publicRepos}`);
  console.log(`PR merged ke repo lain (12 bln): ${report.mergedPrs}`);
  console.log(`Track rekomendasi: ${report.recommendedTrack.toUpperCase()}`);
  console.log("");

  const groups = [
    { title: "Syarat Umum (WAJIB)", track: "general" },
    { title: "Maintainer Track (pilih salah satu)", track: "maintainer" },
    { title: "Alternatif", track: "ecosystem" },
  ];

  for (const group of groups) {
    console.log(`--- ${group.title} ---`);
    for (const check of report.checks.filter((item) => item.track === group.track)) {
      const icon = check.manual ? "[MANUAL]" : statusIcon(check.passed);
      console.log(`${icon} ${check.label}`);
      console.log(`      Nilai: ${check.value}`);
      console.log(`      Target: ${check.target}`);
    }
    console.log("");
  }

  if (report.repoStats.topRepos.length > 0) {
    console.log("--- Repo OSS Teratas ---");
    for (const repo of report.repoStats.topRepos) {
      console.log(`  - ${repo.name} | stars: ${repo.stars} | license: ${repo.license}`);
    }
    console.log("");
  }

  console.log("--- Kesimpulan ---");
  if (!report.generalPassed) {
    console.log("Belum memenuhi syarat umum. Perbaiki item [FAIL] di atas sebelum apply.");
  } else if (report.maintainerPassed) {
    console.log("Syarat umum OK + ada kriteria Maintainer Track yang terpenuhi. Siap apply!");
  } else {
    console.log("Syarat umum OK. Gunakan Ecosystem Impact Track dan jelaskan dampak proyek kamu (max 500 kata).");
  }

  console.log(`\nApply di: ${report.applyUrl}`);
  console.log(`Info program: ${report.programUrl}`);
  console.log(`Terms: ${report.termsUrl}\n`);
}

module.exports = { printReport };