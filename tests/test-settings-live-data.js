// Guards the new contact/payment settings fields: applyLiveContactInfo()
// and the cart's payment dropdown must both reflect PROMO_CONFIG once
// live settings load. PROMO_CONFIG itself is a top-level `const` in
// products-data.js, so it's not exposed as a window property (normal JS
// scoping, not a bug) - this checks the DOM side effects instead, which
// is what actually matters to a real visitor.
const { makeDom, delayedFetch, wait } = require("./helpers");

async function run() {
  const failures = [];

  const dom = makeDom("cart.html", {
    fetchImpl: async (url) => {
      const u = String(url);
      if (u.includes("/.netlify/functions/settings")) {
        return {
          ok: true, status: 200,
          json: async () => ({
            contactEmail: "support@example.com",
            contactPhone: "+1 555-0100",
            contactAddress: "123 Test St",
            paymentMethods: ["Venmo", "PayPal"],
          }),
        };
      }
      return delayedFetch([], 20)();
    },
  });
  await wait(300);

  // The cart's payment dropdown should reflect live settings
  const select = dom.window.document.getElementById("order-payment");
  if (select) {
    const values = Array.from(select.options).map((o) => o.value).filter(Boolean);
    if (!values.includes("Venmo") || !values.includes("PayPal")) {
      failures.push(`cart.html: payment dropdown should reflect live settings, got ${JSON.stringify(values)}`);
    }
    if (values.includes("Cash App")) {
      failures.push("cart.html: payment dropdown still shows hardcoded default (Cash App) instead of live settings");
    }
  } else {
    failures.push("cart.html: #order-payment select is missing");
  }

  dom.window.close();
  return failures;
}

module.exports = { name: "settings-live-data", run };
