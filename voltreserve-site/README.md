# VoltReserve — EcoFlow Power Station Site

A simple, static website (no build tools required) for browsing EcoFlow RIVER/DELTA
power stations and submitting order requests via WhatsApp.

## Before you launch — edit these two lines

Open `js/main.js` and update the top:

```js
const WHATSAPP_NUMBER = "15550000000"; // digits only, country code first, no + or spaces
const SALES_EMAIL = "orders@yourdomain.com";
```

Also do a find-and-replace across all `.html` files for:
- `VoltReserve` → your client's real business name
- Footer copyright line and "Independent reseller" disclaimer text if it needs adjusting
- Bracketed placeholder text in `shipping.html`, `privacy.html`, and `terms.html`
  (shipping timelines, return window, dates — these are templates, not legal advice)

## Editing in VS Code

This is plain HTML/CSS/JS — no npm install, no build step. Open the folder in VS Code,
and use the "Live Server" extension (or any static server) to preview it locally.

To add/edit/remove a product, edit `js/products-data.js` — every page pulls from
this one file, so you only need to update it in one place.

## Hosting (free options)

1. **Netlify**: drag-and-drop this whole folder onto app.netlify.com/drop — live in seconds.
2. **Vercel**: `vercel deploy` from this folder (after `npm i -g vercel`), or connect
   a GitHub repo in their dashboard.
3. **GitHub Pages**: push this folder to a GitHub repo, enable Pages in repo settings.

All three have generous free tiers that comfortably cover a site like this.

## Domain

Buy a domain (Namecheap, Google Domains, etc. — usually ~$10–15/year) and point its
DNS to whichever host you choose above. Each host has a simple "connect custom domain"
flow in their dashboard.

## How ordering works (no payment processing built in yet)

Customer browses → adds items → submits contact form → this opens a pre-filled
WhatsApp message to your number with their order details → cart clears → customer
sees a confirmation page. Payment is arranged manually by whoever replies on WhatsApp.

## Adding real payments later

When your client is ready, the natural next step is Stripe Payment Links — create one
link per product in the Stripe dashboard (no code needed), then swap the "Add to Order"
buttons for direct Stripe links, or add them to the WhatsApp handoff message.

## File structure

```
index.html            Home page
products.html         Full catalog with filtering
product.html          Individual product detail (?id=product-slug)
cart.html             Order review + contact form
order-confirmed.html  Confirmation screen
about.html
contact.html
privacy.html
terms.html
shipping.html
css/style.css         All styling
js/products-data.js   Product catalog (edit here to add/remove products)
js/main.js            Cart logic, WhatsApp order submission — WHATSAPP_NUMBER lives here
```
