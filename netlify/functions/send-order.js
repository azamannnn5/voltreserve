// backend/netlify/functions/send-order.js
// Body: { name, email, phone, country, address, paymentMethod, promoCode, notes,
//         itemLines, subtotal, discountPercent, discountAmount, total, freeShipping }
//
// Sends two emails via Resend:
//   1. To the store owner (contact@voltreservepower.com) with full order + contact details
//   2. To the customer, confirming their order was received
// Also logs the order to Supabase's `orders` table (see supabase-schema.sql)
// if configured, so there's a persistent record independent of whether the
// emails actually deliver - previously the two emails were the only record
// of any order ever having been submitted.
//
// Env vars required (same as send-promo.js):
//   RESEND_API_KEY
//   PROMO_FROM_EMAIL   optional, e.g. "VoltReserve <orders@voltreservepower.com>"
//   OWNER_EMAIL         optional override, defaults to contact@voltreservepower.com
//   SUPABASE_URL / SUPABASE_SERVICE_KEY   optional, enables order logging

const OWNER_EMAIL = process.env.OWNER_EMAIL || "contact@voltreservepower.com";

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  const { createClient } = require("@supabase/supabase-js");
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

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
    name, email, phone, country, address, paymentMethod, promoCode, notes, itemLines,
    subtotal, discountPercent, discountAmount, shippingType, shippingCost, shippingNote, total
  } = order;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Valid customer email required" }) };
  }
  if (!Array.isArray(itemLines) || itemLines.length === 0) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Order must include at least one item" }) };
  }

  const fromAddress = process.env.PROMO_FROM_EMAIL || "VoltReserve <onboarding@resend.dev>";
  const itemsHtml = itemLines.map(line => `<li style="margin-bottom:6px;">${escapeHtml(line)}</li>`).join("");

  const hasDiscount = Number(discountPercent) > 0;
  const subtotalDisplay = "$" + Number(subtotal || total || 0).toLocaleString();
  const totalDisplay = "$" + Number(total || 0).toLocaleString();
  const discountDisplay = "$" + Number(discountAmount || 0).toLocaleString();

  const totalsHtml = hasDiscount ? `
    <p style="font-size:14px; color:#888; margin:12px 0 2px; text-decoration:line-through;">Subtotal: ${subtotalDisplay}</p>
    <p style="font-size:14px; color:#16a34a; margin:0 0 2px;">Discount (${discountPercent}% off): -${discountDisplay}</p>
    <p style="font-size:16px; font-weight:700; margin:2px 0 8px;">Total: ${totalDisplay}</p>
  ` : `
    <p style="font-size:15px; font-weight:700; margin:12px 0 8px;">Total: ${totalDisplay}</p>
  `;
  const shippingHtml = (() => {
    if (shippingType === "free") return `<p style="font-size:13px; color:#16a34a; margin:0 0 16px;">Shipping: Free</p>`;
    return `<p style="font-size:13px; color:#888; margin:0 0 16px;">Shipping: confirmed after order request</p>`;
  })();

  const ownerHtml = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif; max-width:560px; margin:0 auto; padding:28px 24px; color:#1a1a1a;">
  <p style="font-size:12px; letter-spacing:1px; color:#16a34a; text-transform:uppercase; font-weight:600; margin:0 0 8px;">VoltReserve, New Order</p>
  <h1 style="font-size:20px; margin:0 0 18px;">New order request</h1>
  <ul style="padding-left:18px; font-size:14px; color:#333;">${itemsHtml}</ul>
  ${totalsHtml}
  ${shippingHtml}
  <table style="width:100%; font-size:14px; color:#333; border-collapse:collapse;">
    <tr><td style="padding:4px 0; color:#888; width:140px;">Name</td><td>${escapeHtml(name || "Not provided")}</td></tr>
    <tr><td style="padding:4px 0; color:#888;">Email</td><td>${escapeHtml(email)}</td></tr>
    <tr><td style="padding:4px 0; color:#888;">Phone</td><td>${escapeHtml(phone || "Not provided")}</td></tr>
    <tr><td style="padding:4px 0; color:#888;">Country</td><td>${escapeHtml(country || "Not provided")}</td></tr>
    <tr><td style="padding:4px 0; color:#888;">Delivery Address</td><td>${escapeHtml(address || "Not provided")}</td></tr>
    <tr><td style="padding:4px 0; color:#888;">Preferred Payment</td><td>${escapeHtml(paymentMethod || "Not provided")}</td></tr>
    <tr><td style="padding:4px 0; color:#888;">Promo Code</td><td>${escapeHtml(promoCode || "None")}</td></tr>
    <tr><td style="padding:4px 0; color:#888;">Notes</td><td>${escapeHtml(notes || "None")}</td></tr>
  </table>
</div>`.trim();

  const customerHtml = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif; max-width:480px; margin:0 auto; padding:32px 24px; color:#1a1a1a;">
  <p style="font-size:12px; letter-spacing:1px; color:#16a34a; text-transform:uppercase; font-weight:600; margin:0 0 8px;">VoltReserve</p>
  <h1 style="font-size:22px; margin:0 0 16px;">Thanks, your order is in</h1>
  <p style="font-size:15px; line-height:1.5; color:#444; margin:0 0 16px;">
    Here's what you ordered. A team member will reach out to ${escapeHtml(email)} within 24 hours to confirm details and arrange payment, nothing has been charged yet.
  </p>
  <ul style="padding-left:18px; font-size:14px; color:#333; margin:0 0 12px;">${itemsHtml}</ul>
  ${totalsHtml}
  ${shippingHtml}
  <p style="font-size:13px; color:#888; line-height:1.5;">
    Questions in the meantime? Use the live chat on voltreservepower.com, our team is there for support.
  </p>
  <p style="font-size:12px; color:#bbb; margin-top:32px;">VoltReserve, independent EcoFlow reseller</p>
</div>`.trim();

  try {
    // Log the order first, independent of whether the emails below succeed -
    // this is the persistent record that previously didn't exist at all
    // (the two emails used to be the only trace of an order ever coming in).
    let orderId = null;
    if (supabase) {
      const { data, error } = await supabase.from("orders").insert({
        name, email, phone, country, address,
        payment_method: paymentMethod,
        promo_code: promoCode || null,
        notes: notes || null,
        item_lines: itemLines,
        subtotal, discount_percent: discountPercent, discount_amount: discountAmount,
        shipping_type: shippingType, shipping_cost: shippingCost,
        total,
      }).select("id").single();
      if (error) {
        console.error("Order logging failed (continuing to send emails anyway):", error);
      } else {
        orderId = data.id;
      }
    }

    const results = await Promise.all([
      sendResendEmail({ from: fromAddress, to: [OWNER_EMAIL], subject: `New order, ${totalDisplay}`, html: ownerHtml }),
      sendResendEmail({ from: fromAddress, to: [email], subject: "Your VoltReserve order", html: customerHtml })
    ]);

    const failed = results.filter(r => !r.ok);

    if (supabase && orderId) {
      await supabase.from("orders").update({ emails_sent: failed.length === 0 }).eq("id", orderId);
    }

    if (failed.length) {
      console.error("Resend error(s):", failed.map(f => f.errorText));
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "One or more order emails failed to send" }) };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Server error" }) };
  }
};

async function sendResendEmail({ from, to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from, to, subject, html })
  });
  if (!res.ok) {
    return { ok: false, errorText: await res.text() };
  }
  return { ok: true };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
