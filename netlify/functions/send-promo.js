// POST /.netlify/functions/send-promo
// Body: { "email": "customer@example.com" }
// Sends a branded transactional email with the current site-wide promo
// code, instantly, no third-party automation tool involved.
//
// The code/discount/end-date are NOT hardcoded here. This reads the same
// Supabase site_settings row that settings.js and admin.html's Promo
// Settings page write to, so a code change in the admin panel is
// reflected in this email without a redeploy. Falls back to the bundled
// defaults (mirroring products-data.js's PROMO_CONFIG) if Supabase isn't
// configured or the row hasn't been saved yet, same tolerant-degradation
// pattern as settings.js.
//
// Env vars required (Netlify → Site settings → Environment variables):
//   RESEND_API_KEY      (from resend.com, free tier is plenty for this volume)
//   PROMO_FROM_EMAIL    optional, e.g. "VoltReserve <promo@voltreservepower.com>"
//                        Requires verifying voltreservepower.com in Resend (DNS records).
//                        Until that's done, omit this and it sends from a Resend
//                        default address instead.
//   SUPABASE_URL, SUPABASE_SERVICE_KEY   (same as settings.js)

const { createClient } = require("@supabase/supabase-js");

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const SETTINGS_ROW_ID = "promo_config";

// Mirrors the hardcoded defaults in js/products-data.js. Only the fields
// this email actually uses are needed here.
const DEFAULT_PROMO = {
  code: "FALL10",
  discountPercent: 10,
  endDateLabel: "November 15, 2026"
};

async function getLivePromo() {
  if (!supabase) return DEFAULT_PROMO;
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", SETTINGS_ROW_ID)
      .maybeSingle();
    if (error || !data || !data.value) return DEFAULT_PROMO;
    return { ...DEFAULT_PROMO, ...data.value };
  } catch {
    return DEFAULT_PROMO;
  }
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

  let email;
  try {
    ({ email } = JSON.parse(event.body || "{}"));
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Valid email required" }) };
  }

  const fromAddress = process.env.PROMO_FROM_EMAIL || "VoltReserve <onboarding@resend.dev>";
  const promo = await getLivePromo();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: `Your ${promo.discountPercent}% off code from VoltReserve`,
        html: promoEmailHTML(promo)
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", errText);
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "Email send failed" }) };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Server error" }) };
  }
};

function promoEmailHTML(promo) {
  return `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif; max-width:480px; margin:0 auto; padding:32px 24px; color:#1a1a1a;">
  <p style="font-size:12px; letter-spacing:1px; color:#16a34a; text-transform:uppercase; font-weight:600; margin:0 0 8px;">VoltReserve</p>
  <h1 style="font-size:22px; margin:0 0 16px;">Here's your ${promo.discountPercent}% off code</h1>
  <p style="font-size:15px; line-height:1.5; color:#444; margin:0 0 8px;">
    Thanks for signing up. Use the code below at checkout, it's valid until ${promo.endDateLabel}.
  </p>
  <div style="background:#f4f4f5; border:1px dashed #16a34a; border-radius:8px; padding:16px; text-align:center; margin:24px 0;">
    <span style="font-size:24px; font-weight:700; letter-spacing:2px; color:#16a34a;">${promo.code}</span>
  </div>
  <p style="font-size:13px; color:#888; line-height:1.5; margin:0 0 4px;">
    Enter this code in the promo field on your cart page before you submit your order.
  </p>
  <p style="font-size:13px; color:#888; line-height:1.5;">
    Questions? Just reply to this email or start a chat with us at voltreservepower.com.
  </p>
  <p style="font-size:12px; color:#bbb; margin-top:32px;">VoltReserve, independent EcoFlow reseller</p>
</div>`.trim();
}
