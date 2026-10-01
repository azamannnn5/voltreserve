// A tiny in-memory stand-in for Supabase's REST API (PostgREST), just
// enough for the admin-panel functions: insert / select / update / delete /
// upsert, eq / neq filters, order, limit, single / maybeSingle, and
// head-only count queries. Also fakes the Resend email API so tests can
// make emails succeed or fail on demand.
//
// Usage:
//   const env = installFakeBackend({ failEmails: false });
//   env.tables.orders.push({...});
//   ... call a function handler ...
//   env.emailsSent / env.calls / env.tables

let idCounter = 0;
function uuid() { idCounter++; return `00000000-0000-4000-8000-${String(idCounter).padStart(12, "0")}`; }

function installFakeBackend(opts = {}) {
  const env = {
    tables: {},
    calls: [],
    emailsSent: [],
    failEmails: !!opts.failEmails,
    failOwnerOnly: !!opts.failOwnerOnly,
    missingTables: new Set(opts.missingTables || []),
    missingColumns: opts.missingColumns || {}   // table -> [columns that "don't exist"]
  };
  const table = (name) => (env.tables[name] = env.tables[name] || []);

  process.env.SUPABASE_URL = "https://fake-project.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = "fake-service-key";
  process.env.RESEND_API_KEY = "fake-resend-key";
  process.env.ADMIN_KEY = "test-admin-key";

  const reply = (data, status = 200, headers = {}) => ({
    ok: status < 300,
    status,
    statusText: status < 300 ? "OK" : "Error",
    headers: { get: (k) => headers[String(k).toLowerCase()] || null },
    json: async () => data,
    text: async () => (data === undefined || data === null ? "" : JSON.stringify(data))
  });

  function applyFilters(rows, params) {
    let out = rows.slice();
    for (const [key, raw] of params.entries()) {
      if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(key)) continue;
      const m = String(raw).match(/^(eq|neq|in|gte|lte|gt|lt|is)\.(.*)$/);
      if (!m) continue;
      const [, op, val] = m;
      out = out.filter((r) => {
        const cell = r[key];
        const str = cell === null || cell === undefined ? "null" : String(cell);
        if (op === "eq") return str === val;
        if (op === "neq") return str !== val;
        if (op === "is") return str === val;
        if (op === "in") return val.replace(/^\(|\)$/g, "").split(",").includes(str);
        if (op === "gte") return Number(cell) >= Number(val);
        if (op === "lte") return Number(cell) <= Number(val);
        if (op === "gt") return Number(cell) > Number(val);
        if (op === "lt") return Number(cell) < Number(val);
        return true;
      });
    }
    const order = params.get("order");
    if (order) {
      const [col, dir] = order.split(".");
      out.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === "desc" ? -1 : 1));
    }
    if (params.get("limit")) out = out.slice(0, Number(params.get("limit")));
    return out;
  }

  global.fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    const method = (init.method || "GET").toUpperCase();
    const body = init.body ? JSON.parse(init.body) : null;
    env.calls.push({ url: String(url), method, body });

    // ---- Resend ----
    if (u.hostname === "api.resend.com") {
      const to = body && body.to && body.to[0];
      const isOwner = to === (process.env.OWNER_EMAIL || "contact@voltreservepower.com");
      if (env.failEmails || (env.failOwnerOnly && isOwner)) {
        return reply({ message: "Simulated Resend failure" }, 422);
      }
      env.emailsSent.push(body);
      return reply({ id: "email-" + env.emailsSent.length });
    }

    // ---- Supabase REST ----
    const m = u.pathname.match(/^\/rest\/v1\/([^/]+)$/);
    if (u.hostname.endsWith("supabase.co") && m) {
      const name = m[1];
      if (env.missingTables.has(name)) {
        return reply({ code: "42P01", message: `relation "public.${name}" does not exist` }, 404);
      }
      const accept = (init.headers && (init.headers.Accept || init.headers.accept)) || (init.headers && init.headers.get && init.headers.get("Accept")) || "";
      const wantsObject = String(accept).includes("vnd.pgrst.object");
      const prefer = (init.headers && (init.headers.Prefer || init.headers.prefer)) || (init.headers && init.headers.get && init.headers.get("Prefer")) || "";
      const rows = table(name);
      const badCols = env.missingColumns[name] || [];

      const checkCols = (payload) => {
        const items = Array.isArray(payload) ? payload : [payload];
        for (const it of items) for (const c of badCols) {
          if (it && Object.prototype.hasOwnProperty.call(it, c)) {
            return reply({ code: "PGRST204", message: `Could not find the '${c}' column of '${name}' in the schema cache` }, 400);
          }
        }
        return null;
      };

      if (method === "GET" || method === "HEAD") {
        const found = applyFilters(rows, u.searchParams);
        const headers = { "content-range": `0-${Math.max(0, found.length - 1)}/${found.length}` };
        if (method === "HEAD") return reply(undefined, 200, headers);
        if (wantsObject) {
          if (found.length !== 1) return reply({ code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }, 406);
          return reply(found[0], 200, headers);
        }
        return reply(found, 200, headers);
      }

      if (method === "POST") {
        const bad = checkCols(body);
        if (bad) return bad;
        const items = (Array.isArray(body) ? body : [body]).map((x) => ({ ...x }));
        const merge = String(prefer).includes("resolution=merge-duplicates");
        const saved = items.map((it) => {
          const conflictCol = u.searchParams.get("on_conflict") || "id";
          if (merge && it[conflictCol] !== undefined) {
            const idx = rows.findIndex((r) => r[conflictCol] === it[conflictCol]);
            if (idx >= 0) { rows[idx] = { ...rows[idx], ...it }; return rows[idx]; }
          }
          const row = { id: it.id || uuid(), created_at: new Date().toISOString(), ...it };
          if (name === "notifications" && row.read === undefined) row.read = false;
          rows.push(row);
          return row;
        });
        const wantBack = String(prefer).includes("return=representation");
        const out = wantBack ? saved : undefined;
        if (wantBack && wantsObject) return reply(saved[0], 201);
        return reply(out, wantBack ? 201 : 201);
      }

      if (method === "PATCH") {
        const bad = checkCols(body);
        if (bad) return bad;
        const found = applyFilters(rows, u.searchParams);
        found.forEach((r) => Object.assign(r, body));
        const wantBack = String(prefer).includes("return=representation");
        if (wantBack && wantsObject) return found.length === 1 ? reply(found[0]) : reply({ code: "PGRST116", message: "no row" }, 406);
        return reply(wantBack ? found : undefined, wantBack ? 200 : 204);
      }

      if (method === "DELETE") {
        const found = new Set(applyFilters(rows, u.searchParams));
        env.tables[name] = rows.filter((r) => !found.has(r));
        return reply(undefined, 204);
      }
    }

    return reply({}, 200);
  };

  env.reset = () => { env.calls.length = 0; env.emailsSent.length = 0; };
  env.cleanup = () => {
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_KEY;
    delete process.env.RESEND_API_KEY; delete process.env.ADMIN_KEY; delete process.env.OWNER_EMAIL;
  };
  return env;
}

// Fresh-require a Netlify function so module-level state picks up the fake env.
function loadFunction(file) {
  const path = require("path");
  const p = path.join(__dirname, "..", "netlify", "functions", file);
  Object.keys(require.cache).forEach((k) => {
    if (k.includes(path.join("netlify", "functions"))) delete require.cache[k];
  });
  return require(p);
}

const ADMIN = { "x-admin-key": "test-admin-key" };

module.exports = { installFakeBackend, loadFunction, ADMIN };
