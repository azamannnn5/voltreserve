// GET  /.netlify/functions/notifications           -> admin only, list (newest first)
//        ?type=order|contact  ?status=sent|partial|failed  ?unread=1  ?limit=200
//        Always includes counts { unread, failed } for the tab badge.
// POST /.netlify/functions/notifications           -> admin only
//        { action: "read",   id }            mark one read
//        { action: "unread", id }            mark one unread
//        { action: "readall", type? }        mark everything (of a type) read
//        { action: "resend", id, target? }   re-send the emails for that
//                                            submission. target = "owner" |
//                                            "customer" | "both"; default is
//                                            whichever email(s) failed.
//
// Backs the "Notifications" tab in admin.html. Every order and contact
// submission is recorded here by send-order.js / send-contact.js along with
// whether its emails were delivered. Records are kept forever (no delete).
//
// Admin requests must include header: x-admin-key: <ADMIN_KEY env var>

const { getSupabase, corsHeaders, isAdmin, json, parseBody, logChange } = require("./lib/admin");
const { sendOrderEmails, sendContactEmails } = require("./lib/emails");
const { summarize } = require("./lib/notify");

function fromRow(r) {
  return {
    id: r.id,
    type: r.type,
    refId: r.ref_id,
    title: r.title,
    summary: r.summary,
    status: r.status,
    ownerSent: r.owner_sent,
    customerSent: r.customer_sent,
    error: r.error,
    payload: r.payload || {},
    read: !!r.read,
    resentCount: r.resent_count || 0,
    lastAttemptAt: r.last_attempt_at,
    createdAt: r.created_at
  };
}

exports.handler = async (event) => {
  const cors = corsHeaders("GET, POST, OPTIONS");
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (!isAdmin(event)) return json(401, { error: "Unauthorized" }, cors);

  const supabase = getSupabase();
  if (!supabase) return json(503, { error: "Supabase not configured yet, see SETUP.md" }, cors);

  if (event.httpMethod === "GET") {
    const q = event.queryStringParameters || {};
    let query = supabase.from("notifications").select("*").order("created_at", { ascending: false })
      .limit(Math.min(Number(q.limit) || 200, 1000));
    if (q.type) query = query.eq("type", q.type);
    if (q.status) query = query.eq("status", q.status);
    if (q.unread === "1") query = query.eq("read", false);
    const { data, error } = await query;
    if (error) return json(500, { error: tableHint(error) }, cors);

    // Counts for the tab badge (always across everything, not the filtered view).
    const [unreadRes, failedRes] = await Promise.all([
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
      supabase.from("notifications").select("id", { count: "exact", head: true }).neq("status", "sent").eq("read", false)
    ]);
    return json(200, {
      items: (data || []).map(fromRow),
      counts: { unread: unreadRes.count || 0, needsAttention: failedRes.count || 0 }
    }, cors);
  }

  if (event.httpMethod === "POST") {
    const parsed = parseBody(event);
    if (!parsed.ok) return json(400, { error: "Invalid JSON" }, cors);
    const { action, id } = parsed.value;

    if (action === "read" || action === "unread") {
      if (!id) return json(400, { error: "id is required" }, cors);
      const { error } = await supabase.from("notifications").update({ read: action === "read" }).eq("id", id);
      if (error) return json(500, { error: error.message }, cors);
      return json(200, { ok: true }, cors);
    }

    if (action === "readall") {
      let query = supabase.from("notifications").update({ read: true }).eq("read", false);
      if (parsed.value.type) query = query.eq("type", parsed.value.type);
      const { error } = await query;
      if (error) return json(500, { error: error.message }, cors);
      return json(200, { ok: true }, cors);
    }

    if (action === "resend") {
      if (!id) return json(400, { error: "id is required" }, cors);
      const { data: row, error: loadErr } = await supabase.from("notifications").select("*").eq("id", id).maybeSingle();
      if (loadErr) return json(500, { error: loadErr.message }, cors);
      if (!row) return json(404, { error: "Notification not found" }, cors);

      const payload = row.payload || {};
      if (!payload.email) return json(422, { error: "This record has no saved submission to re-send." }, cors);

      let only = parsed.value.target;
      if (only === "both" || !["owner", "customer"].includes(only)) only = null;
      if (!parsed.value.target) {
        if (!row.owner_sent && row.customer_sent) only = "owner";
        else if (row.owner_sent && !row.customer_sent) only = "customer";
        else only = null; // both failed, or both already sent: resend both
      }

      const results = row.type === "order"
        ? await sendOrderEmails(payload, only || undefined)
        : await sendContactEmails(payload, only || undefined);

      // Merge with what already went out: an email not attempted this time keeps its old state.
      const merged = {
        owner: results.owner || { ok: !!row.owner_sent },
        customer: results.customer || { ok: !!row.customer_sent }
      };
      const s = summarize(merged);
      const update = {
        status: s.status,
        owner_sent: s.ownerOk,
        customer_sent: s.customerOk,
        error: s.error,
        resent_count: (row.resent_count || 0) + 1,
        last_attempt_at: new Date().toISOString(),
        read: s.status === "sent" ? true : row.read
      };
      const { data: saved, error: updErr } = await supabase.from("notifications").update(update).eq("id", id).select().single();
      if (updErr) return json(500, { error: updErr.message }, cors);

      // Keep the order / message record's own "emails sent" flag honest too.
      if (row.ref_id) {
        const table = row.type === "order" ? "orders" : "contact_messages";
        await supabase.from(table).update({ emails_sent: s.status === "sent" }).eq("id", row.ref_id);
      }
      await logChange(supabase, {
        action: "resend", entity: "notifications", entityId: id,
        summary: `Re-sent ${only || "both"} email(s) for "${row.title}" - ${s.status}`
      });
      return json(200, { ok: s.status === "sent", notification: fromRow(saved) }, cors);
    }

    return json(400, { error: "Unknown action" }, cors);
  }

  return json(405, { error: "Method Not Allowed" }, cors);
};

function tableHint(error) {
  const msg = (error && error.message) || "Unknown error";
  if (/relation .* does not exist|schema cache/i.test(msg)) {
    return "The notifications table doesn't exist yet. Run supabase-admin-upgrade.sql in the Supabase SQL Editor.";
  }
  return msg;
}
