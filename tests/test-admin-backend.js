// Guards the admin-panel backend added for Notifications / Orders /
// Messages / Change log / stock:
//   - a failed email must NOT lose an order or message: it is saved, shown
//     as a notification, and the customer still sees success
//   - Resend from the Notifications tab re-sends only what failed
//   - every admin endpoint rejects a missing/wrong admin key
//   - orders: status + tracking + customer email + stock reduction
//   - messages: reply email + status
//   - catalog saves keep working before the SQL upgrade is run (missing
//     columns are dropped and retried) and are written to the change log
const { installFakeBackend, loadFunction, ADMIN } = require("./fake-supabase");

const orderPayload = {
  name: "Test User", email: "buyer@example.com", phone: "+1 5551234567",
  country: "United States", address: "123 Test St", paymentMethod: "Zelle",
  promoCode: "", notes: "", itemLines: ["RIVER 2 x 2 ($338)"],
  items: [{ id: "river-2", qty: 2 }],
  subtotal: 338, discountPercent: 0, discountAmount: 0,
  shippingType: "confirm", shippingCost: 0, total: 338
};

async function run() {
  const failures = [];
  const check = (cond, msg) => { if (!cond) failures.push(msg); };

  /* ---------- 1. order, both emails fail ---------- */
  {
    const env = installFakeBackend({ failEmails: true });
    const { handler } = loadFunction("send-order.js");
    const res = await handler({ httpMethod: "POST", body: JSON.stringify(orderPayload) });
    check(res.statusCode === 200, `failed-email order: customer should still see success (200), got ${res.statusCode}`);
    check(JSON.parse(res.body).emailsFailed === true, "failed-email order: response should flag emailsFailed");
    check((env.tables.orders || []).length === 1, "failed-email order: order row should still be saved");
    check(env.tables.orders[0].emails_sent === false, "failed-email order: orders.emails_sent should be false");
    const n = (env.tables.notifications || [])[0];
    check(!!n, "failed-email order: a notification row should be created");
    if (n) {
      check(n.status === "failed" && n.type === "order", `failed-email order: notification should be failed/order, got ${n.status}/${n.type}`);
      check(n.payload && n.payload.email === "buyer@example.com", "failed-email order: notification payload should hold the full order so it can be re-sent");
      check(n.read === false, "failed-email order: failed notification should start unread");
      check(n.owner_sent === false && n.customer_sent === false, "failed-email order: both sent flags should be false");
    }

    /* ---------- 2. admin API: auth + list + resend ---------- */
    const api = loadFunction("notifications.js");
    const noAuth = await api.handler({ httpMethod: "GET", headers: {} });
    check(noAuth.statusCode === 401, `notifications: no key should be 401, got ${noAuth.statusCode}`);
    const wrong = await api.handler({ httpMethod: "GET", headers: { "x-admin-key": "nope" } });
    check(wrong.statusCode === 401, `notifications: wrong key should be 401, got ${wrong.statusCode}`);

    const list = await api.handler({ httpMethod: "GET", headers: ADMIN, queryStringParameters: {} });
    const listBody = JSON.parse(list.body);
    check(list.statusCode === 200 && listBody.items.length === 1, `notifications: list should return 1 item, got ${list.statusCode} ${list.body.slice(0, 120)}`);
    check(listBody.counts && listBody.counts.unread === 1, `notifications: unread count should be 1, got ${JSON.stringify(listBody.counts)}`);

    // Resend while Resend is still down: stays failed, count goes up
    const again = await api.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ action: "resend", id: n.id }) });
    check(JSON.parse(again.body).ok === false, "resend while emails still fail should report ok:false");
    check(env.tables.notifications[0].resent_count === 1, "resend should count the attempt");

    // Email service recovers
    env.failEmails = false;
    env.reset();
    const fixed = await api.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ action: "resend", id: n.id }) });
    check(JSON.parse(fixed.body).ok === true, `resend after recovery should succeed, got ${fixed.body.slice(0, 200)}`);
    check(env.emailsSent.length === 2, `resend of a fully failed order should send both emails, sent ${env.emailsSent.length}`);
    check(env.tables.notifications[0].status === "sent" && env.tables.notifications[0].read === true, "resend success should mark the notification sent + read");
    check(env.tables.orders[0].emails_sent === true, "resend success should flip orders.emails_sent to true");

    // mark unread / readall
    await api.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ action: "unread", id: n.id }) });
    check(env.tables.notifications[0].read === false, "mark unread should work");
    await api.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ action: "readall" }) });
    check(env.tables.notifications[0].read === true, "readall should mark everything read");
    env.cleanup();
  }

  /* ---------- 3. contact, only OWNER email fails -> partial, resend owner only ---------- */
  {
    const env = installFakeBackend({ failOwnerOnly: true });
    const { handler } = loadFunction("send-contact.js");
    const res = await handler({ httpMethod: "POST", body: JSON.stringify({ name: "Sam", email: "sam@example.com", message: "Do you ship to Ghana?" }) });
    check(res.statusCode === 200, `partial contact: should still be 200, got ${res.statusCode}`);
    const n = env.tables.notifications[0];
    check(n && n.status === "partial" && n.owner_sent === false && n.customer_sent === true, `partial contact: expected partial/owner failed, got ${JSON.stringify(n && { s: n.status, o: n.owner_sent, c: n.customer_sent })}`);
    env.failOwnerOnly = false;
    env.reset();
    const api = loadFunction("notifications.js");
    const out = await api.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ action: "resend", id: n.id }) });
    check(JSON.parse(out.body).ok === true, "partial contact: resend should succeed");
    check(env.emailsSent.length === 1 && env.emailsSent[0].to[0] === "contact@voltreservepower.com", `partial contact: should re-send ONLY the owner email, sent ${JSON.stringify(env.emailsSent.map((e) => e.to))}`);
    env.cleanup();
  }

  /* ---------- 4. everything works, no failures ---------- */
  {
    const env = installFakeBackend();
    const { handler } = loadFunction("send-order.js");
    const res = await handler({ httpMethod: "POST", body: JSON.stringify(orderPayload) });
    check(res.statusCode === 200 && !JSON.parse(res.body).emailsFailed, "happy path order should return plain 200");
    check(env.tables.notifications[0].status === "sent" && env.tables.notifications[0].read === true, "happy path: notification should be sent + already read");
    check(env.tables.orders[0].items && env.tables.orders[0].items[0].id === "river-2", "order should store the structured items array");
    env.cleanup();
  }

  /* ---------- 5. notifications table missing: order flow must not break ---------- */
  {
    const env = installFakeBackend({ missingTables: ["notifications"] });
    const { handler } = loadFunction("send-order.js");
    const res = await handler({ httpMethod: "POST", body: JSON.stringify(orderPayload) });
    check(res.statusCode === 200, `missing notifications table: order should still succeed, got ${res.statusCode}`);
    const api = loadFunction("notifications.js");
    const list = await api.handler({ httpMethod: "GET", headers: ADMIN, queryStringParameters: {} });
    check(list.statusCode === 500 && /supabase-admin-upgrade/.test(list.body), "missing notifications table: admin should be told to run supabase-admin-upgrade.sql");
    env.cleanup();
  }

  /* ---------- 6. orders column `items` missing (SQL not run): order still saved ---------- */
  {
    const env = installFakeBackend({ missingColumns: { orders: ["items"] } });
    const { handler } = loadFunction("send-order.js");
    const res = await handler({ httpMethod: "POST", body: JSON.stringify(orderPayload) });
    check(res.statusCode === 200 && env.tables.orders.length === 1, "orders without the items column: order should still be saved");
    env.cleanup();
  }

  /* ---------- 7. orders endpoint: status, tracking, email, stock ---------- */
  {
    const env = installFakeBackend();
    env.tables.products = [{ id: "river-2", name: "RIVER 2", price: 169, stock_qty: 5, in_stock: true }];
    env.tables.accessories = [{ id: "bag", name: "Bag", price: 20, stock_qty: null }];
    env.tables.orders = [{ id: "ord-1", name: "Test User", email: "buyer@example.com", item_lines: ["RIVER 2 x 2 ($338)"], items: [{ id: "river-2", qty: 2 }, { id: "accessory:bag", qty: 1 }], total: 338, status: "new", stock_applied: false, emails_sent: true, created_at: new Date().toISOString() }];
    const api = loadFunction("orders.js");

    check((await api.handler({ httpMethod: "GET", headers: {} })).statusCode === 401, "orders: no key should be 401");
    const list = JSON.parse((await api.handler({ httpMethod: "GET", headers: ADMIN, queryStringParameters: {} })).body);
    check(list.length === 1 && list[0].status === "new", "orders: list should return the order with status new");

    const bad = await api.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ id: "ord-1", status: "banana" }) });
    check(bad.statusCode === 400, "orders: unknown status should be 400");

    env.reset();
    const res = await api.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ id: "ord-1", status: "shipped", trackingNumber: "1Z999", trackingUrl: "https://track.example.com/1Z999", emailCustomer: true }) });
    const body = JSON.parse(res.body);
    check(res.statusCode === 200 && body.order.status === "shipped" && body.order.trackingNumber === "1Z999", `orders: update should save status + tracking, got ${res.body.slice(0, 200)}`);
    check(env.emailsSent.length === 1 && env.emailsSent[0].to[0] === "buyer@example.com" && /1Z999/.test(env.emailsSent[0].html), "orders: emailCustomer should send a status email containing the tracking number");
    check(env.tables.products[0].stock_qty === 3, `orders: confirming should reduce river-2 stock 5 -> 3, got ${env.tables.products[0].stock_qty}`);
    check(env.tables.accessories[0].stock_qty === null, "orders: untracked item (null stock) must stay untracked");
    check(env.tables.orders[0].stock_applied === true, "orders: stock_applied should be set so it is never reduced twice");

    await api.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ id: "ord-1", status: "delivered" }) });
    check(env.tables.products[0].stock_qty === 3, "orders: moving to another active status must not reduce stock again");
    check((env.tables.admin_log || []).some((l) => l.entity === "orders"), "orders: changes should be written to the change log");
    env.cleanup();
  }

  /* ---------- 8. messages endpoint ---------- */
  {
    const env = installFakeBackend();
    env.tables.contact_messages = [{ id: "msg-1", name: "Sam", email: "sam@example.com", message: "Hello?", emails_sent: true, status: "new", created_at: new Date().toISOString() }];
    const api = loadFunction("messages.js");
    check((await api.handler({ httpMethod: "GET", headers: {} })).statusCode === 401, "messages: no key should be 401");
    const empty = await api.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ action: "reply", id: "msg-1", body: "   " }) });
    check(empty.statusCode === 400, "messages: empty reply should be rejected");
    env.reset();
    const res = await api.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ action: "reply", id: "msg-1", body: "Yes, we ship to Ghana." }) });
    check(res.statusCode === 200 && JSON.parse(res.body).message.status === "replied", `messages: reply should mark replied, got ${res.body.slice(0, 160)}`);
    check(env.emailsSent.length === 1 && env.emailsSent[0].to[0] === "sam@example.com" && /Ghana/.test(env.emailsSent[0].html), "messages: reply should email the customer");
    env.failEmails = true;
    const fail = await api.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ action: "reply", id: "msg-1", body: "Again" }) });
    check(fail.statusCode === 502, "messages: a reply that fails to send should return 502, not claim success");
    await api.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ id: "msg-1", status: "closed", adminNotes: "done" }) });
    check(env.tables.contact_messages[0].status === "closed" && env.tables.contact_messages[0].admin_notes === "done", "messages: status + notes should save");
    env.cleanup();
  }

  /* ---------- 9. catalog save: change log, quiet mode, missing-column fallback ---------- */
  {
    const env = installFakeBackend({ missingColumns: { products: ["stock_qty", "featured"] } });
    const api = loadFunction("products.js");
    const payload = { id: "river-2", name: "RIVER 2", series: "RIVER", price: 169, stockQty: 4, featured: true };
    const res = await api.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify(payload) });
    check(res.statusCode === 200, `catalog save before SQL upgrade should still work (columns dropped), got ${res.statusCode} ${res.body.slice(0, 160)}`);
    check((env.tables.products || []).length === 1 && env.tables.products[0].stock_qty === undefined, "catalog save before SQL upgrade: the missing columns should be left out of the write");
    check((env.tables.admin_log || []).length === 1 && /Added/.test(env.tables.admin_log[0].summary), "catalog save: should write an 'Added' change-log line");

    await api.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ ...payload, price: 179 }) });
    const last = env.tables.admin_log[env.tables.admin_log.length - 1];
    check(/Edited/.test(last.summary) && last.before && last.before.price === 169, "catalog save: edit should log the BEFORE copy (price 169) for restore");

    const logCount = env.tables.admin_log.length;
    await api.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ ...payload, price: 189, _quiet: true }) });
    check(env.tables.admin_log.length === logCount, "catalog save with _quiet should not add a change-log line");

    await api.handler({ httpMethod: "DELETE", headers: ADMIN, body: JSON.stringify({ id: "river-2" }) });
    const del = env.tables.admin_log[env.tables.admin_log.length - 1];
    check(del.action === "delete" && del.before && del.before.id === "river-2", "catalog delete: should log the deleted item so it can be restored");

    const logApi = loadFunction("admin-log.js");
    check((await logApi.handler({ httpMethod: "GET", headers: {} })).statusCode === 401, "admin-log: no key should be 401");
    const got = JSON.parse((await logApi.handler({ httpMethod: "GET", headers: ADMIN, queryStringParameters: {} })).body);
    check(got.length >= 3, `admin-log: should list the entries, got ${got.length}`);
    const add = await logApi.handler({ httpMethod: "POST", headers: ADMIN, body: JSON.stringify({ entity: "products", summary: "Bulk price change +10% on 3 products" }) });
    check(add.statusCode === 200, "admin-log: POST summary line should work");
    env.cleanup();
  }

  return failures;
}

module.exports = { name: "admin-backend (notifications, orders, messages, log, stock)", run };
