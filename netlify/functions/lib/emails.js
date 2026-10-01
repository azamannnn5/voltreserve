// Email building + sending shared by send-order.js, send-contact.js and
// the admin endpoints that RE-send or reply to something (notifications.js,
// messages.js). Keeping the templates in one module means a resend from the
// admin panel produces exactly the same email the customer/owner would have
// received the first time.
//
// Env vars:
//   RESEND_API_KEY
//   PROMO_FROM_EMAIL   optional, e.g. "VoltReserve <orders@voltreservepower.com>"
//   OWNER_EMAIL        optional override, defaults to contact@voltreservepower.com

function ownerEmail() {
  return process.env.OWNER_EMAIL || "contact@voltreservepower.com";
}

function fromAddress() {
  return process.env.PROMO_FROM_EMAIL || "VoltReserve <onboarding@resend.dev>";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Sends one email through Resend. Never throws: a network error or a
// missing API key comes back as { ok: false, errorText } so callers can
// record the failure (notifications panel) instead of crashing.
async function sendResendEmail({ from, to, replyTo, subject, html }) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { ok: false, errorText: "RESEND_API_KEY is not set in Netlify environment variables" };
    }
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
  } catch (err) {
    return { ok: false, errorText: (err && err.message) || "Network error reaching Resend" };
  }
}

// ---------------------------------------------------------------- orders

// `order` uses the same field names the cart posts to send-order.js.
function buildOrderEmails(order) {
  const {
    name, email, phone, country, address, paymentMethod, promoCode, notes, itemLines,
    subtotal, discountPercent, discountAmount, shippingType, total
  } = order;

  const itemsHtml = (itemLines || []).map(line => `<li style="margin-bottom:6px;">${escapeHtml(line)}</li>`).join("");

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
    if (shippingType === "flat" && order.shippingNote) return `<p style="font-size:13px; color:#888; margin:0 0 16px;">Shipping: ${escapeHtml(order.shippingNote)}</p>`;
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

  return {
    totalDisplay,
    ownerSubject: `New order, ${totalDisplay}`,
    ownerHtml,
    customerSubject: "Your VoltReserve order",
    customerHtml
  };
}

// Sends the owner and/or customer order email. `only` is "owner",
// "customer" or omitted for both. Returns { owner, customer } where each is
// a { ok, errorText } result or null when that email wasn't attempted.
async function sendOrderEmails(order, only) {
  const built = buildOrderEmails(order);
  const from = fromAddress();
  const wantOwner = only !== "customer";
  const wantCustomer = only !== "owner";
  const [owner, customer] = await Promise.all([
    wantOwner
      ? sendResendEmail({ from, to: [ownerEmail()], subject: built.ownerSubject, html: built.ownerHtml })
      : null,
    wantCustomer
      ? sendResendEmail({ from, to: [order.email], subject: built.customerSubject, html: built.customerHtml })
      : null
  ]);
  return { owner, customer, built };
}

// ------------------------------------------------------------- contact

function buildContactEmails({ name, email, message }) {
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

  return {
    ownerSubject: `Website contact message from ${name || email}`,
    ownerHtml,
    customerSubject: "We've got your message - VoltReserve",
    customerHtml
  };
}

async function sendContactEmails({ name, email, message }, only) {
  const built = buildContactEmails({ name, email, message });
  const from = fromAddress();
  const wantOwner = only !== "customer";
  const wantCustomer = only !== "owner";
  const [owner, customer] = await Promise.all([
    wantOwner
      ? sendResendEmail({ from, to: [ownerEmail()], replyTo: email, subject: built.ownerSubject, html: built.ownerHtml })
      : null,
    wantCustomer
      ? sendResendEmail({ from, to: [email], subject: built.customerSubject, html: built.customerHtml })
      : null
  ]);
  return { owner, customer, built };
}

// A reply written by the admin from the Messages tab. Sent to the
// customer with reply-to set to the owner mailbox so their answer lands in
// the normal inbox.
function buildReplyEmail({ name, body, originalMessage }) {
  return `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif; max-width:520px; margin:0 auto; padding:32px 24px; color:#1a1a1a;">
  <p style="font-size:12px; letter-spacing:1px; color:#16a34a; text-transform:uppercase; font-weight:600; margin:0 0 8px;">VoltReserve</p>
  <p style="font-size:15px; line-height:1.6; color:#222; white-space:pre-wrap; margin:0 0 20px;">${escapeHtml(body)}</p>
  <p style="font-size:12px; color:#999; border-top:1px solid #eee; padding-top:14px; margin:0 0 6px;">${name ? `In reply to your message, ${escapeHtml(name)}:` : "In reply to your message:"}</p>
  <p style="font-size:13px; color:#888; line-height:1.5; white-space:pre-wrap; margin:0;">${escapeHtml(originalMessage || "")}</p>
  <p style="font-size:12px; color:#bbb; margin-top:28px;">VoltReserve, independent EcoFlow reseller</p>
</div>`.trim();
}

// Status update sent to a customer when the admin changes an order's status
// (with the "email the customer" box ticked). Plain and short on purpose.
const STATUS_COPY = {
  confirmed: ["Your order is confirmed", "We've confirmed your order and will be in touch about payment and delivery."],
  paid: ["Payment received", "Thanks, we've received your payment and are preparing your order."],
  shipped: ["Your order has shipped", "Your order is on its way."],
  delivered: ["Your order was delivered", "Your order has been marked as delivered. If anything isn't right, just reply to this email."],
  cancelled: ["Your order was cancelled", "Your order has been cancelled. If you didn't expect this, just reply to this email."]
};

function buildStatusEmail({ name, status, trackingNumber, trackingUrl, itemLines, note }) {
  const copy = STATUS_COPY[status] || ["Order update", "There's an update on your order."];
  const tracking = trackingNumber
    ? `<p style="font-size:14px; color:#333; margin:0 0 16px;">Tracking number: <strong>${escapeHtml(trackingNumber)}</strong>${trackingUrl ? ` (<a href="${escapeHtml(trackingUrl)}" style="color:#16a34a;">track your package</a>)` : ""}</p>`
    : "";
  const items = (itemLines || []).length
    ? `<ul style="padding-left:18px; font-size:13px; color:#555; margin:0 0 16px;">${itemLines.map((l) => `<li style="margin-bottom:4px;">${escapeHtml(l)}</li>`).join("")}</ul>`
    : "";
  const extra = note ? `<p style="font-size:14px; color:#333; line-height:1.5; white-space:pre-wrap; margin:0 0 16px;">${escapeHtml(note)}</p>` : "";
  return {
    subject: `${copy[0]} - VoltReserve`,
    html: `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif; max-width:480px; margin:0 auto; padding:32px 24px; color:#1a1a1a;">
  <p style="font-size:12px; letter-spacing:1px; color:#16a34a; text-transform:uppercase; font-weight:600; margin:0 0 8px;">VoltReserve</p>
  <h1 style="font-size:22px; margin:0 0 16px;">${escapeHtml(copy[0])}</h1>
  <p style="font-size:15px; line-height:1.5; color:#444; margin:0 0 16px;">${name ? `Hi ${escapeHtml(name)}, ` : ""}${escapeHtml(copy[1])}</p>
  ${tracking}${extra}${items}
  <p style="font-size:12px; color:#bbb; margin-top:32px;">VoltReserve, independent EcoFlow reseller</p>
</div>`.trim()
  };
}

module.exports = {
  buildStatusEmail,
  ownerEmail, fromAddress, escapeHtml, sendResendEmail,
  buildOrderEmails, sendOrderEmails,
  buildContactEmails, sendContactEmails,
  buildReplyEmail
};
