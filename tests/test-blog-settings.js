// Guards the blog functions (admin CRUD, public list, rendered page,
// sanitizing, sitemap) and the settings promo-usage counter.
const { installFakeBackend, loadFunction, ADMIN } = require("./fake-supabase");

async function run() {
  const failures = [];
  const check = (c, m) => { if (!c) failures.push(m); };

  // ---------- settings: promo usage ----------
  {
    const env = installFakeBackend();
    env.tables.site_settings = [{ id: "promo_config", value: { code: "X", extraPromoCodes: [{ code: "SPRING", percent: 10, maxUses: 5 }, { code: "FREE", percent: 5 }] } }];
    env.tables.orders = [{ id: "1", promo_code: "spring" }, { id: "2", promo_code: "SPRING" }, { id: "3", promo_code: "other" }, { id: "4", promo_code: null }];
    const { handler } = loadFunction("settings.js");
    const res = await handler({ httpMethod: "GET", headers: {} });
    const body = JSON.parse(res.body);
    check(body._promoUsage && body._promoUsage.SPRING === 2, "settings: SPRING should count 2 uses, got " + JSON.stringify(body._promoUsage));
    check(!("FREE" in (body._promoUsage || {})), "settings: codes without a limit are not counted");
    // saving never persists the computed field's presence in the stored row unless sent
    env.cleanup();
  }
  {
    const env = installFakeBackend();
    env.tables.site_settings = [{ id: "promo_config", value: { code: "X" } }];
    const { handler } = loadFunction("settings.js");
    const body = JSON.parse((await handler({ httpMethod: "GET", headers: {} })).body);
    check(!("_promoUsage" in body), "settings: no limited codes means no _promoUsage key");
    env.cleanup();
  }

  // ---------- blog ----------
  {
    const env = installFakeBackend();
    const blog = loadFunction("blog.js");
    const call = (method, o) => blog.handler({ httpMethod: method, headers: ADMIN, queryStringParameters: {}, ...o });

    check((await blog.handler({ httpMethod: "POST", headers: {}, body: "{}" })).statusCode === 401, "blog: POST without key must be 401");
    check((await blog.handler({ httpMethod: "GET", headers: {}, queryStringParameters: { all: "1" } })).statusCode === 401, "blog: ?all=1 without key must be 401");
    check((await call("POST", { body: JSON.stringify({ body: "x" }) })).statusCode === 400, "blog: title required");

    const draft = JSON.parse((await call("POST", { body: JSON.stringify({ title: "My First Post!", body: "<p>Hi</p>", published: false }) })).body);
    check(draft.slug === "my-first-post", "blog: slug should be made from the title, got " + draft.slug);
    let list = JSON.parse((await blog.handler({ httpMethod: "GET", headers: {}, queryStringParameters: {} })).body);
    check(list.length === 0, "blog: drafts must not appear in the public list");
    check((await blog.handler({ httpMethod: "GET", headers: {}, queryStringParameters: { slug: draft.slug } })).statusCode === 404, "blog: draft must 404 publicly");

    const pub = JSON.parse((await call("POST", { body: JSON.stringify({ title: "My First Post!", slug: draft.slug, body: "<p>Hi</p><script>alert(1)</script>", published: true, excerpt: "e" }) })).body);
    check(pub.published && pub.publishedAt, "blog: publishing should set a publish date");
    list = JSON.parse((await blog.handler({ httpMethod: "GET", headers: {}, queryStringParameters: {} })).body);
    check(list.length === 1 && !("body" in list[0]), "blog: public list has 1 post and no body");
    const all = JSON.parse((await call("GET", { queryStringParameters: { all: "1" } })).body);
    check(all.length === 1 && all[0].body, "blog: admin list includes body");
    check(env.tables.admin_log.some((l) => l.entity === "blog"), "blog: saves should be in the change log");

    // rendered page
    const realFetch = global.fetch;
    const page = loadFunction("blog-page.js");
    const shell = `<html><head></head><body><header class="site-header"><nav>NAV</nav></header><section>old</section><footer class="site-footer">FOOT</footer></body></html>`;
    global.fetch = async (u, i) => String(u).includes("blog-watt-hours") ? { ok: true, status: 200, text: async () => shell } : realFetch(u, i);
    const r = await page.handler({ queryStringParameters: { slug: draft.slug } });
    check(r.statusCode === 200, "blog-page: published post should render");
    check(/<title>My First Post! \| VoltReserve<\/title>/.test(r.body) && /rel="canonical" href="https:\/\/voltreservepower.com\/blog\/my-first-post"/.test(r.body), "blog-page: title/canonical wrong");
    check(r.body.includes("NAV") && r.body.includes("FOOT"), "blog-page: should reuse the site header and footer");
    check(!/<script>alert/.test(r.body), "blog-page: scripts in the body must be removed");
    check(/"@type":"Article"/.test(r.body), "blog-page: Article structured data missing");
    check((await page.handler({ queryStringParameters: { slug: "nope" } })).statusCode === 404, "blog-page: unknown slug is 404");
    global.fetch = realFetch;

    // sitemap lists the published post
    const sm = loadFunction("sitemap.js");
    const xml = (await sm.handler({})).body;
    check(xml.includes("/blog/my-first-post"), "sitemap: should list published blog post");

    // table missing -> public list empty, admin gets hint
    const env2 = installFakeBackend({ missingTables: ["blog_posts"] });
    const blog2 = loadFunction("blog.js");
    check(JSON.parse((await blog2.handler({ httpMethod: "GET", headers: {}, queryStringParameters: {} })).body).length === 0, "blog: missing table => empty public list");
    const bad = await blog2.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ title: "T" }) });
    check(bad.statusCode === 400 && /supabase-admin-upgrade/.test(bad.body), "blog: missing table => helpful hint");
    env2.cleanup();

    // delete
    const env3 = installFakeBackend();
    const blog3 = loadFunction("blog.js");
    await blog3.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ title: "Gone", published: true }) });
    await blog3.handler({ httpMethod: "DELETE", headers: ADMIN, queryStringParameters: { slug: "gone" } });
    check(env3.tables.blog_posts.length === 0, "blog: delete should remove the post");
    env3.cleanup();
  }
  return failures;
}

module.exports = { name: "blog-settings", run };
