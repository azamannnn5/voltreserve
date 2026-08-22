const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

/**
 * Loads a page from the site root, inlining local <script src="js/...">
 * tags so jsdom doesn't need network access, and stripping things jsdom
 * can't/shouldn't handle (Google Fonts links, the Smartsupp chat widget).
 */
function loadHtml(file) {
  let html = fs.readFileSync(path.join(ROOT, file), "utf8");
  html = html.replace(/<script src="\/?(js\/[^"]+)"><\/script>/g, (m, src) =>
    `<script>${fs.readFileSync(path.join(ROOT, src), "utf8")}</script>`
  );
  html = html.replace(/<link[^>]+fonts\.googleapis[^>]*>/g, "");
  html = html.replace(/<link[^>]+fonts\.gstatic[^>]*>/g, "");
  html = html.replace(/<script type="text\/javascript">[\s\S]*?smartsupp[\s\S]*?<\/script>/g, "");
  return html;
}

/**
 * Builds a jsdom window for a given page. `fetchImpl` lets each test
 * control exactly how the simulated /.netlify/functions/products (and
 * /settings, /geo) calls behave (instant, slow, failing, etc).
 */
function makeDom(file, { fetchImpl, urlPath, seedLocalStorage } = {}) {
  const html = loadHtml(file);
  const dom = new JSDOM(html, {
    url: `https://voltreservepower.com/${urlPath || file}`,
    runScripts: "dangerously",
    pretendToBeVisual: true,
    beforeParse(window) {
      window.fetch = fetchImpl || (async () => ({ ok: false, status: 404, json: async () => ({}) }));
      window.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
      if (seedLocalStorage) {
        for (const [key, value] of Object.entries(seedLocalStorage)) {
          window.localStorage.setItem(key, value);
        }
      }
    },
  });
  return dom;
}

/** Fetch impl that resolves successfully after `delayMs` with the given payload. */
function delayedFetch(payload, delayMs) {
  return () =>
    new Promise((resolve) => {
      setTimeout(() => resolve({ ok: true, status: 200, json: async () => payload }), delayMs);
    });
}

/** Fetch impl that never resolves - simulates a truly hung request. */
function hangingFetch() {
  return () => new Promise(() => {});
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { loadHtml, makeDom, delayedFetch, hangingFetch, wait, ROOT };
