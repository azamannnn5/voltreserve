// Stock bookkeeping. Products, accessories and solar panels can have an
// optional `stock_qty` (a number). When it's null the item is not
// quantity-tracked and only the plain In Stock checkbox applies.
//
// applyStockForOrder() is called once per order (the first time it is
// confirmed) and subtracts the ordered quantities from any tracked item.
// Quantities never go below 0. Kits are skipped on purpose: they are
// assembled from the base station + accessories, which the admin tracks
// directly.

const TABLE_BY_PREFIX = [
  ["accessory:", "accessories"],
  ["solar:", "solar_panels"]
];

function resolve(rawId) {
  for (const [prefix, table] of TABLE_BY_PREFIX) {
    if (rawId.startsWith(prefix)) return { table, id: rawId.slice(prefix.length) };
  }
  if (rawId.startsWith("bundle:")) return null; // kits aren't stock-tracked
  return { table: "products", id: rawId };
}

async function applyStockForOrder(supabase, order) {
  const items = Array.isArray(order.items) ? order.items : [];
  if (!items.length) return { touched: [] };
  const touched = [];
  try {
    for (const item of items) {
      const qty = Math.max(0, parseInt(item.qty, 10) || 0);
      if (!item.id || !qty) continue;
      const target = resolve(String(item.id));
      if (!target) continue;
      const { data: row, error } = await supabase.from(target.table).select("id, stock_qty").eq("id", target.id).maybeSingle();
      if (error) return { touched, error: error.message };
      if (!row || row.stock_qty === null || row.stock_qty === undefined) continue;
      const next = Math.max(0, Number(row.stock_qty) - qty);
      const upd = { stock_qty: next };
      if (next === 0 && target.table === "products") upd.in_stock = false;
      const { error: updErr } = await supabase.from(target.table).update(upd).eq("id", target.id);
      if (updErr) return { touched, error: updErr.message };
      touched.push({ id: target.id, from: row.stock_qty, to: next });
    }
  } catch (err) {
    return { touched, error: err && err.message };
  }
  return { touched };
}

module.exports = { applyStockForOrder, resolve };
