// POST /.netlify/functions/send-promo
// Body: { "email": "customer@example.com" }
// Sends a branded transactional email with the SUMMER10 promo code, instantly,
// no third-party automation tool involved.
//
// Env vars required (Netlify → Site settings → Environment variables):
//   RESEND_API_KEY      (from resend.com, free tier is plenty for this volume)
//   PROMO_FROM_EMAIL    optional, e.g. "VoltReserve <promo@voltreservepower.com>"
//                        Requires verifying voltreservepower.com in Resend (DNS records).
//                        Until that's done, omit this and it sends from a Resend
//                        default address instead.

const PROMO_CODE = "SUMMER10";

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
        subject: "Your 10% off code from VoltReserve",
        html: promoEmailHTML(PROMO_CODE)
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

function promoEmailHTML(code) {
  return `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif; max-width:480px; margin:0 auto; padding:32px 24px; color:#1a1a1a;">
  <p style="font-size:12px; letter-spacing:1px; color:#16a34a; text-transform:uppercase; font-weight:600; margin:0 0 8px;">VoltReserve</p>
  <h1 style="font-size:22px; margin:0 0 16px;">Here's your 10% off code</h1>
  <p style="font-size:15px; line-height:1.5; color:#444; margin:0 0 8px;">
    Thanks for signing up. Use the code below at checkout, it's valid until September 7, 2026.
  </p>
  <div style="background:#f4f4f5; border:1px dashed #16a34a; border-radius:8px; padding:16px; text-align:center; margin:24px 0;">
    <span style="font-size:24px; font-weight:700; letter-spacing:2px; color:#16a34a;">${code}</span>
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
