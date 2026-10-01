// This is the exact class of bug we hit on the ProFound site: a page that
// renders twice (instant fallback + live-data refresh) can leave newly
// created .reveal elements stuck at opacity:0 if the reveal system only
// scans the page once. VoltReserve's initScrollReveal() was already built
// to be safely re-callable (skips already-bound elements via
// dataset.revealBound), and products-loader.js already re-calls it after
// PRODUCTS_READY resolves - this test locks that behavior in so a future
// change can't quietly reintroduce the bug.
const { makeDom, delayedFetch, wait } = require("./helpers");

const liveProductsThatDifferFromFallback = [
  {
    id: "river-2", series: "RIVER", capacityTier: "UNDER500", name: "RIVER 2 (live)",
    tagline: "live data", capacityWh: 256, capacityLabel: "256Wh", outputW: 300,
    outputLabel: "300W", chargeTime: "60 min", weight: "7.7 lb", price: 179,
    useCase: "test", badge: "NEW", description: "test", images: [],
  },
];

async function run() {
  const failures = [];

  const dom = makeDom("products.html", { fetchImpl: delayedFetch(liveProductsThatDifferFromFallback, 100) });
  await wait(400); // let the delayed fetch resolve and the second render happen
  const doc = dom.window.document;

  const cards = doc.querySelectorAll("#product-grid .product-card");
  if (cards.length === 0) {
    failures.push("products.html: no product cards found after live-data refresh");
  }
  // NOTE: jsdom's stubbed IntersectionObserver never actually fires an
  // intersection callback, so we can't assert the final .in-view state
  // here (that requires a real browser). What we CAN assert - and what
  // actually matters for this bug class - is that every card present after
  // the live-data refresh was picked up by initScrollReveal() at all
  // (dataset.revealBound set). A card with .reveal but no revealBound
  // means it was created by the second render pass and never registered
  // with the observer - permanently stuck invisible in a real browser,
  // exactly like the ProFound bug.
  cards.forEach((el) => {
    if (el.classList.contains("reveal") && el.dataset.revealBound !== "1") {
      failures.push(`products.html: card has class "${el.className}" but was never registered with initScrollReveal (dataset.revealBound missing) - would be stuck invisible`);
    }
  });

  dom.window.close();
  return failures;
}

module.exports = { name: "reveal-visibility", run };
