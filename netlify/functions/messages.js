// GET  /.netlify/functions/messages               -> admin only, list contact messages (newest first)
//        ?status=new|replied|closed  ?q=search text  ?limit=300
// POST /.netlify/functions/messages               -> admin only
//        { id, status?, adminNotes? }                 update status / private notes
//        { action: "reply", id, body }                emails a reply to the customer,
//                                                      marks the message "replied"
//
// Backs the "Messages" tab in admin.html. Messages are created by
// send-contact.js; replies are sent from the normal sender address with
// reply-to set to the owner mailbox, so the customer's answer lands in the
// regular inbox.
//
// Admin requests must include header: x-admin-key: <ADMIN_KEY env var>

const { getSupabase, corsHeaders, isAdmin, json, parseBody, logChange } = require("./lib/admin");
const { sendResendEmail, buildReplyEmail, fromAddress, ownerEmail } = require("./lib/emails");

const STATUSES = ["new", "replied", "closed"];

function fromRow(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    message: r.message,
    emailsSent: !!r.emails_sent,
    status: r.status || "new",
    adminNotes: r.admin_notes || "",
    repliedAt: r.replied_at || null,
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
    let query = supabase.from("contact_messages").select("*").order("created_at", { ascending: false })
      .limit(Math.min(Number(q.limit) || 300, 2000));
    if (q.status && STATUSES.includes(q.status)) query = query.eq("status", q.status);
    const { data, error } = await query;
    if (error) return json(500, { error: error.message }, cors);
    let rows = (data || []).map(fromRow);
    if (q.q) {
      const needle = String(q.q).toLowerCase();
      rows = rows.filter((m) => JSON.stringify([m.name, m.email, m.message]).toLowerCase().includes(needle));
    }
    return json(200, rows, cors);
  }

  if (event.httpMethod === "POST") {
    const parsed = parseBody(event);
    if (!parsed.ok) return json(400, { error: "Invalid JSON" }, cors);
    const p = parsed.value;
    if (!p.id) return json(400, { error: "id is required" }, cors);

    const { data: existing, error: loadErr } = await supabase.from("contact_messages").select("*").eq("id", p.id).maybeSingle();
    if (loadErr) return json(500, { error: loadErr.message }, cors);
    if (!existing) return json(404, { error: "Message not found" }, cors);

    if (p.action === "reply") {
      const body = String(p.body || "").trim();
      if (!body) return json(400, { error: "Write a reply first" }, cors);
      const html = buildReplyEmail({ name: existing.name, body, originalMessage: existing.message });
      const sent = await sendResendEmail({
        from: fromAddress(), to: [existing.email], replyTo: ownerEmail(),
        subject: "Re: your message to VoltReserve", html
      });
      if (!sent.ok) {
        return json(502, { error: "The reply could not be sent: " + String(sent.errorText || "").slice(0, 200) }, cors);
      }
      const { data: saved, error } = await supabase.from("contact_messages")
        .update({ status: "replied", replied_at: new Date().toISOString() }).eq("id", p.id).select().single();
      if (error) return json(500, { error: error.message }, cors);
      await logChange(supabase, {
        action: "update", entity: "messages", entityId: p.id,
        summary: `Replied to ${existing.name || existing.email}`
      });
      return json(200, { message: fromRow(saved) }, cors);
    }

    if (p.status !== undefined && !STATUSES.includes(p.status)) return json(400, { error: "Unknown status" }, cors);
    const update = {};
    if (p.status !== undefined) update.status = p.status;
    if (p.adminNotes !== undefined) update.admin_notes = String(p.adminNotes).trim() || null;
    if (!Object.keys(update).length) return json(400, { error: "Nothing to update" }, cors);
    const { data: saved, error } = await supabase.from("contact_messages").update(update).eq("id", p.id).select().single();
    if (error) return json(500, { error: error.message }, cors);
    await logChange(supabase, {
      action: "update", entity: "messages", entityId: p.id,
      summary: `Message from ${existing.name || existing.email}: ${p.status !== undefined ? "marked " + p.status : "notes updated"}`
    });
    return json(200, { message: fromRow(saved) }, cors);
  }

  return json(405, { error: "Method Not Allowed" }, cors);
};
