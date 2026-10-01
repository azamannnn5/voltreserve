const fs = require("fs");
const path = require("path");

const testFiles = fs
  .readdirSync(__dirname)
  .filter((f) => f.startsWith("test-") && f.endsWith(".js"));

async function main() {
  let totalFailures = 0;

  for (const file of testFiles) {
    const mod = require(path.join(__dirname, file));
    process.stdout.write(`\n▶ ${mod.name}\n`);
    let failures = [];
    try {
      failures = await mod.run();
    } catch (err) {
      failures = [`Test threw an unexpected error: ${err.stack || err.message}`];
    }
    if (failures.length === 0) {
      console.log(`  ✔ passed`);
    } else {
      failures.forEach((f) => console.log(`  ✘ ${f}`));
      totalFailures += failures.length;
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  if (totalFailures === 0) {
    console.log("All tests passed.");
    process.exit(0);
  } else {
    console.log(`${totalFailures} check(s) failed.`);
    process.exit(1);
  }
}

main();
