// Footer social icons are injected via JS (not baked into every page's
// HTML), so this checks both states: nothing set -> no row at all (no
// empty gap in the footer), something set -> only those icons render,
// pointing at the admin-saved URL.
const { makeDom, wait } = require("./helpers");

async function run() {
  const failures = [];

  // --- State 1: no social links set anywhere (bundled defaults) ---
  const domEmpty = makeDom("index.html", {
    fetchImpl: async (url) => {
      const u = String(url);
      if (u.includes("/.netlify/functions/settings")) {
        return { ok: true, status: 200, json: async () => ({}) }; // nothing saved
      }
      if (u.includes("/.netlify/functions/products")) {
        return { ok: true, status: 200, json: async () => ([]) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    },
  });
  await wait(300);
  const rowEmpty = domEmpty.window.document.getElementById("footer-social-row");
  if (rowEmpty) {
    failures.push("footer-social-row should not exist when no social URLs are set, found an empty row instead");
  }
  domEmpty.window.close();

  // --- State 2: admin has set Instagram and YouTube only ---
  const domSet = makeDom("index.html", {
    fetchImpl: async (url) => {
      const u = String(url);
      if (u.includes("/.netlify/functions/settings")) {
        return {
          ok: true, status: 200,
          json: async () => ({
            socialInstagram: "https://instagram.com/voltreserve",
            socialYoutube: "https://youtube.com/@voltreserve",
          }),
        };
      }
      if (u.includes("/.netlify/functions/products")) {
        return { ok: true, status: 200, json: async () => ([]) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    },
  });
  await wait(300);
  const rowSet = domSet.window.document.getElementById("footer-social-row");
  if (!rowSet) {
    failures.push("footer-social-row should exist once Instagram/YouTube URLs are admin-saved, found nothing");
  } else {
    const links = [...rowSet.querySelectorAll("a")];
    const hrefs = links.map((a) => a.getAttribute("href"));
    if (!hrefs.includes("https://instagram.com/voltreserve")) {
      failures.push(`Instagram link missing or wrong, got: ${hrefs.join(", ")}`);
    }
    if (!hrefs.includes("https://youtube.com/@voltreserve")) {
      failures.push(`YouTube link missing or wrong, got: ${hrefs.join(", ")}`);
    }
    if (links.length !== 2) {
      failures.push(`expected exactly 2 icons (only the platforms that were set), got ${links.length}`);
    }
  }
  domSet.window.close();

  return failures;
}

module.exports = { name: "footer-social-icons", run };
