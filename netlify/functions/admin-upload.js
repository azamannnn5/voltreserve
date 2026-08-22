// POST /.netlify/functions/admin-upload
// Handles file uploads from the admin panel (product/accessory/solar
// panel photos) - uploads to the "product-files" Supabase Storage bucket
// (see supabase-schema.sql) and returns the public URL, which the admin
// panel saves onto the product/accessory/solar row like any other field.
//
// This is what makes "add a whole new product/accessory/panel, photo and
// all, with no redeploy" actually work - before this, the image fields
// were just textareas where you typed paths to files that had to already
// exist in the deployed site's images folder.
//
// Admin requests must include header: x-admin-key: <ADMIN_KEY env var>
// Body: { filename, folder, contentBase64, contentType }
// Response: { url }

const { createClient } = require("@supabase/supabase-js");

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const BUCKET = "product-files";
const ALLOWED_FOLDERS = new Set(["products", "accessories", "solar", "kits"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB - generous for a product photo, well under the free-tier 1GB total
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function safeFilename(name) {
  return String(name || "file")
    .toLowerCase()
    .replace(/[^a-z0-9.\-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-120);
}

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (!supabase) {
    return { statusCode: 503, headers: cors, body: JSON.stringify({ error: "Supabase not configured yet, see SETUP.md" }) };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: "Method Not Allowed" };
  }

  const providedKey = event.headers["x-admin-key"] || event.headers["X-Admin-Key"];
  if (!process.env.ADMIN_KEY || providedKey !== process.env.ADMIN_KEY) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    const { filename, folder, contentBase64, contentType } = JSON.parse(event.body || "{}");

    if (!ALLOWED_FOLDERS.has(folder)) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: `folder must be one of: ${[...ALLOWED_FOLDERS].join(", ")}` }) };
    }
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Only JPEG/PNG/WEBP/GIF images are allowed" }) };
    }
    if (!contentBase64) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "No file content provided" }) };
    }

    const buffer = Buffer.from(contentBase64, "base64");
    if (buffer.length > MAX_BYTES) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: `File too large - max ${MAX_BYTES / 1024 / 1024}MB` }) };
    }

    // Timestamp-prefixed key so re-uploading a same-named file never
    // silently overwrites the old one before the admin confirms the new
    // one looks right, and so the public URL always changes with the file
    // (avoids stale CDN/browser caching showing the old version).
    const key = `${folder}/${Date.now()}-${safeFilename(filename)}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, buffer, { contentType, upsert: false });
    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(key);

    return { statusCode: 200, headers: cors, body: JSON.stringify({ url: publicUrlData.publicUrl, path: key }) };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
