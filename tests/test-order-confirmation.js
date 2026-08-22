// Guards the order confirmation flow: submitting an order should show the
// "order has been submitted" confirmation state, and the copy shouldn't
// contradict itself (e.g. "ready to send" next to "we've emailed you").
const { makeDom, delayedFetch, wait } = require("./helpers");

// A previous version of this test only checked el.style.display, which
// misses the actual bug that shipped: #order-ready-state had its OWN
// display correctly set to "block", but it was nested INSIDE
// #order-form-section, which gets hidden via display:none on submit - a
// hidden ancestor always wins over a descendant's own display value. This
// walks the full ancestor chain, which is what actually determines whether
// something is visible on screen.
function isActuallyVisible(win, el) {
  let node = el;
  while (node && node.nodeType === 1) {
    const display = win.getComputedStyle(node).display;
    if (display === "none") return false;
    node = node.parentElement;
  }
  return true;
}

async function run() {
  const failures = [];

  const dom = makeDom("cart.html", {
    fetchImpl: async (url) => {
      if (typeof url === "string" && url.includes("send-order")) {
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      }
      return delayedFetch([], 50)();
    },
    seedLocalStorage: { ecoflow_cart: JSON.stringify([{ id: "river-2", qty: 1 }]) },
  });
  await wait(300);
  const doc = dom.window.document;

  const readyState = doc.getElementById("order-ready-state");
  if (!readyState) {
    failures.push("cart.html: #order-ready-state element is missing");
  } else if (/ready to send/i.test(readyState.textContent) && /emailed/i.test(readyState.textContent)) {
    failures.push("cart.html: order-ready-state copy contradicts itself (says both 'ready to send' and already 'emailed')");
  }
  // Fill the order form and submit
  const setVal = (id, val) => { const el = doc.getElementById(id); if (el) el.value = val; };
  setVal("order-name", "Test User");
  setVal("order-phone", "5551234567");
  setVal("order-email", "test@example.com");
  setVal("order-country", "United States");
  setVal("order-address", "123 Test St, Austin, TX 78701");
  setVal("order-payment", "Card");

  const form = doc.getElementById("order-form");
  if (!form) {
    failures.push("cart.html: #order-form is missing");
  } else {
    form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    await wait(200);
    if (readyState && !isActuallyVisible(dom.window, readyState)) {
      failures.push("cart.html: order-ready-state is not actually visible after a successful order submission (its own display may say 'block', but a hidden ancestor is still hiding it - check it isn't nested inside order-form-section)");
    }
  }

  dom.window.close();
  return failures;
}

module.exports = { name: "order-confirmation", run };
