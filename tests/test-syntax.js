const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { ROOT } = require("./helpers");

function checkSyntax(code, label, failures) {
  try {
    new vm.Script(code, { filename: label });
  } catch (err) {
    failures.push(`${label}: ${err.message}`);
  }
}

async function run() {
  const failures = [];

  const jsDir = path.join(ROOT, "js");
  for (const file of fs.readdirSync(jsDir)) {
    if (!file.endsWith(".js")) continue;
    checkSyntax(fs.readFileSync(path.join(jsDir, file), "utf8"), `js/${file}`, failures);
  }

  const fnDir = path.join(ROOT, "netlify", "functions");
  if (fs.existsSync(fnDir)) {
    for (const file of fs.readdirSync(fnDir)) {
      if (!file.endsWith(".js")) continue;
      checkSyntax(fs.readFileSync(path.join(fnDir, file), "utf8"), `netlify/functions/${file}`, failures);
    }
  }

  const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(ROOT, file), "utf8");
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    scripts.forEach((m, i) => checkSyntax(m[1], `${file} (inline script #${i + 1})`, failures));
  }

  return failures;
}

module.exports = { name: "syntax-check", run };
