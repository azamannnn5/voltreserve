// Guards against the "blank page until PRODUCTS_READY resolves" bug: every
// page that shows product data must render immediately from the bundled
// FALLBACK_PRODUCTS, never wait on the network for first paint.
const { makeDom, hangingFetch, wait } = require("./helpers");

async function run() {
  const failures = [];

  const cases = [
    { file: "index.html", containerId: "featured-grid" },
    { file: "products.html", containerId: "product-grid" },
    { file: "kits.html", containerId: "bundle-grid" },
    { file: "delta.html", containerId: "product-grid" },
    { file: "delta-pro.html", containerId: "product-grid" },
    { file: "river.html", containerId: "product-grid" },
    { file: "trail.html", containerId: "product-grid" },
    { file: "search.html", containerId: "search-results", urlPath: "search.html?q=river" },
  ];

  for (const c of cases) {
    const dom = makeDom(c.file, { fetchImpl: hangingFetch(), urlPath: c.urlPath });
    await wait(200);
    const el = dom.window.document.getElementById(c.containerId);
    if (!el || el.children.length === 0) {
      failures.push(`${c.file} #${c.containerId} is empty at 200ms with a hanging backend (should render instantly from FALLBACK_PRODUCTS)`);
    }
    dom.window.close();
  }

  // --- Product detail page ---
  {
    const dom = makeDom("product.html", { fetchImpl: hangingFetch(), urlPath: "product.html?id=river-2" });
    await wait(200);
    const detail = dom.window.document.getElementById("product-detail");
    if (!detail || !detail.innerHTML.trim()) {
      failures.push("product.html #product-detail is empty at 200ms with a hanging backend");
    }
    dom.window.close();
  }

  // --- Cart page (uses localStorage cart, not the product fetch, for its
  //     own contents, but line-item pricing depends on PRODUCTS) ---
  {
    const dom = makeDom("cart.html", {
      fetchImpl: hangingFetch(),
      seedLocalStorage: { ecoflow_cart: JSON.stringify([{ id: "river-2", qty: 1 }]) },
    });
    await wait(200);
    const list = dom.window.document.getElementById("cart-items");
    if (!list || list.children.length === 0) {
      failures.push("cart.html #cart-items is empty at 200ms with a hanging backend (should render instantly using fallback product data)");
    }
    dom.window.close();
  }

  // --- Compare page ---
  {
    const dom = makeDom("compare.html", {
      fetchImpl: hangingFetch(),
      seedLocalStorage: { ecoflow_compare: JSON.stringify(["river-2", "delta-3-plus"]) },
    });
    await wait(200);
    const table = dom.window.document.getElementById("compare-table");
    if (!table || !table.innerHTML.trim()) {
      failures.push("compare.html #compare-table is empty at 200ms with a hanging backend");
    }
    dom.window.close();
  }

  return failures;
}

module.exports = { name: "instant-render", run };
