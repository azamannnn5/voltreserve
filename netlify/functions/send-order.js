// backend/netlify/functions/send-order.js
// Body: { name, email, phone, country, address, paymentMethod, promoCode, notes,
//         itemLines, items, subtotal, discountPercent, discountAmount, total, freeShipping }
//
// Sends two emails via Resend:
//   1. To the store owner (contact@voltreservepower.com) with full order + contact details
//   2. To the customer, confirming their order was received
// Also logs the order to Supabase's `orders` table (see supabase-schema.sql)
// if configured, so there's a persistent record independent of whether the
// emails actually deliver - previously the two emails were the only record
// of any order ever having been submitted.
//
// Every submission ALSO writes a row to the `notifications` table saying
// whether each email went out. If an email fails, the order still counts as
// received (the customer sees success, since their order is safely saved)
// and it shows up in the admin panel's Notifications tab, where it can be
// re-sent with one click. The email templates live in lib/emails.js so a
// resend produces exactly the same message.
//
// Env vars required (same as send-promo.js):
//   RESEND_API_KEY
//   PROMO_FROM_EMAIL   optional, e.g. "VoltReserve <orders@voltreservepower.com>"
//   OWNER_EMAIL         optional override, defaults to contact@voltreservepower.com
//   SUPABASE_URL / SUPABASE_SERVICE_KEY   optional, enables order logging

const { getSupabase } = require("./lib/admin");
const { sendOrderEmails, buildOrderEmails } = require("./lib/emails");
const { recordNotification } = require("./lib/notify");

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: "Method Not Allowed" };
  }

  let order;
  try {
    order = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const {
    name, email, phone, country, address, paymentMethod, promoCode, notes, itemLines, items,
    subtotal, discountPercent, discountAmount, shippingType, shippingCost, total
  } = order;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Valid customer email required" }) };
  }
  if (!Array.isArray(itemLines) || itemLines.length === 0) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Order must include at least one item" }) };
  }

  const supabase = getSupabase();

  try {
    // Log the order first, independent of whether the emails below succeed -
    // this is the persistent record that previously didn't exist at all
    // (the two emails used to be the only trace of an order ever coming in).
    let orderId = null;
    if (supabase) {
      const row = {
        name, email, phone, country, address,
        payment_method: paymentMethod,
        promo_code: promoCode || null,
        notes: notes || null,
        item_lines: itemLines,
        subtotal, discount_percent: discountPercent, discount_amount: discountAmount,
        shipping_type: shippingType, shipping_cost: shippingCost,
        total,
      };
      // `items` is the structured cart ([{id, qty}]) used for stock
      // tracking. Only sent when present so an older orders table (without
      // the column) keeps working until the SQL upgrade is run.
      if (Array.isArray(items) && items.length) row.items = items;
      let { data, error } = await supabase.from("orders").insert(row).select("id").single();
      if (error && row.items) {
        // Column probably doesn't exist yet: retry without it rather than lose the order.
        delete row.items;
        ({ data, error } = await supabase.from("orders").insert(row).select("id").single());
      }
      if (error) {
        console.error("Order logging failed (continuing to send emails anyway):", error);
      } else {
        orderId = data.id;
      }
    }

    const results = await sendOrderEmails(order);
    const failed = [results.owner, results.customer].filter((r) => r && !r.ok);

    if (supabase && orderId) {
      await supabase.from("orders").update({ emails_sent: failed.length === 0 }).eq("id", orderId);
    }

    const built = results.built || buildOrderEmails(order);
    const note = await recordNotification(supabase, {
      type: "order",
      refId: orderId,
      title: `New order, ${built.totalDisplay}${name ? " from " + name : ""}`,
      summary: itemLines.slice(0, 3).join("; ") + (itemLines.length > 3 ? ` (+${itemLines.length - 3} more)` : ""),
      payload: order,
      results
    });

    if (failed.length) {
      console.error("Resend error(s):", failed.map(f => f.errorText));
      // The order is safe if it was saved anywhere the admin can see it.
      if (orderId || note.saved) {
        return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, emailsFailed: true }) };
      }
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "One or more order emails failed to send" }) };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Server error" }) };
  }
};
