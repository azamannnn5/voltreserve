// Guards the structural-safety fix: any admin-editable text field
// (product name, tagline, etc.) must never be interpreted as real HTML
// on the live site, even if it contains something that looks like a tag.
const { makeDom, delayedFetch, wait } = require("./helpers");

const MALICIOUS_NAME = '<img src=x onerror=alert(1)>Evil Product';
const MALICIOUS_TAGLINE = '<script>window.__pwned = true;</script>Look here';

async function run() {
  const failures = [];

  const dom = makeDom("products.html", {
    fetchImpl: delayedFetch([
      {
        id: "evil-product", series: "RIVER", capacityTier: "UNDER500",
        name: MALICIOUS_NAME, tagline: MALICIOUS_TAGLINE,
        capacityWh: 256, capacityLabel: "256Wh", outputW: 300, outputLabel: "300W",
        chargeTime: "60 min", weight: "7.7 lb", price: 169, useCase: "test",
        badge: null, description: "test", images: [], inStock: true,
      },
    ], 30),
  });
  await wait(300);
  const doc = dom.window.document;

  const injectedImg = doc.querySelector('img[onerror]');
  if (injectedImg) {
    failures.push("products.html: a malicious product name was rendered as real HTML (found an <img onerror> element in the DOM) - escaping is not working");
  }

  const grid = doc.getElementById("product-grid");
  const gridText = grid ? grid.textContent : "";
  if (!gridText.includes("Evil Product")) {
    failures.push('products.html: the product name text itself should still appear on the page (just as plain text, not markup)');
  }

  dom.window.close();
  return failures;
}

module.exports = { name: "xss-escaping", run };
