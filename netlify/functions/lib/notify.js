// Writes one row to the `notifications` table for every order / contact
// submission, recording whether the owner email and the customer email
// actually went out. The full submission is stored in `payload`, so even
// if the order/message row itself failed to save, the admin panel can still
// show it and re-send the emails from the Notifications tab.
//
// Never throws - the notifications table might not exist yet (SQL not run),
// and that must never break the customer-facing order/contact flow.

function summarize(results) {
  const owner = results.owner;
  const customer = results.customer;
  const ownerOk = owner ? owner.ok : true;
  const customerOk = customer ? customer.ok : true;
  let status = "sent";
  if (!ownerOk && !customerOk) status = "failed";
  else if (!ownerOk || !customerOk) status = "partial";
  const errors = [];
  if (owner && !owner.ok) errors.push("Owner email: " + String(owner.errorText || "unknown error").slice(0, 400));
  if (customer && !customer.ok) errors.push("Customer email: " + String(customer.errorText || "unknown error").slice(0, 400));
  return { status, ownerOk, customerOk, error: errors.join("\n") || null };
}

async function recordNotification(supabase, { type, refId, title, summary, payload, results }) {
  if (!supabase) return { saved: false, id: null };
  try {
    const s = summarize(results);
    const { data, error } = await supabase.from("notifications").insert({
      type,                       // "order" | "contact"
      ref_id: refId || null,
      title,
      summary: summary || null,
      status: s.status,           // "sent" | "partial" | "failed"
      owner_sent: s.ownerOk,
      customer_sent: s.customerOk,
      error: s.error,
      payload: payload || {},
      read: s.status === "sent"   // fully successful ones don't need attention
    }).select("id").single();
    if (error) {
      console.warn("Notification logging failed:", error.message || error);
      return { saved: false, id: null };
    }
    return { saved: true, id: data && data.id };
  } catch (err) {
    console.warn("Notification logging skipped:", err && err.message);
    return { saved: false, id: null };
  }
}

module.exports = { recordNotification, summarize };
