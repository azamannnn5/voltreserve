// Guards the exact scenario an admin cares about: saving new values in
// admin.html's Promo Settings (freeShippingThreshold, discountPercent,
// code) must change the actual CALCULATION on cart.html, not just the
// text shown somewhere. Simulates /.netlify/functions/settings returning
// an admin-saved override (free shipping at $200 instead of the bundled
// $500 default, a new code/discount), then checks getShippingStatus()
// and calculateDiscounts() both follow the override live.
const { makeDom, wait } = require("./helpers");

async function run() {
  const failures = [];

  const dom = makeDom("cart.html", {
    fetchImpl: async (url) => {
      const u = String(url);
      if (u.includes("/.netlify/functions/settings")) {
        return {
          ok: true, status: 200,
          json: async () => ({
            code: "SPRING20",
            discountPercent: 20,
            freeShippingThreshold: 200, // admin lowered this from the $500 default
            volumeQty: 2,
            volumeDiscountPercent: 7,
            spendThreshold: 1000,
            spendDiscountPercent: 10
          }),
        };
      }
      if (u.includes("/.netlify/functions/products")) {
        return { ok: true, status: 200, json: async () => ([]) }; // empty -> falls back to bundled catalog, fine for this test
      }
      return { ok: false, status: 404, json: async () => ({}) };
    },
    seedLocalStorage: { ecoflow_cart: JSON.stringify([{ id: "river-2", qty: 1 }]) }, // $169
  });
  await wait(300);
  const win = dom.window;

  // --- Shipping threshold must follow the admin override, not the $500 default ---
  if (typeof win.getShippingStatus !== "function") {
    failures.push("cart.html: getShippingStatus is not defined");
  } else {
    const at250 = win.getShippingStatus(250);
    if (at250.type !== "free") {
      failures.push(`getShippingStatus(250) after admin set threshold to $200: expected free shipping, got ${JSON.stringify(at250)} (still using the $500 default means admin changes aren't taking effect)`);
    }
    const at150 = win.getShippingStatus(150);
    if (at150.type !== "confirm") {
      failures.push(`getShippingStatus(150) after admin set threshold to $200: expected "confirm" (still under the new $200 threshold), got ${JSON.stringify(at150)}`);
    }
  }

  // --- Discount code + percent must follow the admin override, not FALL10/10% ---
  if (typeof win.calculateDiscounts !== "function") {
    failures.push("cart.html: calculateDiscounts is not defined");
  } else {
    const withOldCode = win.calculateDiscounts(300, 1, "FALL10");
    if (withOldCode.percent !== 0) {
      failures.push(`calculateDiscounts with the OLD code "FALL10" after admin changed it to "SPRING20": expected 0% (old code should no longer work), got ${withOldCode.percent}%`);
    }
    const withNewCode = win.calculateDiscounts(300, 1, "SPRING20");
    if (withNewCode.percent !== 20) {
      failures.push(`calculateDiscounts with the new admin-saved code "SPRING20": expected 20%, got ${withNewCode.percent}% (admin's discountPercent change isn't taking effect)`);
    }
  }

  // --- Announcement bar text must also follow the override (surface-level, but should still match) ---
  const bar = win.document.querySelector(".announcement-bar");
  if (bar) {
    if (!/SPRING20/.test(bar.textContent)) {
      failures.push(`announcement bar should show the admin-saved code "SPRING20", got: "${bar.textContent.trim()}"`);
    }
    if (/FALL10/.test(bar.textContent)) {
      failures.push(`announcement bar still shows the old hardcoded "FALL10" after an admin override`);
    }
  } else {
    failures.push("cart.html: .announcement-bar is missing");
  }

  dom.window.close();
  return failures;
}

module.exports = { name: "promo-live-override", run };
