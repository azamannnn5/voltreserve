/* ============================================
   PRODUCTS LOADER
   Fetches the live product catalog from the database (Netlify Function ->
   Supabase). Falls back to the bundled FALLBACK_PRODUCTS list from
   products-data.js if the live source is slow, empty, or unreachable, so
   the site never breaks even if the database has an issue.

   Every page's render calls should wait on PRODUCTS_READY before using
   the PRODUCTS variable, e.g.:
     PRODUCTS_READY.then(() => renderProductGrid(...));
   ============================================ */
let PRODUCTS = FALLBACK_PRODUCTS;

// Each catalog/settings fetch below is independent of the others (none of
// them need another one's result), so they run in PARALLEL rather than
// one-after-another - a visitor's live-data refresh only takes as long as
// the SLOWEST of the five calls, not the sum of all five. Each is still
// wrapped in its own try/catch so one failing/slow endpoint (e.g. a table
// that doesn't exist yet) never blocks or breaks the others, same
// tolerant-degradation behavior as before, just no longer serialized.
const PRODUCTS_READY = (async () => {
  await Promise.all([
    (async () => {
      try {
        const res = await fetch("/.netlify/functions/products");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            PRODUCTS = data;
          }
        }
      } catch (err) {
        console.warn("Live product data unavailable, using bundled fallback.", err);
      }
    })(),

    // Accessories and Solar Panels previously had no live-data path at
    // all - they were static-only, forever, with no way to edit them
    // without a redeploy. Same fetch-with-fallback pattern as PRODUCTS
    // above: mutate the existing arrays in place (rather than
    // reassigning) so anything that already holds a reference to
    // ACCESSORIES/SOLAR_PANELS picks up the live values automatically.
    (async () => {
      try {
        const accRes = await fetch("/.netlify/functions/accessories");
        if (accRes.ok) {
          const accData = await accRes.json();
          if (Array.isArray(accData) && accData.length > 0) {
            ACCESSORIES.length = 0;
            ACCESSORIES.push(...accData);
          }
        }
      } catch (err) {
        console.warn("Live accessories data unavailable, using bundled fallback.", err);
      }
    })(),

    (async () => {
      try {
        const solarRes = await fetch("/.netlify/functions/solar");
        if (solarRes.ok) {
          const solarData = await solarRes.json();
          if (Array.isArray(solarData) && solarData.length > 0) {
            SOLAR_PANELS.length = 0;
            SOLAR_PANELS.push(...solarData);
          }
        }
      } catch (err) {
        console.warn("Live solar panel data unavailable, using bundled fallback.", err);
      }
    })(),

    // Power Kits previously had no live-data path either - same
    // fetch-with-fallback pattern as Accessories/Solar Panels above,
    // added when Kits became admin-editable.
    (async () => {
      try {
        const bundlesRes = await fetch("/.netlify/functions/bundles");
        if (bundlesRes.ok) {
          const bundlesData = await bundlesRes.json();
          if (Array.isArray(bundlesData) && bundlesData.length > 0) {
            BUNDLES.length = 0;
            BUNDLES.push(...bundlesData);
          }
        }
      } catch (err) {
        console.warn("Live power kit data unavailable, using bundled fallback.", err);
      }
    })(),

    // Merge in any admin-saved promo settings. Mutates the existing
    // PROMO_CONFIG object in place (rather than reassigning it) so every
    // part of the site that already references PROMO_CONFIG.xxx picks up
    // the live values automatically once this resolves.
    (async () => {
      try {
        const settingsRes = await fetch("/.netlify/functions/settings");
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          if (settings && typeof settings === "object") {
            Object.assign(PROMO_CONFIG, settings);
          }
        }
      } catch (err) {
        console.warn("Live promo settings unavailable, using bundled defaults.", err);
      }
    })()
  ]);

  return PRODUCTS;
})();

// After any page finishes rendering product/bundle cards (which happens
// asynchronously, after PRODUCTS_READY resolves), give the scroll-reveal
// animation a moment to pick up the newly-added cards.
PRODUCTS_READY.then(() => {
  setTimeout(() => { if (typeof initScrollReveal === "function") initScrollReveal(); }, 50);
});

// Visitor's approximate country, detected via Netlify's built-in
// geolocation (no third-party API, no permission prompt). Used only to
// seed a smarter shipping estimate on the cart page before the visitor
// has typed anything, e.g. not assuming a US flat rate for a visitor
// who's clearly browsing from Ireland. Kept separate from PRODUCTS_READY
// so a slow/failed geo lookup never blocks product rendering.
const GEO_READY = (async () => {
  try {
    const res = await fetch("/.netlify/functions/geo");
    if (res.ok) {
      const data = await res.json();
      return { countryName: data.countryName || null, countryCode: data.countryCode || null };
    }
  } catch (err) {
    console.warn("Visitor geolocation unavailable, defaulting shipping estimate to US.", err);
  }
  return { countryName: null, countryCode: null };
})();
