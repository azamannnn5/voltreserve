// POST /.netlify/functions/send-contact
// Body: { name, email, message }
//
// Sends the contact form message via Resend:
//   1. To the store owner (contact@voltreservepower.com) with the message + reply-to set to the customer
//   2. To the customer, confirming their message was received
//
// This replaces the old mailto: link approach (which relied on the
// customer's own email client actually sending it, with no way to confirm
// it went through) with a real server-side send + confirmation, matching
// the order flow's send-order.js.
//
// Also logs the message to Supabase's `contact_messages` table (see
// supabase-schema.sql) if configured, before attempting either email -
// same reasoning as send-order.js's order logging: previously the two
// emails were the ONLY record of a message ever coming in, so if the
// email failed or got lost, there was nothing left to fall back on.
//
// Env vars required (same as send-order.js):
//   RESEND_API_KEY
//   PROMO_FROM_EMAIL   optional, e.g. "VoltReserve <orders@voltreservepower.com>"
//   OWNER_EMAIL        optional override, defaults to contact@voltreservepower.com
//   SUPABASE_URL / SUPABASE_SERVICE_KEY   optional, enables message logging

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

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { name, email, message } = payload;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Valid email required" }) };
  }
  if (!message || !message.trim()) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Message required" }) };
  }

  const fromAddress = process.env.PROMO_FROM_EMAIL || "VoltReserve <onboarding@resend.dev>";

  const ownerHtml = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif; max-width:560px; margin:0 auto; padding:28px 24px; color:#1a1a1a;">
  <p style="font-size:12px; letter-spacing:1px; color:#16a34a; text-transform:uppercase; font-weight:600; margin:0 0 8px;">VoltReserve, Website Contact</p>
  <h1 style="font-size:20px; margin:0 0 18px;">New message from ${escapeHtml(name || "a visitor")}</h1>
  <table style="width:100%; font-size:14px; color:#333; border-collapse:collapse; margin-bottom:16px;">
    <tr><td style="padding:4px 0; color:#888; width:100px;">Name</td><td>${escapeHtml(name || "Not provided")}</td></tr>
    <tr><td style="padding:4px 0; color:#888;">Email</td><td>${escapeHtml(email)}</td></tr>
  </table>
  <p style="font-size:14px; color:#333; white-space:pre-wrap; border-top:1px solid #eee; padding-top:16px;">${escapeHtml(message)}</p>
</div>`.trim();

  const customerHtml = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif; max-width:480px; margin:0 auto; padding:32px 24px; color:#1a1a1a;">
  <p style="font-size:12px; letter-spacing:1px; color:#16a34a; text-transform:uppercase; font-weight:600; margin:0 0 8px;">VoltReserve</p>
  <h1 style="font-size:22px; margin:0 0 16px;">We've got your message</h1>
  <p style="font-size:15px; line-height:1.5; color:#444; margin:0 0 16px;">
    Thanks for reaching out${name ? `, ${escapeHtml(name)}` : ""}. A team member will reply to ${escapeHtml(email)} shortly.
  </p>
  <p style="font-size:13px; color:#888; line-height:1.5; border-top:1px solid #eee; padding-top:16px; white-space:pre-wrap;">${escapeHtml(message)}</p>
  <p style="font-size:12px; color:#bbb; margin-top:32px;">VoltReserve, independent EcoFlow reseller</p>
</div>`.trim();

  try {
    // Log the message first, independent of whether the emails below
    // succeed - this is the persistent record that previously didn't
    // exist at all (the two emails used to be the only trace of a
    // message ever coming in).
    let messageId = null;
    if (supabase) {
      const { data, error } = await supabase.from("contact_messages").insert({
        name: name || null, email, message
      }).select("id").single();
      if (error) {
        console.error("Contact message logging failed (continuing to send emails anyway):", error);
      } else {
        messageId = data.id;
      }
    }

    const results = await Promise.all([
      sendResendEmail({ from: fromAddress, to: [OWNER_EMAIL], replyTo: email, subject: `Website contact message from ${name || email}`, html: ownerHtml }),
      sendResendEmail({ from: fromAddress, to: [email], subject: "We've got your message - VoltReserve", html: customerHtml })
    ]);

    const failed = results.filter(r => !r.ok);

    if (supabase && messageId) {
      await supabase.from("contact_messages").update({ emails_sent: failed.length === 0 }).eq("id", messageId);
    }

    if (failed.length) {
      console.error("Resend error(s):", failed.map(f => f.errorText));
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "One or more emails failed to send" }) };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Server error" }) };
  }
};

async function sendResendEmail({ from, to, replyTo, subject, html }) {
  const body = { from, to, subject, html };
  if (replyTo) body.reply_to = replyTo;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
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
