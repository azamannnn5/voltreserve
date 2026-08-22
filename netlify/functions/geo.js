// GET /.netlify/functions/geo
// Returns the visitor's approximate country using Netlify's built-in
// geolocation (context.geo), populated automatically by Netlify's edge
// network on every function invocation, no third-party signup or API key
// needed. Used to auto-select the country field on the cart page's order
// form for visitors from a country we recognize, saving them a click.
//
// On localhost/dev, Netlify has no real edge request to read geo from,
// so context.geo may be empty or a default sample value, the frontend
// already falls back gracefully (leaves the country field blank for the
// visitor to pick) if this returns null.

exports.handler = async (event, context) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "private, max-age=300"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  const geo = context.geo || {};
  const countryName = geo.country && geo.country.name ? geo.country.name : null;
  const countryCode = geo.country && geo.country.code ? geo.country.code : null;

  return {
    statusCode: 200,
    headers: { ...cors, "Content-Type": "application/json" },
    body: JSON.stringify({ countryName, countryCode })
  };
};
