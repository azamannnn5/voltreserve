// GET  /.netlify/functions/admin-log        -> admin only, the change history (newest first)
// POST /.netlify/functions/admin-log        -> admin only, { action?, entity, summary } adds one summary line
//       ?entity=products|accessories|solar|bundles|settings|blog|orders|messages|notifications|stock
//       ?limit=200
//
// Backs the "Change log" tab in admin.html. Entries are written by the other
// admin endpoints whenever something is saved, deleted or updated. For
// products / accessories / solar panels / kits / settings / blog posts an
// entry also holds a copy of what was there BEFORE, which the admin panel
// uses for its "Restore" button. History is kept forever.
//
// Admin requests must include header: x-admin-key: <ADMIN_KEY env var>

const { getSupabase, corsHeaders, isAdmin, json, parseBody, logChange } = require("./lib/admin");

exports.handler = async (event) => {
  const cors = corsHeaders("GET, POST, OPTIONS");
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (!isAdmin(event)) return json(401, { error: "Unauthorized" }, cors);
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" }, cors);

  const supabase = getSupabase();
  if (!supabase) return json(503, { error: "Supabase not configured yet, see SETUP.md" }, cors);

  // POST lets the admin panel record one summary line for work it did in a
  // loop (reordering, bulk price changes) instead of one line per item.
  if (event.httpMethod === "POST") {
    const parsed = parseBody(event);
    if (!parsed.ok) return json(400, { error: "Invalid JSON" }, cors);
    const p = parsed.value;
    if (!p.entity || !p.summary) return json(400, { error: "entity and summary are required" }, cors);
    await logChange(supabase, { action: p.action || "update", entity: String(p.entity).slice(0, 40), entityId: p.entityId, summary: String(p.summary).slice(0, 300) });
    return json(200, { ok: true }, cors);
  }

  const q = event.queryStringParameters || {};
  let query = supabase.from("admin_log").select("*").order("created_at", { ascending: false })
    .limit(Math.min(Number(q.limit) || 200, 1000));
  if (q.entity) query = query.eq("entity", q.entity);
  const { data, error } = await query;
  if (error) {
    const hint = /relation .* does not exist|schema cache/i.test(error.message || "")
      ? "The change log table doesn't exist yet. Run supabase-admin-upgrade.sql in the Supabase SQL Editor."
      : error.message;
    return json(500, { error: hint }, cors);
  }
  return json(200, (data || []).map((r) => ({
    id: r.id, action: r.action, entity: r.entity, entityId: r.entity_id,
    summary: r.summary, before: r.before, after: r.after, createdAt: r.created_at
  })), cors);
};
