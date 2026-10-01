// GET  /.netlify/functions/orders                 -> admin only, list orders (newest first)
//        ?status=new|confirmed|paid|shipped|delivered|cancelled  ?q=search text  ?limit=300
// POST /.netlify/functions/orders                 -> admin only, update one order
//        { id, status?, trackingNumber?, trackingUrl?, adminNotes?, emailCustomer? }
//        emailCustomer: true sends the customer a short status email.
//
// Backs the "Orders" tab in admin.html. Orders are created by send-order.js;
// this only lets the admin track them afterwards (status, tracking number,
// private notes). Moving an order to "confirmed" for the first time also
// takes its items out of stock for any product/accessory/solar panel that
// has a stock quantity set (see applyStockForOrder in lib/stock.js).
//
// Admin requests must include header: x-admin-key: <ADMIN_KEY env var>

const { getSupabase, corsHeaders, isAdmin, json, parseBody, logChange } = require("./lib/admin");
const { sendResendEmail, buildStatusEmail, fromAddress, ownerEmail } = require("./lib/emails");
const { applyStockForOrder } = require("./lib/stock");

const STATUSES = ["new", "confirmed", "paid", "shipped", "delivered", "cancelled"];

function fromRow(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    country: r.country,
    address: r.address,
    paymentMethod: r.payment_method,
    promoCode: r.promo_code,
    notes: r.notes,
    itemLines: r.item_lines || [],
    items: r.items || [],
    subtotal: r.subtotal,
    discountPercent: r.discount_percent,
    discountAmount: r.discount_amount,
    shippingType: r.shipping_type,
    total: r.total,
    emailsSent: !!r.emails_sent,
    status: r.status || "new",
    trackingNumber: r.tracking_number || "",
    trackingUrl: r.tracking_url || "",
    adminNotes: r.admin_notes || "",
    stockApplied: !!r.stock_applied,
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
    let query = supabase.from("orders").select("*").order("created_at", { ascending: false })
      .limit(Math.min(Number(q.limit) || 300, 2000));
    if (q.status && STATUSES.includes(q.status)) query = query.eq("status", q.status);
    const { data, error } = await query;
    if (error) return json(500, { error: error.message }, cors);
    let rows = (data || []).map(fromRow);
    if (q.q) {
      const needle = String(q.q).toLowerCase();
      rows = rows.filter((o) => JSON.stringify([o.name, o.email, o.phone, o.country, o.itemLines, o.trackingNumber]).toLowerCase().includes(needle));
    }
    return json(200, rows, cors);
  }

  if (event.httpMethod === "POST") {
    const parsed = parseBody(event);
    if (!parsed.ok) return json(400, { error: "Invalid JSON" }, cors);
    const p = parsed.value;
    if (!p.id) return json(400, { error: "id is required" }, cors);
    if (p.status !== undefined && !STATUSES.includes(p.status)) {
      return json(400, { error: "Unknown status" }, cors);
    }

    const { data: existing, error: loadErr } = await supabase.from("orders").select("*").eq("id", p.id).maybeSingle();
    if (loadErr) return json(500, { error: loadErr.message }, cors);
    if (!existing) return json(404, { error: "Order not found" }, cors);

    const update = {};
    if (p.status !== undefined) update.status = p.status;
    if (p.trackingNumber !== undefined) update.tracking_number = String(p.trackingNumber).trim() || null;
    if (p.trackingUrl !== undefined) update.tracking_url = String(p.trackingUrl).trim() || null;
    if (p.adminNotes !== undefined) update.admin_notes = String(p.adminNotes).trim() || null;
    update.updated_at = new Date().toISOString();

    const { data: saved, error } = await supabase.from("orders").update(update).eq("id", p.id).select().single();
    if (error) return json(500, { error: error.message }, cors);

    const warnings = [];

    // First time an order is confirmed (or goes straight to paid/shipped): take its items out of stock.
    const becameActive = p.status && ["confirmed", "paid", "shipped", "delivered"].includes(p.status);
    if (becameActive && !existing.stock_applied) {
      const stock = await applyStockForOrder(supabase, saved);
      if (stock.touched && stock.touched.length) {
        await supabase.from("orders").update({ stock_applied: true }).eq("id", p.id);
        await logChange(supabase, {
          action: "update", entity: "stock", entityId: p.id,
          summary: "Stock reduced for order: " + stock.touched.map((t) => `${t.id} ${t.from} -> ${t.to}`).join(", ")
        });
      } else if (stock.error) {
        warnings.push("Stock could not be updated: " + stock.error);
      }
    }

    let emailed = null;
    if (p.emailCustomer) {
      const mail = buildStatusEmail({
        name: saved.name,
        status: saved.status || "new",
        trackingNumber: saved.tracking_number,
        trackingUrl: saved.tracking_url,
        itemLines: saved.item_lines,
        note: p.emailNote
      });
      emailed = await sendResendEmail({ from: fromAddress(), to: [saved.email], replyTo: ownerEmail(), subject: mail.subject, html: mail.html });
      if (!emailed.ok) warnings.push("The status email could not be sent: " + String(emailed.errorText || "").slice(0, 200));
    }

    await logChange(supabase, {
      action: "update", entity: "orders", entityId: p.id,
      summary: `Order ${existing.name || existing.email}: ${[
        p.status !== undefined && `status ${existing.status || "new"} -> ${p.status}`,
        p.trackingNumber !== undefined && "tracking updated",
        p.adminNotes !== undefined && "notes updated",
        p.emailCustomer && (emailed && emailed.ok ? "customer emailed" : "customer email failed")
      ].filter(Boolean).join(", ")}`,
      before: { status: existing.status || "new", trackingNumber: existing.tracking_number || null, adminNotes: existing.admin_notes || null }
    });

    return json(200, { order: fromRow(saved), emailed: emailed ? emailed.ok : null, warnings }, cors);
  }

  return json(405, { error: "Method Not Allowed" }, cors);
};
