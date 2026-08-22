# VoltReserve Backend Setup , Database + Promo Email

Everything is built and wired into the site. You just need to create two free
accounts (Supabase, Resend) and set some environment variables in Netlify.
Nothing here requires touching code again after setup.

## 1. Supabase (the database)

1. Go to supabase.com → sign up → **New Project**. Pick any name/region, set
   a database password (save it somewhere, you likely won't need it again).
2. Once the project is ready, go to **SQL Editor → New query**, paste in the
   entire contents of `supabase-schema.sql` from this folder, and click Run.
   This creates the `products` table.
3. Go to **Project Settings → API**. You need two values from this page:
   - **Project URL** → this is `SUPABASE_URL`
   - **service_role key** (NOT the anon/public key , the secret one) → this
     is `SUPABASE_SERVICE_KEY`

## 2. Resend (the promo email sender)

1. Go to resend.com → sign up.
2. Go to **API Keys → Create API Key**. Copy it → this is `RESEND_API_KEY`.
3. (Optional, for a professional "from" address): go to **Domains → Add
   Domain**, enter voltreservepower.com, and add the DNS records it gives you
   wherever you manage the domain's DNS. This can take a few hours to verify.
   Until it's verified, leave `PROMO_FROM_EMAIL` unset and emails will send
   from a generic Resend address instead , everything still works, it just
   won't say @voltreservepower.com.

## 3. Set environment variables in Netlify

Netlify dashboard → your site → **Site configuration → Environment
variables** → add each of these:

| Key | Value |
|---|---|
| `SUPABASE_URL` | from Supabase step 3 |
| `SUPABASE_SERVICE_KEY` | from Supabase step 3 |
| `ADMIN_KEY` | make up a strong password , this locks admin.html |
| `RESEND_API_KEY` | from Resend step 2 |
| `PROMO_FROM_EMAIL` | optional, e.g. `VoltReserve <promo@voltreservepower.com>` , only after domain is verified. Also used as the sender for order emails. |
| `OWNER_EMAIL` | optional, defaults to contact@voltreservepower.com. Where new-order emails are sent. |

## 4. Deploy

Push this folder to GitHub as usual (see the deploy steps in the project
notes). Netlify will pick up `netlify.toml` automatically and install
`@supabase/supabase-js` for the functions.

## 5. Load your existing products into the database

1. Visit `https://voltreservepower.com/admin.html`
2. Enter the `ADMIN_KEY` you set above
3. Click **"Load starting catalog"** , this loads your current 21 products
   into the database in one click. Safe to click again later if needed;
   it won't duplicate anything.
4. Scroll down to **"Promo Settings"** , this controls the site-wide promo
   code, discount percentages, and thresholds shown in the announcement
   bar, product pages, and cart. Edit and click "Save Promo Settings",
   changes go live for every visitor immediately, no redeploy needed.
   Runs against the same `supabase-schema.sql` you already ran (it
   includes a `site_settings` table), so no extra setup is needed if
   you've already run that file.

From this point on, edit products at `/admin.html` , changes appear on the
live site within a minute, no GitHub or redeploy required.

## What still uses the old system

- `js/products-data.js` is now only a fallback if the database is ever down.
  You don't need to edit it anymore , `admin.html` is the new source of truth.
- Bundles/kits, accessories, and solar panels are unchanged and still live in
  `js/products-data.js` , only the core power station products moved to the
  database, since that's what actually needed frequent price updates.

## Cart shipping estimate (no setup needed)

The cart page shows a shipping cost estimate before the visitor fills in
their delivery address, using Netlify's built-in visitor geolocation
(`netlify/functions/geo.js`) to guess their country. This works
automatically once deployed to Netlify, no signup, API key, or env var
required, and it never blocks or breaks anything if it's ever unavailable
(falls back to assuming a US delivery). It only affects the estimate
shown before checkout, the real shipping cost is always recalculated once
they actually select their country and address.

## Troubleshooting

- **Products not showing on the site**: open browser dev tools → Network tab,
  check the `/.netlify/functions/products` request. If it's failing, check
  the Netlify function logs (Netlify dashboard → Functions) for the error ,
  most likely a missing/wrong environment variable.
- **Admin key rejected**: double check `ADMIN_KEY` in Netlify matches exactly
  what you're typing (no extra spaces).
- **Promo emails not arriving**: check spam folder first, then check the
  Resend dashboard's Logs page for delivery status/errors.
- **Order emails not arriving**: same as above, check Resend's Logs page.
  Order emails go to both the customer and to `OWNER_EMAIL` (or
  contact@voltreservepower.com by default) via `send-order.js`.
