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
// Every submission ALSO writes a row to the `notifications` table saying
// whether each email went out, so a failed email shows up in the admin
// panel's Notifications tab (and can be re-sent from there). If the message
// itself was saved, the visitor sees success even if an email failed -
// their message is safely recorded and will be seen. Email templates live
// in lib/emails.js.
//
// Env vars required (same as send-order.js):
//   RESEND_API_KEY
//   PROMO_FROM_EMAIL   optional, e.g. "VoltReserve <orders@voltreservepower.com>"
//   OWNER_EMAIL        optional override, defaults to contact@voltreservepower.com
//   SUPABASE_URL / SUPABASE_SERVICE_KEY   optional, enables message logging

const { getSupabase } = require("./lib/admin");
const { sendContactEmails } = require("./lib/emails");
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

  const supabase = getSupabase();

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

    const results = await sendContactEmails({ name, email, message });
    const failed = [results.owner, results.customer].filter((r) => r && !r.ok);

    if (supabase && messageId) {
      await supabase.from("contact_messages").update({ emails_sent: failed.length === 0 }).eq("id", messageId);
    }

    const note = await recordNotification(supabase, {
      type: "contact",
      refId: messageId,
      title: `Message from ${name || email}`,
      summary: message.trim().slice(0, 160),
      payload: { name: name || null, email, message },
      results
    });

    if (failed.length) {
      console.error("Resend error(s):", failed.map(f => f.errorText));
      if (messageId || note.saved) {
        return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, emailsFailed: true }) };
      }
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "One or more emails failed to send" }) };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Server error" }) };
  }
};
