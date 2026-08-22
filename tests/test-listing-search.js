// Guards the on-page search boxes added to Accessories, Solar Panels, and
// Power Kits (products.html already had one). Each should filter its grid
// down as the visitor types, and show a "no results" message instead of
// an empty grid when nothing matches - same UX products.html already had.
const { makeDom, wait } = require("./helpers");

async function checkSearch({ file, inputId, gridId, cardSelector, query, expectAtLeastOne, expectFewerThan }) {
  const failures = [];
  const dom = makeDom(file);
  await wait(50);
  const doc = dom.window.document;

  const input = doc.getElementById(inputId);
  if (!input) {
    failures.push(`${file}: #${inputId} search box is missing`);
    dom.window.close();
    return failures;
  }

  const before = doc.querySelectorAll(`#${gridId} ${cardSelector}`).length;
  if (before === 0) {
    failures.push(`${file}: #${gridId} has no cards before searching, can't verify filtering`);
    dom.window.close();
    return failures;
  }

  input.value = query;
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  await wait(20);

  const after = doc.querySelectorAll(`#${gridId} ${cardSelector}`).length;
  if (expectAtLeastOne && after === 0) {
    failures.push(`${file}: searching "${query}" produced zero results, expected at least one match`);
  }
  if (expectFewerThan && after >= before) {
    failures.push(`${file}: searching "${query}" should narrow the grid (was ${before} cards), got ${after}`);
  }

  // A query that matches nothing should show a message, not a blank grid.
  input.value = "zzz-no-such-item-zzz";
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  await wait(20);
  const noneLeft = doc.querySelectorAll(`#${gridId} ${cardSelector}`).length;
  const gridText = doc.getElementById(gridId)?.textContent || "";
  if (noneLeft !== 0 || !gridText.trim()) {
    failures.push(`${file}: an unmatched search should show a "no results" message, got ${noneLeft} cards and empty/blank grid text`);
  }

  dom.window.close();
  return failures;
}

async function run() {
  let failures = [];

  failures = failures.concat(await checkSearch({
    file: "accessories.html", inputId: "accessory-search-input", gridId: "accessory-grid",
    cardSelector: ".product-card", query: "Waterproof", expectAtLeastOne: true, expectFewerThan: true,
  }));

  failures = failures.concat(await checkSearch({
    file: "solar.html", inputId: "solar-search-input", gridId: "solar-grid",
    cardSelector: ".product-card", query: "45W", expectAtLeastOne: true, expectFewerThan: true,
  }));

  failures = failures.concat(await checkSearch({
    file: "kits.html", inputId: "kit-search-input", gridId: "bundle-grid",
    cardSelector: ".product-card", query: "Weekend", expectAtLeastOne: true, expectFewerThan: true,
  }));

  return failures;
}

module.exports = { name: "listing-search", run };
