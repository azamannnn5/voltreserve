// GET    /.netlify/functions/blog              public: published posts (list, no body)
// GET    /.netlify/functions/blog?slug=x       public: one published post (with body)
// GET    /.netlify/functions/blog?all=1        admin: every post including drafts, with body
// POST   /.netlify/functions/blog              admin: create / update a post
// DELETE /.netlify/functions/blog?slug=x       admin: delete a post
//
// Backs the admin panel's Blog tab. The 9 original guides are normal HTML
// files and are not touched; posts written here live at /blog/<slug>.
// If the blog_posts table doesn't exist yet (the SQL upgrade hasn't been
// run), the public list is simply empty and the admin gets a clear hint.

const { getSupabase, corsHeaders, isAdmin, json, parseBody, logChange } = require("./lib/admin");
const { makeSlug } = require("./lib/blog-html");

const cors = corsHeaders("GET, POST, DELETE, OPTIONS");

const fromRow = (r, withBody) => ({
  slug: r.slug, title: r.title, description: r.description || "", excerpt: r.excerpt || "",
  category: r.category || "", coverImage: r.cover_image || "", published: !!r.published,
  publishedAt: r.published_at || null, updatedAt: r.updated_at || null,
  ...(withBody ? { body: r.body || "" } : {})
});

const missing = (err) => err && /does not exist|schema cache|relation/i.test(String(err.message || ""));
const HINT = "The blog table is missing. Run supabase-admin-upgrade.sql in Supabase, then try again.";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  const supabase = getSupabase();
  const params = event.queryStringParameters || {};
  const admin = isAdmin(event);

  if (event.httpMethod === "GET") {
    if (!supabase) return json(200, params.slug ? null : [], cors);
    if (params.all) {
      if (!admin) return json(401, { error: "Unauthorized" }, cors);
      const { data, error } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
      if (error) return json(missing(error) ? 200 : 500, missing(error) ? { posts: [], hint: HINT } : { error: error.message }, cors);
      return json(200, data.map((r) => fromRow(r, true)), cors);
    }
    if (params.slug) {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("slug", params.slug).eq("published", true).maybeSingle();
      if (error || !data) return json(404, { error: "Not found" }, cors);
      return json(200, fromRow(data, true), cors, { "Cache-Control": "public, max-age=60" });
    }
    const { data, error } = await supabase.from("blog_posts").select("*").eq("published", true).order("published_at", { ascending: false });
    if (error) return json(200, [], cors);
    return json(200, data.map((r) => fromRow(r, false)), cors, { "Cache-Control": "public, max-age=60" });
  }

  if (!admin) return json(401, { error: "Unauthorized" }, cors);
  if (!supabase) return json(500, { error: "Supabase is not configured" }, cors);

  if (event.httpMethod === "POST") {
    const parsed = parseBody(event);
    if (!parsed.ok) return json(400, { error: "Invalid JSON" }, cors);
    const p = parsed.value || {};
    const title = String(p.title || "").trim();
    if (!title) return json(400, { error: "A title is required" }, cors);
    const slug = makeSlug(p.slug || title);
    if (!slug) return json(400, { error: "Could not make a web address from that title" }, cors);

    let prev = null;
    try {
      const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
      prev = data || null;
    } catch { /* ignore */ }

    const published = !!p.published;
    const row = {
      slug, title,
      description: String(p.description || "").trim() || null,
      excerpt: String(p.excerpt || "").trim() || null,
      body: String(p.body || ""),
      cover_image: String(p.coverImage || "").trim() || null,
      category: String(p.category || "").trim() || null,
      published,
      published_at: published ? ((prev && prev.published_at) || new Date().toISOString()) : null
    };
    const { data, error } = await supabase.from("blog_posts").upsert(row, { onConflict: "slug" }).select();
    if (error) return json(missing(error) ? 400 : 500, { error: missing(error) ? HINT : error.message }, cors);
    await logChange(supabase, {
      action: "save", entity: "blog", entityId: slug,
      summary: `${prev ? "Edited" : "Added"} blog post "${title}"${published ? "" : " (draft)"}`,
      before: prev ? fromRow(prev, true) : null, after: fromRow((data && data[0]) || row, true)
    });
    return json(200, fromRow((data && data[0]) || row, true), cors);
  }

  if (event.httpMethod === "DELETE") {
    const slug = params.slug;
    if (!slug) return json(400, { error: "Missing slug" }, cors);
    let prev = null;
    try {
      const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
      prev = data || null;
    } catch { /* ignore */ }
    const { error } = await supabase.from("blog_posts").delete().eq("slug", slug);
    if (error) return json(500, { error: error.message }, cors);
    await logChange(supabase, { action: "delete", entity: "blog", entityId: slug, summary: `Deleted blog post "${(prev && prev.title) || slug}"`, before: prev ? fromRow(prev, true) : null });
    return json(200, { ok: true }, cors);
  }

  return json(405, { error: "Method Not Allowed" }, cors);
};
