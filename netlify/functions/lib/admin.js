// Shared helpers for the admin-only Netlify Functions (notifications,
// orders, messages, change log, blog). Kept in one place so every admin
// endpoint authenticates, answers CORS, and records changes the same way.
//
// Env vars (same as the rest of the backend):
//   SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_KEY

const { createClient } = require("@supabase/supabase-js");

let cachedClient = null;
let cachedKey = "";

// Created lazily (and re-created if the env vars change) so tests that set
// process.env right before require() still get a working client.
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  if (!cachedClient || cachedKey !== url + key) {
    cachedClient = createClient(url, key);
    cachedKey = url + key;
  }
  return cachedClient;
}

function corsHeaders(methods) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
    "Access-Control-Allow-Methods": methods || "GET, POST, DELETE, OPTIONS"
  };
}

function isAdmin(event) {
  const provided = (event.headers && (event.headers["x-admin-key"] || event.headers["X-Admin-Key"])) || "";
  return !!process.env.ADMIN_KEY && provided === process.env.ADMIN_KEY;
}

function json(statusCode, body, cors, extra) {
  return {
    statusCode,
    headers: { ...(cors || {}), "Content-Type": "application/json", ...(extra || {}) },
    body: JSON.stringify(body)
  };
}

function parseBody(event) {
  try {
    return { ok: true, value: JSON.parse(event.body || "{}") };
  } catch {
    return { ok: false, value: null };
  }
}

// Records one admin change in the `admin_log` table so there is a history
// (and, when `before` is supplied, a copy of what was there so the admin
// panel can offer "restore this version"). NEVER throws - a logging
// problem must not block or fail the real save/delete it describes, and
// the table simply may not exist yet if the SQL upgrade hasn't been run.
async function logChange(supabase, entry) {
  if (!supabase) return;
  try {
    await supabase.from("admin_log").insert({
      action: entry.action,                 // "save" | "delete" | "restore" | "update" | ...
      entity: entry.entity,                 // "products", "orders", "settings", ...
      entity_id: entry.entityId ?? null,
      summary: entry.summary || null,
      before: entry.before === undefined ? null : entry.before,
      after: entry.after === undefined ? null : entry.after
    });
  } catch (err) {
    console.warn("admin_log write skipped:", err && err.message);
  }
}

// Fetches the current copy of one row (in the same shape the API returns)
// so it can be stored as the "before" in the change log. Returns null if
// the row doesn't exist yet or anything goes wrong.
async function fetchBefore(supabase, table, id, mapRow) {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
    return data ? (mapRow ? mapRow(data) : data) : null;
  } catch {
    return null;
  }
}

module.exports = { getSupabase, corsHeaders, isAdmin, json, parseBody, logChange, fetchBefore };

// Upserts a row, but if the database complains that one of the OPTIONAL
// columns doesn't exist yet (the admin-upgrade SQL hasn't been run), drops
// just that column and tries again (PostgREST reports one missing column at
// a time), so saving a product/accessory never breaks because a newer
// column is missing. Returns { data, error, droppedColumns }.
async function upsertWithFallback(supabase, table, row, optionalColumns) {
  const optional = optionalColumns || [];
  const dropped = [];
  let current = { ...row };
  let result = await supabase.from(table).upsert(current, { onConflict: "id" }).select();
  for (let attempt = 0; result.error && attempt <= optional.length; attempt++) {
    const msg = String((result.error && (result.error.message || result.error.details)) || "");
    const named = optional.find((c) => !dropped.includes(c) && msg.includes(c) && Object.prototype.hasOwnProperty.call(current, c));
    if (!named) break;
    dropped.push(named);
    delete current[named];
    result = await supabase.from(table).upsert(current, { onConflict: "id" }).select();
  }
  return { ...result, droppedColumns: dropped };
}

module.exports.upsertWithFallback = upsertWithFallback;
