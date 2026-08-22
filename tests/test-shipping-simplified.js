// Guards the simplified shipping policy: free at the $500+ threshold,
// otherwise no dollar amount is calculated or shown at all - just
// "confirmed after order request", regardless of country or address. The
// old $19.95 flat rate, PO Box/APO/FPO block, and AK/HI/PR/territories
// freight-quote special case are all gone on purpose - this test makes
// sure they don't quietly come back.
const { makeDom, hangingFetch, wait } = require("./helpers");

async function run() {
  const failures = [];

  const dom = makeDom("cart.html", {
    fetchImpl: hangingFetch(),
    seedLocalStorage: { ecoflow_cart: JSON.stringify([{ id: "river-2", qty: 1 }]) }, // $169, under $500
  });
  await wait(200);
  const win = dom.window;
  const doc = win.document;

  // --- getShippingStatus() itself ---
  if (typeof win.getShippingStatus !== "function") {
    failures.push("cart.html: getShippingStatus is not defined");
  } else {
    const under = win.getShippingStatus(169);
    if (under.type !== "confirm" || under.cost !== 0) {
      failures.push(`getShippingStatus(169): expected {type:"confirm", cost:0}, got ${JSON.stringify(under)}`);
    }
    const over = win.getShippingStatus(600);
    if (over.type !== "free" || over.cost !== 0) {
      failures.push(`getShippingStatus(600): expected {type:"free", cost:0}, got ${JSON.stringify(over)}`);
    }
    // Old signature took (country, address, subtotal) - if a stray call
    // site still passes a country/address as the first two args, this
    // would silently misbehave (subtotal would be undefined). Calling
    // with just a number is the only supported shape now.
    if (win.getShippingStatus.length > 1) {
      failures.push(`getShippingStatus should take exactly one argument (subtotal), function signature suggests otherwise (length=${win.getShippingStatus.length})`);
    }
  }

  // --- Cart summary must never show $19.95, PO Box, or freight quote text ---
  const summaryBody = doc.getElementById("cart-summary-body");
  const summaryText = summaryBody ? summaryBody.textContent : "";
  if (/19\.95/.test(summaryText)) {
    failures.push("cart.html: cart summary still shows the old $19.95 flat rate");
  }
  if (/freight quote/i.test(summaryText) || /PO Box/i.test(summaryText)) {
    failures.push("cart.html: cart summary still shows old freight-quote/PO-Box copy");
  }
  if (!/confirmed after request|confirm/i.test(summaryText) && !/free/i.test(summaryText)) {
    failures.push(`cart.html: cart summary shipping row doesn't show either "Free" or "confirmed after request" - got: "${summaryText}"`);
  }

  // --- Submitting an order with a PO-Box-style address must NOT be blocked ---
  const setVal = (id, val) => { const el = doc.getElementById(id); if (el) el.value = val; };
  setVal("order-name", "Test User");
  setVal("order-phone", "5551234567");
  setVal("order-email", "test@example.com");
  setVal("order-country", "United States");
  setVal("order-address", "PO Box 123, Austin, TX 78701"); // used to be hard-blocked
  setVal("order-payment", "Card");

  let alertCalled = false;
  win.alert = () => { alertCalled = true; };

  let sentBody = null;
  win.fetch = async (url, opts) => {
    if (typeof url === "string" && url.includes("send-order")) {
      sentBody = JSON.parse(opts.body);
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };

  const form = doc.getElementById("order-form");
  form.dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
  await wait(200);

  if (alertCalled) {
    failures.push("cart.html: submitting an order with a PO Box address triggered a blocking alert() - this restriction should be removed");
  }
  if (!sentBody) {
    failures.push("cart.html: order submission with a PO Box address never reached send-order.js (still being blocked somewhere)");
  } else if (sentBody.shippingCost !== 0) {
    failures.push(`cart.html: order payload sent shippingCost=${sentBody.shippingCost}, expected 0 (no cost should ever be calculated/sent)`);
  }

  dom.window.close();
  return failures;
}

module.exports = { name: "shipping-simplified", run };
