// Product catalog, EcoFlow RIVER + DELTA lineup
// Prices are set ~5% under EcoFlow's typical current sale price (not inflated "regular" price),
// based on live data pulled directly from us.ecoflow.com.
//
// NOTE: this array is now only a FALLBACK. The live source of truth is the
// Supabase database, loaded at runtime by js/products-loader.js. Editing
// this file no longer changes what visitors see, use admin.html instead.
// This file just keeps the site working if the database is ever unreachable.
// Single source of truth for the current site-wide promo. Change these two
// values and every banner, product-page line, and cart message updates.
const PROMO_CONFIG = {
  code: "SUMMER10",
  discountPercent: 10,
  endDateLabel: "September 7, 2026",
  endDateShort: "Sept. 7",
  freeShippingThreshold: 500,
  volumeQty: 2,
  volumeDiscountPercent: 7,
  spendThreshold: 1000,
  spendDiscountPercent: 10,
  contactEmail: "contact@voltreservepower.com",
  contactPhone: "",
  contactAddress: "",
  paymentMethods: ["Cash App", "Zelle", "Apple Pay", "Chime", "PayPal", "Revolut"]
};

const FALLBACK_PRODUCTS = [
  {
    "id": "river-2",
    "series": "RIVER",
    "capacityTier": "UNDER500",
    "name": "RIVER 2",
    "tagline": "Compact, affordable power for everyday small devices.",
    "capacityWh": 256,
    "capacityLabel": "256Wh",
    "outputW": 300,
    "outputLabel": "300W (600W X-Boost)",
    "chargeTime": "60 min full AC charge",
    "weight": "7.7 lb",
    "price": 169,
    "useCase": "Everyday carry & small trips",
    "badge": null,
    "description": "A weekend trip or a dead phone at the worst moment, RIVER 2 is the one you actually remember to grab because it's light enough to live in your bag.",
    "images": [
      "images/river-2-real-1.png",
      "images/river-2-real-2.png",
      "images/river-2-real-3.png",
      "images/river-2-real-4.png"
    ],
    "hook": "300W of power in a 7.7 lb bag, ready in 60 minutes.",
    "bullets": [
      "Charges almost anywhere: AC wall outlet, solar panel, car adapter, or USB-C, so you're never stuck without a way to top it up",
      "Full charge in 60 minutes flat: plug it in before you head out the door and it's ready by the time you've packed everything else",
      "Built to last: LiFePO4 cells rated for 3,000+ charge cycles, roughly 10 years of regular weekend use before it drops below 80% capacity",
      "Genuinely portable: 7.7 lb fits in a daypack or glovebox without you noticing the extra weight"
    ],
    "whoFor": [
      "Everyday carry",
      "Weekend trips",
      "Backup for phones and cameras"
    ],
    "whatsInBox": "RIVER 2 power station, AC charging cable, user guide",
    "inStock": true
  },
  {
    "id": "river-2-max",
    "series": "RIVER",
    "capacityTier": "UNDER500",
    "name": "RIVER 2 Max",
    "tagline": "More capacity for weekend trips and small home backup.",
    "capacityWh": 512,
    "capacityLabel": "512Wh",
    "outputW": 500,
    "outputLabel": "500W (1,000W X-Boost)",
    "chargeTime": "60 min full AC charge",
    "weight": "13.4 lb",
    "price": 269,
    "useCase": "Weekend trips & light backup",
    "badge": null,
    "description": "Roughly double the RIVER 2's capacity, RIVER 2 Max is the strong middle ground for anyone who wants real headroom without stepping up to a heavier DELTA.",
    "images": [
      "images/river-2-max-1.png"
    ],
    "hook": "500W of output, still light enough to carry one-handed.",
    "bullets": [
      "1,000W with X-Boost covers around 80% of common household essentials, think small fans, lamps, laptops, and mini-fridges, not just phones",
      "Full AC charge in 60 minutes, so a lunch-break plug-in gets you back to full before your next outing",
      "Same 3,000+ cycle LiFePO4 cells as the rest of the RIVER line, built for years of repeated weekend use, not a single-season gadget",
      "13.4 lb keeps it genuinely portable for car camping and weekend trips where you're still carrying your own gear"
    ],
    "whoFor": [
      "Weekend camping trips",
      "Light home backup",
      "Car trips"
    ],
    "whatsInBox": "RIVER 2 Max power station, AC charging cable, user guide",
    "inStock": true
  },
  {
    "id": "river-2-pro",
    "series": "RIVER",
    "capacityTier": "500-1000",
    "name": "RIVER 2 Pro",
    "tagline": "The most capable RIVER for extended off-grid trips.",
    "capacityWh": 768,
    "capacityLabel": "768Wh",
    "outputW": 800,
    "outputLabel": "800W (1,600W X-Boost)",
    "chargeTime": "70 min full AC charge",
    "weight": "17.2 lb",
    "price": 339,
    "useCase": "Extended camping & RV trips",
    "badge": null,
    "description": "The most capable RIVER in the lineup, built for people who camp for more than a weekend and need real appliance power without hauling a DELTA.",
    "images": [
      "images/river-2-pro-real-1.png",
      "images/river-2-pro-real-2.png",
      "images/river-2-pro-real-3.png",
      "images/river-2-pro-real-4.png"
    ],
    "hook": "800W of output for multi-day trips off the grid.",
    "bullets": [
      "TÜV Rheinland safety certified, independently verified rather than just self-reported specs",
      "Full AC charge in about 70 minutes, quick enough to top off between drives on a multi-stop trip",
      "Pairs with a 220W solar panel for a full charge in roughly 3.5 hours of good sun, genuinely usable for off-grid recharging, not just a marketing bullet",
      "1,600W X-Boost handles small kitchen appliances like a coffee maker or electric kettle, not just device charging"
    ],
    "whoFor": [
      "Extended camping trips",
      "RV weekends",
      "Multi-day off-grid use"
    ],
    "whatsInBox": "RIVER 2 Pro power station, AC charging cable, user guide",
    "inStock": true
  },
  {
    "id": "river-3",
    "series": "RIVER",
    "capacityTier": "UNDER500",
    "name": "RIVER 3",
    "tagline": "Grab-and-go power for phones, laptops, and weekend trips.",
    "capacityWh": 245,
    "capacityLabel": "245Wh",
    "outputW": 300,
    "outputLabel": "300W (600W X-Boost)",
    "chargeTime": "1 hr AC full charge",
    "weight": "7.9 lb",
    "price": 189,
    "ecoflowPrice": 239,
    "description": "The entry point into the current EcoFlow lineup, honest about what it's for: phones, cameras, and laptops on the go, not microwaves or power tools.",
    "images": [
      "images/river-3-real-1.png",
      "images/river-3-real-2.png",
      "images/river-3-real-3.png",
      "images/river-3-real-4.png",
      "images/river-3-real-5.png"
    ],
    "hook": "300W of power, ready in 60 minutes, built for the essentials.",
    "bullets": [
      "Full AC charge in 60 minutes flat, so it's rarely the thing holding up your departure",
      "Solar charging with a 110W panel takes about 2.6 hours, a realistic option for weekend trips without grid access",
      "Car charging in about 2.8 hours, useful for topping off during a long drive to the campsite",
      "LiFePO4 cells rated for 3,000+ cycles, about 10 years of regular use before performance drops off"
    ],
    "whoFor": [
      "Weekend trips",
      "Everyday carry",
      "Small electronics on the road"
    ],
    "useCase": "Weekend trips, Everyday carry, Small electronics on the road",
    "whatsInBox": "RIVER 3 power station, AC charging cable, user guide",
    "inStock": true
  },
  {
    "id": "river-3-plus",
    "series": "RIVER",
    "capacityTier": "UNDER500",
    "name": "RIVER 3 Plus",
    "tagline": "More output, expandable capacity, home-office UPS backup.",
    "capacityWh": 286,
    "capacityLabel": "286Wh (expandable to 858Wh)",
    "outputW": 600,
    "outputLabel": "600W (1,200W X-Boost)",
    "chargeTime": "1 hr AC full charge",
    "weight": "10.4 lb",
    "price": 245,
    "useCase": "Home office UPS & camping",
    "badge": null,
    "description": "Doubles the output of the base RIVER 3, with genuine UPS backup for home-office gear plus enough headroom for small appliances while camping.",
    "images": [
      "images/river-3-plus-real-1.png",
      "images/river-3-plus-real-2.png",
      "images/river-3-plus-real-3.png",
      "images/river-3-plus-real-4.png",
      "images/river-3-plus-real-5.png",
      "images/river-3-plus-real-6.png",
      "images/river-3-plus-real-7.png"
    ],
    "hook": "Sub-10ms backup power for your desktop, router, or NAS drive.",
    "bullets": [
      "Keeps a 3W WiFi router running for up to 35 hours, your internet stays up through a multi-hour outage",
      "Keeps a 600W computer alive for at least 21 minutes, enough time for a safe shutdown instead of losing unsaved work",
      "Expandable to 858Wh with an EB600 extra battery, so you can grow capacity later instead of buying a bigger unit outright",
      "IP54 water-resistant and survives a 3.3 ft drop, built for a desk or a tailgate, not just a shelf"
    ],
    "whoFor": [
      "Home office UPS backup",
      "Camping",
      "Small kitchen appliances"
    ],
    "whatsInBox": "RIVER 3 Plus power station, AC charging cable, DC5521-to-5525 car charging cable, user guide",
    "inStock": true
  },
  {
    "id": "delta-2",
    "series": "DELTA",
    "capacityTier": "1000-2000",
    "name": "DELTA 2",
    "tagline": "The benchmark mid-size station for home backup and travel.",
    "capacityWh": 1024,
    "capacityLabel": "1,024Wh (expandable to 3kWh)",
    "outputW": 1800,
    "outputLabel": "1,800W (2,200W X-Boost)",
    "chargeTime": "50 min to 80%, ~90 min full AC charge",
    "weight": "27 lb",
    "price": 469,
    "useCase": "Home backup & road trips",
    "badge": "Best Seller",
    "description": "The benchmark mid-size station for home backup and travel, the one most people land on because it just handles what they throw at it.",
    "images": [
      "images/delta-2-real-1.png",
      "images/delta-2-real-2.png",
      "images/delta-2-real-3.png"
    ],
    "hook": "EcoFlow's best-selling station, powers around 90% of home appliances.",
    "bullets": [
      "1,800W output (2,200W with X-Boost) runs mini-fridges and power tools, not just electronics",
      "X-Stream fast charging gets you to 80% in 50 minutes via AC, so a short charge window is still a useful one",
      "Expandable to 3,040Wh with an extra battery, buy the base unit now and add capacity later if your needs grow",
      "LiFePO4 cells built for long-term daily reliability, not a battery that degrades after a season"
    ],
    "whoFor": [
      "Home backup",
      "Road trips",
      "Everyday appliance power"
    ],
    "whatsInBox": "DELTA 2 power station, AC charging cable, DC5521-to-5525 car charging cable, user guide",
    "inStock": true
  },
  {
    "id": "delta-3-classic",
    "series": "DELTA",
    "capacityTier": "1000-2000",
    "name": "DELTA 3 Classic",
    "tagline": "The straightforward, budget-friendly DELTA-class station.",
    "capacityWh": 1024,
    "capacityLabel": "1,024Wh",
    "outputW": 1800,
    "outputLabel": "1,800W (3,600W surge)",
    "chargeTime": "45 min to 80%, ~60 min full AC charge",
    "weight": "26 lb",
    "price": 449,
    "ecoflowPrice": 599,
    "useCase": "Budget home backup",
    "badge": null,
    "description": "All the core DELTA-class output at a lower price point, no-frills backup for people who want dependable power without paying for extras they won't use.",
    "images": [
      "images/delta-3-classic-real-1.png",
      "images/delta-3-classic-real-2.png"
    ],
    "hook": "1,800W of DELTA-class power at the lineup's lowest price.",
    "bullets": [
      "3,600W X-Boost supports devices up to 2,600W, microwaves, fridges, and window AC units included, not just small electronics",
      "10ms auto-switch protects sensitive devices during outages, your router and computer don't even blink",
      "Quiet operation at 30dB or below under a 600W load, won't drown out a conversation in the next room",
      "Full AC charge in about 60 minutes, back to full well within an afternoon"
    ],
    "whoFor": [
      "Budget home backup",
      "Everyday use"
    ],
    "whatsInBox": "DELTA 3 Classic power station, AC charging cable, DC5521-to-5525 car charging cable, user guide",
    "inStock": true
  },
  {
    "id": "delta-3",
    "series": "DELTA",
    "capacityTier": "1000-2000",
    "name": "DELTA 3",
    "tagline": "The current-generation base DELTA, expandable and dependable.",
    "capacityWh": 1024,
    "capacityLabel": "1,024Wh (expandable to 5kWh)",
    "outputW": 1800,
    "outputLabel": "1,800W (3,600W surge)",
    "chargeTime": "60 min to 80%, ~90 min full charge, 5 charging methods",
    "weight": "28.7 lb",
    "price": 519,
    "useCase": "Home backup & everyday use",
    "badge": null,
    "description": "The current-generation DELTA, dependable the day it arrives and built to grow with you if your power needs increase later.",
    "images": [
      "images/delta-3-real-1.png",
      "images/delta-3-real-2.png",
      "images/delta-3-real-3.png",
      "images/delta-3-real-4.png"
    ],
    "hook": "1,800W of output, expandable up to 5kWh.",
    "bullets": [
      "5 ways to charge, including alternator and dual-fuel generator, so you're covered even in situations AC and solar can't reach",
      "Supports 99% of household devices, from routers to refrigerators, without needing to check compatibility first",
      "X-Boost extends output to run ovens and kettles that would trip a lower-wattage station",
      "Expandable with DELTA 3, DELTA 2, or DELTA Pro 3 extra batteries, so today's purchase isn't your capacity ceiling"
    ],
    "whoFor": [
      "Home backup",
      "Everyday use",
      "Growing power needs"
    ],
    "whatsInBox": "DELTA 3 power station, AC charging cable, DC5521-to-5525 car charging cable, user guide",
    "inStock": true
  },
  {
    "id": "delta-3-plus",
    "series": "DELTA",
    "capacityTier": "1000-2000",
    "name": "DELTA 3 Plus",
    "tagline": "The most versatile all-rounder in the lineup.",
    "capacityWh": 1024,
    "capacityLabel": "1,024Wh (expandable 1–5kWh)",
    "outputW": 1800,
    "outputLabel": "1,800W (2,200W X-Boost, 3,600W surge)",
    "chargeTime": "56 min full AC charge (1,500W input), 5 charging methods",
    "weight": "27.6 lb",
    "price": 649,
    "useCase": "All-purpose: camping to backup",
    "badge": "Recommended",
    "description": "Camping trip or blackout at home, DELTA 3 Plus keeps running what matters without babysitting a generator.",
    "images": [
      "images/delta-3-plus-real-1.png",
      "images/delta-3-plus-real-2.png",
      "images/delta-3-plus-real-3.png"
    ],
    "hook": "1,800W of output, ready in 56 minutes, expandable up to 5kWh.",
    "bullets": [
      "Runs almost anything: 1,800W output (2,200W with X-Boost, 3,600W surge) handles ovens, hair dryers, kettles, and other high-draw appliances most compact stations can't touch",
      "Fast on any power source: 0 to 100% in 56 minutes via AC, 70 minutes via solar, 1.3 hours via car charger, 5 ways to charge total",
      "Grows with you: starts at 1,024Wh, expandable to 5kWh with add-on battery packs, buy small now and scale later",
      "Instant backup: under 10ms switchover when the grid drops, computers and NAS servers stay running without a blip"
    ],
    "whoFor": [
      "Weekend camping and road trips",
      "Home backup during outages",
      "Running power tools or a home office without interruption"
    ],
    "whatsInBox": "DELTA 3 Plus power station, AC charging cable, DC5521-to-5525 car charging cable, user guide",
    "inStock": true
  },
  {
    "id": "delta-2-max",
    "series": "DELTA",
    "capacityTier": "2000PLUS",
    "name": "DELTA 2 Max",
    "tagline": "More headroom for full home-appliance backup.",
    "capacityWh": 2048,
    "capacityLabel": "2,048Wh (expandable to 6.1kWh)",
    "outputW": 2400,
    "outputLabel": "2,400W (3,400W X-Boost)",
    "chargeTime": "43 min to 80% (AC+Solar combined), 66 min to 80% (AC only)",
    "weight": "50.7 lb",
    "price": 899,
    "useCase": "Serious home backup",
    "badge": null,
    "description": "More headroom for full home-appliance backup, with the fastest charging in its class when you combine AC and solar.",
    "images": [
      "images/delta-2-max-real-1.png",
      "images/delta-2-max-real-2.png",
      "images/delta-2-max-real-3.png",
      "images/delta-2-max-real-4.png",
      "images/delta-2-max-real-5.png"
    ],
    "hook": "2,400W of output, enough to run 15 devices at once.",
    "bullets": [
      "Keeps a fridge running for up to 14 hours on a single charge, your food survives an overnight outage without a generator",
      "43 minutes to 80% when combining AC with 1,000W solar input, the fastest recharge in its capacity class",
      "Expandable to 6,144Wh with two extra batteries, enough headroom for a multi-day outage rather than just a few hours",
      "30dB quiet operation on 3,000-cycle LFP cells, roughly 10 years of regular use without a noisy fan running constantly"
    ],
    "whoFor": [
      "Serious home backup",
      "Multi-day outages",
      "Off-grid living"
    ],
    "whatsInBox": "DELTA 2 Max power station, AC charging cable, DC5521-to-5525 car charging cable, user guide",
    "inStock": true
  },
  {
    "id": "delta-3-max",
    "series": "DELTA",
    "capacityTier": "2000PLUS",
    "name": "DELTA 3 Max",
    "tagline": "The best value-per-watt-hour in the current lineup.",
    "capacityWh": 2048,
    "capacityLabel": "2,048Wh",
    "outputW": 2400,
    "outputLabel": "2,400W (4,800W surge)",
    "chargeTime": "68 min to 80% AC charge, ≤25dB whisper-quiet",
    "weight": "44.8 lb",
    "price": 799,
    "useCase": "Home backup & extended off-grid",
    "badge": null,
    "description": "Refreshed internals bring faster charging and quieter operation to the 2,048Wh tier, more capable without the higher price of the Max Plus.",
    "images": [
      "images/delta-3-max-real-1.png",
      "images/delta-3-max-real-2.png",
      "images/delta-3-max-real-3.png",
      "images/delta-3-max-real-4.png"
    ],
    "hook": "2,400W of output at the best value-per-watt-hour in the lineup.",
    "bullets": [
      "68 minutes to 80% via AC, quick enough to top off during a lunch break before an evening trip",
      "25dB or quieter operation, whisper-quiet even while actively charging in a shared living space",
      "Sub-10ms UPS switchover, sensitive electronics keep running through a grid interruption without rebooting",
      "13% lighter than the previous generation, easier to move between the garage and wherever you actually need it"
    ],
    "whoFor": [
      "Home backup",
      "Extended off-grid trips"
    ],
    "whatsInBox": "DELTA 3 Max power station, AC charging cable, DC5521-to-5525 car charging cable, user guide",
    "inStock": true
  },
  {
    "id": "delta-3-max-plus",
    "series": "DELTA",
    "capacityTier": "2000PLUS",
    "name": "DELTA 3 Max Plus",
    "tagline": "DELTA 3 Max with expandable capacity for growing needs.",
    "capacityWh": 2048,
    "capacityLabel": "2,048Wh (expandable 2-10kWh)",
    "outputW": 3000,
    "outputLabel": "3,000W continuous (6,000W surge)",
    "chargeTime": "47 min to 80% AC charge, Smart Output Priority via app",
    "weight": "48.7 lb",
    "price": 1049,
    "useCase": "Home backup with room to grow",
    "badge": null,
    "description": "DELTA 3 Max with real room to grow, built for heavy-duty appliances and whole-circuit backup rather than just a few essentials.",
    "images": [
      "images/delta-3-max-plus-real-1.png",
      "images/delta-3-max-plus-real-2.png",
      "images/delta-3-max-plus-real-3.png"
    ],
    "hook": "3,000W of output, expandable up to 10kWh.",
    "bullets": [
      "X-Boost 3.0 runs appliances up to 3,800W, fridges, washers, and circular saws that would overload a smaller station",
      "Choose which circuits stay powered via the app, prioritize the fridge and router without wasting capacity on everything else",
      "Pairs with EcoFlow's Smart Generator 4000 for automatic start and stop, extended outages don't mean manually restarting a generator at 3am",
      "Under 25dB even while charging at full load, quiet enough to keep running overnight without disturbing anyone"
    ],
    "whoFor": [
      "Home backup with room to grow",
      "Heavy-duty appliances"
    ],
    "whatsInBox": "DELTA 3 Max Plus power station, AC charging cable, DC5521-to-5525 car charging cable, user guide",
    "inStock": true
  },
  {
    "id": "delta-pro",
    "series": "DELTA_PRO",
    "capacityTier": "2000PLUS",
    "name": "DELTA Pro",
    "tagline": "The original whole-home-leaning battery.",
    "capacityWh": 3600,
    "capacityLabel": "3,600Wh (expandable to 10.8kWh with 2 extra batteries)",
    "outputW": 3600,
    "outputLabel": "3,600W (4,500W X-Boost; up to 7,200W pairing 2 units)",
    "chargeTime": "1.8 hr full AC charge (3000W input), 6,500W MultiCharge combined",
    "weight": "99 lb",
    "price": 1549,
    "useCase": "Whole-home backup",
    "badge": null,
    "description": "Serious backup for the households that can't just wait out a multi-day outage, well pumps, multiple fridges, and high-draw appliances included.",
    "images": [
      "images/delta-pro-real-1.png",
      "images/delta-pro-real-2.png"
    ],
    "hook": "3,600W of output, built for whole-home-leaning backup.",
    "bullets": [
      "Industry-first EV charging station compatibility, Level 2 charging up to 3,400W, so it can double as backup for your car too",
      "Expandable to 10.8kWh with two extra batteries, genuinely built for multi-day outages, not just a rough afternoon without power",
      "Pair two units together for up to 7,200W output, enough for the appliances a single station can't cover alone",
      "LFP cells rated for 3,500 cycles to 80% capacity, built for a decade of dependable use rather than a couple of storm seasons"
    ],
    "whoFor": [
      "Whole-home backup",
      "Multi-day outages",
      "Well pumps and major appliances"
    ],
    "whatsInBox": "DELTA Pro power station, AC charging cable, user guide",
    "inStock": true
  },
  {
    "id": "delta-3-ultra",
    "series": "DELTA",
    "capacityTier": "2000PLUS",
    "name": "DELTA 3 Ultra",
    "tagline": "Flagship portable tier with smart circuit prioritization.",
    "capacityWh": 3072,
    "capacityLabel": "3,072Wh",
    "outputW": 3600,
    "outputLabel": "3,600W (7,200W surge)",
    "chargeTime": "89 min to 80% AC/generator charge",
    "weight": "72.1 lb",
    "price": 1249,
    "useCase": "Apartments & small homes",
    "badge": null,
    "description": "Flagship portable tier with smart circuit prioritization, connects directly to your home's panel instead of running extension cords through the house.",
    "images": [
      "images/delta-3-ultra-real-1.png",
      "images/delta-3-ultra-real-2.png",
      "images/delta-3-ultra-real-3.png",
      "images/delta-3-ultra-real-4.png",
      "images/delta-3-ultra-real-5.png"
    ],
    "hook": "3,600W of output for apartments and small homes.",
    "bullets": [
      "Runs heavy-duty appliances up to 4,600W, well beyond what most portable stations can sustain",
      "Two ways to connect: a manual transfer switch or an inlet box, whichever fits how your home's already wired",
      "Class-B EV-grade certification, built and tested to a higher safety standard than typical consumer electronics",
      "25dB or quieter operation, runs in the background without becoming the loudest thing in the room"
    ],
    "whoFor": [
      "Apartments and small homes",
      "Home backup"
    ],
    "whatsInBox": "DELTA 3 Ultra power station, AC charging cable, user guide, transfer switch/inlet box sold separately",
    "inStock": true
  },
  {
    "id": "delta-3-ultra-plus",
    "series": "DELTA",
    "capacityTier": "2000PLUS",
    "name": "DELTA 3 Ultra Plus",
    "tagline": "The top of the portable DELTA 3 line, further expandable.",
    "capacityWh": 3072,
    "capacityLabel": "3,072Wh (expandable to 11kWh+)",
    "outputW": 3600,
    "outputLabel": "3,600W (7,200W surge)",
    "chargeTime": "89 min to 80% (AC/generator), 48 min to 80% (solar+generator combined)",
    "weight": "74.3 lb",
    "price": 1449,
    "useCase": "Apartments & small homes",
    "badge": null,
    "description": "The top of the portable DELTA 3 line, everything the Ultra offers, plus the room to grow that renters and small-home owners eventually need.",
    "images": [
      "images/delta-3-ultra-plus-real-1.png",
      "images/delta-3-ultra-plus-real-2.png",
      "images/delta-3-ultra-plus-real-3.png"
    ],
    "hook": "3,600W of output, expandable past 11kWh.",
    "bullets": [
      "Smart Output Priority lets you choose which circuits stay powered via the app, so limited capacity goes to what matters most first",
      "Expandable from 3,072Wh to over 11kWh, start small and add batteries as your backup needs grow",
      "48 minutes to 80% when combining solar and generator input, fast enough to recover between waves of a multi-day storm",
      "Runs a 200W fridge for 12 to 24 hours, groceries survive an extended outage without a second thought"
    ],
    "whoFor": [
      "Apartments and small homes",
      "Home backup",
      "Multi-day power"
    ],
    "whatsInBox": "DELTA 3 Ultra Plus power station, AC charging cable, user guide, transfer switch/inlet box sold separately",
    "inStock": true
  },
  {
    "id": "delta-pro-3",
    "series": "DELTA_PRO",
    "capacityTier": "2000PLUS",
    "name": "DELTA Pro 3",
    "tagline": "The flagship, chainable for whole-home, multi-day power.",
    "capacityWh": 4096,
    "capacityLabel": "4,096Wh (expandable to 48kWh)",
    "outputW": 4000,
    "outputLabel": "4,000W (6,000W X-Boost)",
    "chargeTime": "50 min charge to 80%, continuous output while charging",
    "weight": "60 lb",
    "price": 2299,
    "ecoflowPrice": 2599,
    "description": "The flagship in the DELTA Pro line, chainable for whole-home, multi-day power when a single unit genuinely isn't enough.",
    "images": [
      "images/delta-pro-3-real-1.png",
      "images/delta-pro-3-real-2.png",
      "images/delta-pro-3-real-3.png",
      "images/delta-pro-3-real-4.png"
    ],
    "hook": "4,000W of output, enough for a 3-ton central AC.",
    "bullets": [
      "120V and 240V output from a single unit, covers standard outlets and larger appliances without a separate transformer",
      "Retains 80% capacity even after 4,000 cycles, still performing like new after more than a decade of regular use",
      "UL9540 certified and eligible for the Residential Clean Energy Credit, a real tax rebate, not just a marketing claim",
      "App control across up to 12 circuits, manage exactly what draws power during an outage from your phone"
    ],
    "whoFor": [
      "Whole-home backup",
      "Multi-day power",
      "Central AC and major appliances"
    ],
    "useCase": "Whole-home backup, Multi-day power, Central AC and major appliances",
    "whatsInBox": "DELTA Pro 3 power station, AC charging cable, user guide",
    "inStock": true
  },
  {
    "id": "delta-pro-ultra",
    "series": "DELTA_PRO",
    "capacityTier": "2000PLUS",
    "name": "DELTA Pro Ultra",
    "tagline": "Whole-home backup power built to replace a gas generator.",
    "capacityWh": 6144,
    "capacityLabel": "6,144Wh (expandable to 90kWh)",
    "outputW": 7200,
    "outputLabel": "7.2-21.6kW with up to 3 inverters",
    "chargeTime": "0ms online-UPS transfer time",
    "weight": "186 lb (inverter + battery)",
    "price": 3799,
    "ecoflowPrice": 6299,
    "description": "Whole-home backup power at generator-replacing scale, for the households that have decided a portable station isn't enough anymore.",
    "images": [
      "images/delta-pro-ultra-real-1.png",
      "images/delta-pro-ultra-real-2.png"
    ],
    "hook": "Up to 21.6kW of output, built to replace a gas generator.",
    "bullets": [
      "The only portable power station certified to both UL1973 and UL9540, the same safety bar as fixed home battery systems",
      "0ms online-UPS transfer, power never blinks, even sensitive lab or medical equipment stays running through a grid drop",
      "Industry-fastest 8,800W charging, two batteries fully charged in 2 hours instead of overnight",
      "Self-heating battery works reliably below 32°F, doesn't lose performance the moment winter arrives"
    ],
    "whoFor": [
      "Whole-home backup",
      "Off-grid living",
      "Generator replacement"
    ],
    "useCase": "Whole-home backup, Off-grid living, Generator replacement",
    "whatsInBox": "DELTA Pro Ultra inverter and battery, AC charging cable, user guide, professional installation recommended",
    "inStock": true
  },
  {
    "id": "delta-pro-ultra-x",
    "series": "DELTA_PRO",
    "capacityTier": "2000PLUS",
    "name": "DELTA Pro Ultra X",
    "tagline": "EcoFlow's largest system, 100% whole-home power.",
    "capacityWh": 12000,
    "capacityLabel": "12,000Wh starting (expandable to 180kWh)",
    "outputW": 12000,
    "outputLabel": "12,000W (expandable to 36,000W with 3 units)",
    "chargeTime": "10ms UPS standalone, 20ms with Smart Home Panel 3, plug & play install in 7 days",
    "weight": "70.1 lb inverter + 111.3 lb per battery (292.7 lb as shipped with 2 batteries)",
    "price": 7599,
    "useCase": "Whole-home & multi-property backup",
    "badge": "Maximum Configuration",
    "description": "EcoFlow's largest system, built for genuine 100% whole-home power rather than a subset of circuits.",
    "images": [
      "images/delta-pro-ultra-x-real-1.png",
      "images/delta-pro-ultra-x-real-2.png",
      "images/delta-pro-ultra-x-real-3.png"
    ],
    "hook": "12,000W of output, expandable to power an entire property.",
    "bullets": [
      "Ships as an inverter plus two 6,144Wh battery packs, a complete starting system rather than a single unit you build around",
      "Surge handling up to 45kW via the Adaptive Start algorithm, absorbs the startup spike of well pumps and AC compressors without tripping",
      "Supports up to 10 battery packs for maximum expansion, room to scale as a property's power needs grow over years",
      "Installed in as little as 7 days from permit issuance, faster than most traditional whole-home generator installs"
    ],
    "whoFor": [
      "Whole-home backup",
      "Multi-property backup"
    ],
    "whatsInBox": "Inverter plus two 6,144Wh battery packs, AC charging cable, user guide, professional installation required",
    "inStock": true
  },
  {
    "id": "trail-200",
    "series": "TRAIL",
    "capacityTier": "UNDER500",
    "name": "TRAIL 200 DC",
    "tagline": "The lightest way to keep essentials charged in the backcountry.",
    "capacityWh": 192,
    "capacityLabel": "192Wh (60,000mAh)",
    "outputW": 220,
    "outputLabel": "220W DC-only",
    "chargeTime": "~1 hr to 80% via USB-C (no dedicated AC charger included)",
    "weight": "4.03 lb",
    "price": 99,
    "useCase": "Hiking & ultralight camping",
    "badge": "Ultralight",
    "description": "Built purely for phones, headlamps, cameras, and small gear on trips where every ounce counts, not a scaled-down home backup unit.",
    "images": [
      "images/trail-200-real-1.png",
      "images/trail-200-real-2.png",
      "images/trail-200-real-3.png"
    ],
    "hook": "220W of DC power in a 4 lb ultralight frame.",
    "bullets": [
      "No bulky AC inverter, a DC-only design that saves weight you'd otherwise carry for outlets you won't use on trail",
      "Charges via bi-directional USB-C, cable not included, so it uses the same charger you're probably already packing",
      "LiFePO4 cells rated for 2,000+ cycles, about 5 years of regular use before capacity starts to drop",
      "IP30-rated enclosure, reasonable protection for dust and light moisture on the trail, not a submersion-proof unit"
    ],
    "whoFor": [
      "Hiking",
      "Ultralight camping",
      "Backcountry trips"
    ],
    "whatsInBox": "TRAIL 200 power station only, USB-C cable not included, bring your own",
    "inStock": true
  },
  {
    "id": "trail-300",
    "series": "TRAIL",
    "capacityTier": "UNDER500",
    "name": "TRAIL 300 DC",
    "tagline": "The flagship TRAIL, more ports, more capacity, still pocket-light.",
    "capacityWh": 288,
    "capacityLabel": "288Wh (90,000mAh)",
    "outputW": 300,
    "outputLabel": "300W DC-only",
    "chargeTime": "~1 hr to 80% via USB-C (no dedicated AC charger included)",
    "weight": "5.69 lb",
    "price": 139,
    "useCase": "Camping, tailgating & group trips",
    "badge": null,
    "description": "More ports, more capacity, still pocket-light, the practical choice for groups who don't want to fight over one charger.",
    "images": [
      "images/trail-300-real-1.png",
      "images/trail-300-real-2.png",
      "images/trail-300-real-3.png"
    ],
    "hook": "Charges 5 devices at once, the flagship TRAIL.",
    "bullets": [
      "Fast PD 3.1 USB-C ports charge up to 5 devices simultaneously, no more waiting your turn at the one outlet",
      "Includes a 12V car outlet, useful for gear the USB ports alone can't cover",
      "Drop-proof, IP30-rated construction, built to survive actually being used outdoors, not just look rugged",
      "Charges via bi-directional USB-C, bring your own charger and it just works"
    ],
    "whoFor": [
      "Camping",
      "Tailgating",
      "Group trips"
    ],
    "whatsInBox": "TRAIL 300 power station only, USB-C cable not included, bring your own",
    "inStock": true
  },
  {
    "id": "trail-plus-300",
    "series": "TRAIL",
    "capacityTier": "UNDER500",
    "name": "TRAIL Plus 300 DC",
    "tagline": "TRAIL 300, plus a built-in light and detachable cable handle.",
    "capacityWh": 288,
    "capacityLabel": "288Wh (80,000mAh)",
    "outputW": 300,
    "outputLabel": "300W DC-only",
    "chargeTime": "~1 hr to 80% via USB-C",
    "weight": "4.98 lb",
    "price": 179,
    "useCase": "Tent camping & lifestyle trips",
    "badge": "Most Versatile TRAIL",
    "description": "Same capacity as TRAIL 300 DC, with genuinely useful extras for tent nights rather than pure minimalism.",
    "images": [
      "images/trail-plus-300-real-1.png"
    ],
    "hook": "TRAIL 300, plus a built-in light for the campsite.",
    "bullets": [
      "Built-in multi-function camping light, one less thing to pack and one less thing to forget",
      "Detachable 140W cable handle, doubles as a way to carry it and a way to charge from it",
      "2x USB-A (12W) and 3x USB-C (140W) ports plus a 12V car outlet, enough ports that the whole tent doesn't have to share",
      "Slightly lighter than TRAIL 300 DC at 4.98 lb, the extras don't cost you portability"
    ],
    "whoFor": [
      "Tent camping",
      "Campsite lifestyle trips"
    ],
    "whatsInBox": "TRAIL Plus 300 power station, detachable 140W cable handle, user guide",
    "inStock": true
  }
];

// Power Kits, bundled combos (power station + solar panel/battery/accessories).
const BUNDLES = [
  {
    id: "kit-weekend-camper",
    name: "Weekend Camper Kit",
    tagline: "RIVER 3 + 45W solar panel + waterproof carry bag",
    productId: "river-3",
    accessories: ["45W Portable Solar Panel", "RIVER 3 Waterproof Bag"],
    price: 219,
    compareAt: 309,
    badge: "Great Starter Kit",
    useCase: "Camping",
    description: "Everything a first-time camper needs in one order: RIVER 3 for essentials, a 45W panel to keep it topped up, and a waterproof bag for wet-weather trips.",
    image: "images/kit-weekend-camper-1.png"
  },
  {
    id: "kit-home-office-ups",
    name: "Home Office UPS Kit",
    tagline: "RIVER 3 Plus + EB600 battery for extended desk backup",
    productId: "river-3-plus",
    accessories: ["RIVER 3 EB600 Extra Battery (+572Wh)"],
    price: 429,
    compareAt: 484,
    badge: null,
    useCase: "Home Office",
    description: "RIVER 3 Plus with an EB600 extra battery for extended desk backup, enough runtime to protect a work session through a longer outage, not just a quick blip.",
    image: "images/kit-home-office-ups-1.png"
  },
  {
    id: "river-3-max",
    name: "RIVER 3 Max Bundle",
    tagline: "RIVER 3 Plus + EB300 Extra Battery, EcoFlow's own bundled config",
    productId: "river-3-plus",
    accessories: ["RIVER 3 EB300 Extra Battery (+286Wh)"],
    price: 299,
    compareAt: 394,
    badge: "New",
    useCase: "Extended Camping",
    description: "RIVER 3 Plus paired with the compact EB300 battery, a lighter capacity boost than the Max Plus bundle, for trips where every pound still matters.",
    image: null
  },
  {
    id: "river-3-max-plus",
    name: "RIVER 3 Max Plus Bundle",
    tagline: "RIVER 3 Plus + EB600 Extra Battery, maximum RIVER capacity",
    productId: "river-3-plus",
    accessories: ["RIVER 3 EB600 Extra Battery (+572Wh)"],
    price: 429,
    compareAt: 484,
    badge: "New",
    useCase: "Extended Camping & RV",
    description: "RIVER 3 Plus with the larger EB600 battery for maximum RIVER-class capacity, the strongest camping/RV setup available in this series.",
    image: "images/river-3-max-plus-kit-real-1.png"
  },
  {
    id: "kit-everyday-backup",
    name: "Everyday Backup Kit",
    tagline: "DELTA 2 + 220W solar panel, the most popular combo",
    productId: "delta-2",
    accessories: ["NextGen 220W Bifacial Solar Panel"],
    price: 719,
    compareAt: 758,
    badge: "Most Popular",
    useCase: "Home Backup",
    description: "DELTA 2 (1,024Wh, 1,800W output) paired with a 220W bifacial solar panel, a well-rounded middle ground between portability and power for weekend trips or home office backup.",
    image: "images/kit-everyday-backup-1.png"
  },
  {
    id: "kit-expandable-starter",
    name: "Expandable Starter Kit",
    tagline: "DELTA 3 Plus + Extra Battery, grow capacity as you need it",
    productId: "delta-3-plus",
    accessories: ["DELTA 3 Series Extra Battery (+1,024Wh)"],
    price: 989,
    compareAt: 1038,
    badge: null,
    useCase: "Growing Households",
    description: "DELTA 3 Plus (1,024Wh, 1,800W output) with an extra battery already included, start here and add more batteries later as needs grow, up to 5kWh total.",
    image: "images/kit-expandable-starter-1.png"
  },
  {
    id: "kit-serious-backup",
    name: "Serious Backup Kit",
    tagline: "DELTA 2 Max + 400W solar panel for faster, greener recharge",
    productId: "delta-2-max",
    accessories: ["400W Portable Solar Panel"],
    price: 1399,
    compareAt: 1468,
    badge: null,
    useCase: "Home Backup",
    description: "DELTA 2 Max (2,048Wh, 2,400W output) paired with a 400W portable solar panel, the strongest foldable-panel option for multi-day backup with genuine solar recharge.",
    image: "images/kit-serious-backup-1.png"
  },
  {
    id: "kit-off-grid",
    name: "Off-Grid Living Kit",
    tagline: "DELTA Pro 3 + 400W solar panel + Smart Extra Battery",
    productId: "delta-pro-3",
    accessories: ["400W Portable Solar Panel", "DELTA Pro 3 Extra Battery (+4,096Wh)"],
    price: 4599,
    compareAt: 4667,
    badge: "Maximum Off-Grid",
    useCase: "Off-Grid Properties",
    description: "The full off-grid setup: DELTA Pro 3 (12kWh when paired with the included extra battery), a 400W solar panel for daily recharge, and 120V/240V output to power heavy appliances. Built for properties with no grid connection.",
    image: "images/kit-off-grid-1.png"
  },
  {
    id: "kit-trail-ultralight",
    name: "TRAIL Ultralight Kit",
    tagline: "TRAIL 300 + waterproof case, minimal weight, maximum freedom",
    productId: "trail-300",
    accessories: ["TRAIL Waterproof Case"],
    price: 154,
    compareAt: 181,
    badge: null,
    useCase: "Backpacking & Hiking",
    description: "The lightest possible power solution for backpacking trips, TRAIL 300 (DC-only, no AC inverter) at 5.69 lb, plus protection for wet conditions. Charges phones, cameras, and headlamps via USB-C.",
    image: null
  },
  {
    id: "kit-solar-starter",
    name: "Solar Charging Starter Kit",
    tagline: "RIVER 3 + 110W solar panel, entry into solar independence",
    productId: "river-3",
    accessories: ["110W Portable Solar Panel"],
    price: 295,
    compareAt: 348,
    badge: null,
    useCase: "Camping & Light Off-Grid",
    description: "Your first step toward solar self-sufficiency, RIVER 3 with a foldable 110W panel that charges it fully in about 2.5 hours under ideal sun. Great for weekend trips where you want zero grid dependency.",
    image: null
  },
  {
    id: "kit-home-office-advanced",
    name: "Home Office Advanced Kit",
    tagline: "RIVER 3 Plus + 110W solar + waterproof bag, work anywhere",
    productId: "river-3-plus",
    accessories: ["110W Portable Solar Panel", "RIVER 3 Waterproof Bag"],
    price: 382,
    compareAt: 449,
    badge: null,
    useCase: "Remote Work",
    description: "Everything a remote worker needs to work from anywhere, RIVER 3 Plus for extended runtime, a 110W solar panel to recharge during lunch, and a waterproof bag for weather protection.",
    image: null
  },
  {
    id: "kit-delta-home-backup",
    name: "DELTA Home Backup Kit",
    tagline: "DELTA 3 Plus + 160W solar panel, balanced home backup",
    productId: "delta-3-plus",
    accessories: ["160W Portable Solar Panel"],
    price: 755,
    compareAt: 888,
    badge: null,
    useCase: "Home Backup",
    description: "A sweet middle ground for home backup, DELTA 3 Plus delivers enough power for essential circuits, paired with a 160W solar panel for rapid recharge during outages. Foldable, not permanent install.",
    image: null
  },
  {
    id: "kit-delta-pro-portable",
    name: "DELTA Pro Portable Off-Grid Kit",
    tagline: "DELTA Pro + 220W bifacial solar panel, serious portability",
    productId: "delta-pro",
    accessories: ["220W NextGen Bifacial Solar Panel"],
    price: 1564,
    compareAt: 1838,
    badge: null,
    useCase: "Off-Grid Weekends",
    description: "For off-gridders who still want portability, DELTA Pro (3,600Wh, expandable to 10.8kWh) with a 220W bifacial panel. More capable than DELTA-class stations but lighter than DELTA Pro 3.",
    image: null
  },
  {
    id: "kit-budget-camper",
    name: "Budget Camper Kit",
    tagline: "RIVER 2 Max + 60W solar + waterproof case, affordable entry",
    productId: "river-2-max",
    accessories: ["60W Portable Solar Panel", "RIVER Waterproof Bag"],
    price: 373,
    compareAt: 439,
    badge: "Best Value",
    useCase: "Budget Camping",
    description: "The most affordable full-featured camping kit, RIVER 2 Max (512Wh) with a 60W solar panel for recharge and weatherproof protection. Perfect for campers new to power stations.",
    image: null
  }
];

// Extra batteries, cases, carts, panels, and power management accessories, sold standalone
const ACCESSORIES = [
  {
    id: "river-3-extra-battery-eb300",
    category: "battery",
    name: "RIVER 3 Extra Battery (EB300, 286Wh)",
    tagline: "Compact capacity boost for RIVER 3 and RIVER 3 Plus.",
    price: 149,
    compatibleWith: ["river-3", "river-3-plus"],
    description: "Plug-and-play expansion, no tools required. Adds 286Wh, doubling the base RIVER 3's capacity when paired together.",
    images: ["images/river-3-extra-battery-1.png"]
  },
  {
    id: "river-3-extra-battery-eb600",
    category: "battery",
    name: "RIVER 3 Extra Battery (EB600, 572Wh)",
    tagline: "Bigger capacity boost, expands RIVER 3 Plus up to 858Wh total.",
    price: 239,
    compatibleWith: ["river-3", "river-3-plus"],
    description: "Roughly triples RIVER 3's base capacity when combined. Compatible with both the base RIVER 3 and RIVER 3 Plus, though RIVER 3 Plus is the intended pairing for reaching the full 858Wh total.",
    images: [
      "images/river-3-extra-battery-eb600-real-1.png",
      "images/river-3-extra-battery-eb600-real-2.png",
      "images/river-3-extra-battery-eb600-real-3.png",
      "images/river-3-extra-battery-eb600-real-4.png",
      "images/river-3-extra-battery-eb600-real-5.png",
      "images/river-3-extra-battery-eb600-real-6.png"
    ]
  },
  {
    id: "river-3-waterproof-bag",
    category: "case",
    name: "RIVER 3 Waterproof Carrying Bag",
    tagline: "Protect your station on wet-weather trips.",
    price: 45,
    compatibleWith: ["river-3", "river-3-plus"],
    description: "A protective carrying case for wet-weather or dusty conditions, fishing trips, kayaking, rainy campsites. Keeps the unit accessible while shielded.",
    images: ["images/river-3-waterproof-bag-1.png"]
  },
  {
    id: "river-3-tool-pegboard",
    category: "case",
    name: "RIVER 3 Plus Tool Pegboard",
    tagline: "Mount tools and gear directly to your RIVER 3 Plus.",
    price: 36,
    compatibleWith: ["river-3-plus"],
    description: "A mountable pegboard accessory that attaches directly to the RIVER 3 Plus, letting you hang small tools and gear within reach, handy for job sites and van setups.",
    images: ["images/river-3-tool-pegboard-real-1.png"]
  },
  {
    id: "delta-2-extra-battery",
    category: "battery",
    name: "DELTA 2 Smart Extra Battery",
    tagline: "Expand DELTA 2 up to 3kWh total capacity.",
    price: 279,
    compatibleWith: ["delta-2"],
    description: "Plug-and-play expansion for DELTA 2, combined with the base unit's 1,024Wh, reaches up to 3,040Wh total for longer backup runtime.",
    images: ["images/delta-2-extra-battery-1.png"]
  },
  {
    id: "delta-2-max-extra-battery",
    category: "battery",
    name: "DELTA 2 Max Extra Battery",
    tagline: "Expand DELTA 2 Max up to 6.1kWh total capacity.",
    price: 949,
    compatibleWith: ["delta-2-max"],
    description: "Combined with the base 2,048Wh unit, reaches up to 6,144Wh total, enough for multi-day home backup on essential circuits.",
    images: ["images/delta-2-max-extra-battery-1.png"]
  },
  {
    id: "delta-3-extra-battery",
    category: "battery",
    name: "DELTA 3 Series Smart Extra Battery",
    tagline: "1,024Wh battery for DELTA 3 and DELTA 3 Plus, expandable up to 5kWh total.",
    price: 389,
    compatibleWith: ["delta-3-classic", "delta-3", "delta-3-plus", "delta-2"],
    description: "A shared-platform 1,024Wh battery across the DELTA 3 lineup, stack multiple to reach up to 5kWh total system capacity. Plug-and-play, no tools needed.",
    images: [
      "images/delta-3-extra-battery-real-1.png",
      "images/delta-3-extra-battery-real-2.png",
      "images/delta-3-extra-battery-real-3.png",
      "images/delta-3-extra-battery-real-4.png"
    ]
  },
  {
    id: "delta-3-max-plus-extra-battery",
    category: "battery",
    name: "DELTA 3 Max Plus Smart Extra Battery",
    tagline: "2,048Wh battery for DELTA 3 Max Plus and DELTA 3 Ultra Plus, 25% smaller than the DELTA 2 Max equivalent.",
    price: 799,
    compatibleWith: ["delta-3-max-plus", "delta-3-ultra-plus"],
    description: "A 25% smaller, more compact footprint than the equivalent DELTA 2 Max battery, while delivering the same 2,048Wh capacity boost.",
    images: [
      "images/delta-3-max-plus-extra-battery-real-1.png",
      "images/delta-3-max-plus-extra-battery-real-2.png",
      "images/delta-3-max-plus-extra-battery-real-3.png",
      "images/delta-3-max-plus-extra-battery-real-4.png"
    ]
  },
  {
    id: "delta-pro-extra-battery",
    category: "battery",
    name: "DELTA Pro Smart Extra Battery",
    tagline: "Expand DELTA Pro up to 10.8kWh with up to two batteries, ~30% more affordable than a same-capacity station.",
    price: 1149,
    compatibleWith: ["delta-pro"],
    description: "Add up to two of these to reach 10.8kWh total capacity, roughly 30% cheaper per Wh than buying an equivalent-capacity station outright. LFP cells rated for 3,500 cycles to 80%.",
    images: [
      "images/delta-pro-extra-battery-real-1.png",
      "images/delta-pro-extra-battery-real-2.png",
      "images/delta-pro-extra-battery-real-3.png",
      "images/delta-pro-extra-battery-real-4.png"
    ]
  },
  {
    id: "delta-pro-3-extra-battery",
    category: "battery",
    name: "DELTA Pro 3 Smart Extra Battery",
    tagline: "Stack up to 12kWh for true whole-home backup. Eligible for Residential Clean Energy Credit rebates.",
    price: 1799,
    compatibleWith: ["delta-pro-3"],
    description: "Adds 4,096Wh per battery. Stack up to two directly on one DELTA Pro 3 for 12kWh total, or build larger multi-unit systems up to 48kWh with the Smart Home Panel 2. Plug-and-play, no electrician needed for direct battery stacking.",
    images: [
      "images/delta-pro-3-extra-battery-real-1.png",
      "images/delta-pro-3-extra-battery-real-2.png",
      "images/delta-pro-3-extra-battery-real-3.png",
      "images/delta-pro-3-extra-battery-real-4.png"
    ]
  },
  {
    id: "delta-pro-ultra-extra-battery",
    category: "battery",
    name: "DELTA Pro Ultra Series Smart Extra Battery",
    tagline: "6,144Wh battery compatible with both DELTA Pro Ultra and DELTA Pro Ultra X inverters.",
    price: 2099,
    compatibleWith: ["delta-pro-ultra", "delta-pro-ultra-x"],
    description: "A shared-platform 6,144Wh battery pack that works with either the DELTA Pro Ultra or DELTA Pro Ultra X inverter, the same building block used to reach both systems' full expanded capacity.",
    images: [
      "images/delta-pro-ultra-extra-battery-real-1.png"
    ]
  },
  {
    id: "delta-trolley",
    category: "cart",
    name: "DELTA Wheeled Trolley",
    tagline: "Roll your station and batteries instead of carrying them.",
    price: 149,
    compatibleWith: ["delta-pro", "delta-pro-3"],
    description: "A wheeled cart designed for the DELTA Pro and DELTA Pro 3's size and weight, worth considering given these units run 60-99 lb and aren't easy to carry solo.",
    images: ["images/delta-trolley-1.png"]
  },
  {
    id: "delta-pro-ultra-trolley",
    category: "cart",
    name: "DELTA Pro Ultra Trolley",
    tagline: "Purpose-built cart for the DELTA Pro Ultra's weight and stack height.",
    price: 219,
    compatibleWith: ["delta-pro-ultra", "delta-pro-ultra-x"],
    description: "Purpose-built for the DELTA Pro Ultra system's inverter-plus-battery stack, standard dollies aren't sized for this unit's height and weight distribution.",
    images: ["images/delta-pro-ultra-trolley-1.png"]
  },
  {
    id: "smart-home-panel-2",
    category: "panel",
    name: "Smart Home Panel 2",
    tagline: "12-circuit intelligent subpanel with 20ms auto switchover. Installation required.",
    price: 1429,
    compatibleWith: ["delta-pro-3", "delta-pro-ultra"],
    description: "Connects up to 3 DELTA Pro 3 units to your home's electrical system, with automatic switchover during outages and circuit-level control via the EcoFlow app. Professional installation required, this integrates with your home's main panel, not a plug-and-play accessory.",
    images: [
      "images/smart-home-panel-2-real-1.png",
      "images/smart-home-panel-2-real-2.png",
      "images/smart-home-panel-2-real-3.png"
    ]
  },
  {
    id: "smart-home-panel-3",
    category: "panel",
    name: "Smart Home Panel 3 (32 Circuits)",
    tagline: "Command center with 32 smart circuits, under 20ms seamless backup, saves up to $6,000/year, extends backup time up to 42%.",
    price: 2849,
    compatibleWith: ["delta-pro-ultra-x", "delta-pro-ultra"],
    description: "The larger of the two smart panels, 32 circuits vs. Smart Home Panel 2's 12, built for whole-home rather than partial backup. Professional installation required.",
    images: [
      "images/smart-home-panel-3-real-1.png",
      "images/smart-home-panel-3-real-2.png",
      "images/smart-home-panel-3-real-3.png"
    ]
  },
  {
    id: "smart-gateway-200a",
    category: "panel",
    name: "Smart Gateway (200A)",
    tagline: "Whole-home monitoring and control without a full panel installation.",
    price: 1899,
    compatibleWith: ["delta-pro-ultra-x"],
    description: "A lighter-touch alternative to a full Smart Home Panel install, gives whole-home monitoring and automatic backup switchover without rewiring your entire panel. Still requires professional installation.",
    images: [
      "images/smart-gateway-200a-real-1.png",
      "images/smart-gateway-200a-real-2.png",
      "images/smart-gateway-200a-real-3.png"
    ]
  },
  {
    id: "powerinsight-2",
    category: "monitor",
    name: "PowerInsight 2 Home Energy Manager",
    tagline: "11-inch touchscreen showing your whole home's energy flow in real time, with AI voice control.",
    price: 499,
    compatibleWith: ["delta-pro-ultra", "delta-pro-ultra-x", "delta-pro-3"],
    description: "An 11-inch touchscreen dashboard showing real-time energy flow across your whole home, one screen to monitor generation, storage, and usage instead of checking the app. Voice control via built-in AI assistant.",
    images: [
      "images/powerinsight-2-real-1.png",
      "images/powerinsight-2-real-2.png",
      "images/powerinsight-2-real-3.png",
      "images/powerinsight-2-real-4.png"
    ]
  },
  {
    id: "alternator-charger-500w",
    category: "charger",
    name: "500W Alternator Charger",
    tagline: "Charge 1kWh in 2.1 hours while you drive.",
    price: 189,
    compatibleWith: ["delta-3-classic", "delta-3"],
    description: "Charges from your vehicle's alternator while driving, faster than a standard 12V car outlet. Doubles as a jump starter and helps maintain battery health.",
    images: ["images/alternator-charger-500w-real-1.png"]
  },
  {
    id: "alternator-charger-800w",
    category: "charger",
    name: "800W Alternator Charger",
    tagline: "Charge 1kWh in just 1.3 hours while you drive.",
    price: 255,
    compatibleWith: ["delta-3-plus", "delta-2-max"],
    description: "The higher-wattage alternator charger, roughly 60% faster than the 500W version. Doubles as a jump starter and helps maintain vehicle battery health.",
    images: ["images/alternator-charger-800w-real-1.png"]
  },
  {
    id: "trail-waterproof-case",
    category: "case",
    name: "TRAIL DC Series Waterproof Bag",
    tagline: "Keep your TRAIL station dry on fishing or kayak trips.",
    price: 42,
    compatibleWith: ["trail-200", "trail-300", "trail-plus-300"],
    description: "Fits any TRAIL series unit, keeps it dry and protected on fishing, kayaking, or rainy-day trips while staying accessible for use.",
    images: ["images/trail-waterproof-case-1.png"]
  },
  {
    id: "solar-extension-cable",
    category: "cable",
    name: "Solar Extension Cable",
    tagline: "Extend the reach between your panel and power station.",
    price: 27,
    compatibleWith: [],
    description: "Extends the distance between a solar panel and your power station, useful when the best sun angle isn't right next to where the station sits. Universal fit across EcoFlow panels using the standard connector.",
    images: ["images/solar-extension-cable-real-1.png"]
  }
];

// Portable solar panels, shared across the whole lineup
const SOLAR_PANELS = [
  {
    id: "solar-45w",
    name: "45W Portable Solar Panel",
    tagline: "Ultralight Type-C panel for TRAIL and RIVER 3.",
    watts: 45,
    price: 75,
    compatibleWith: ["trail-200", "trail-300", "trail-plus-300", "river-3"],
    description: "Folds down to the size of a laptop. Direct Type-C output charges phones, laptops, and other USB-C devices without needing a power station in between. IP68 waterproof rated. Charge times are lab-tested under ideal sun conditions, expect 20-30% longer in real-world cloud/angle conditions.",
    images: [
      "images/solar-45w-real-1.png",
      "images/solar-45w-real-2.png",
      "images/solar-45w-real-3.png",
      "images/solar-45w-real-4.png"
    ]
  },
  {
    id: "solar-60w",
    name: "60W Portable Solar Panel",
    tagline: "A step up in wattage, still pocket-sized. Type-C direct charging.",
    watts: 60,
    price: 95,
    compatibleWith: ["river-3", "river-3-plus", "river-2"],
    description: "Direct Type-C charging for phones, laptops, and other USB-C devices. Under ideal sun, expect roughly 5-6 hours to fully charge a RIVER 3 from empty, real-world cloud cover and angle typically add 20-30% more time.",
    images: [
      "images/solar-60w-real-1.png",
      "images/solar-60w-real-2.png",
      "images/solar-60w-real-3.png"
    ]
  },
  {
    id: "solar-100w-flexible",
    name: "100W Flexible Solar Panel",
    tagline: "258° flexible, bends to fit curved surfaces like RV roofs.",
    watts: 100,
    price: 189,
    compatibleWith: [],
    description: "Bends up to 258° to fit curved surfaces like RV roofs and van tops for a permanent, low-profile mount, unlike foldable panels, this one is designed to stay in place rather than pack away.",
    images: [
      "images/solar-100w-flexible-real-1.png",
      "images/solar-100w-flexible-real-2.png",
      "images/solar-100w-flexible-real-3.png"
    ]
  },
  {
    id: "solar-100w-rigid",
    name: "100W Rigid Solar Panel (2-Pack)",
    tagline: "All-black rigid panels for permanent van or home mounting.",
    watts: 200,
    price: 359,
    compatibleWith: [],
    description: "Two 100W all-black rigid panels for permanent mounting on a van roof or home structure. IP68 waterproof rated, ~23% conversion efficiency. Includes mounting-ready design; a solar charging cable (MC4 to XT60) may be needed separately depending on your power station.",
    images: [
      "images/solar-100w-rigid-real-1.png",
      "images/solar-100w-rigid-real-2.png",
      "images/solar-100w-rigid-real-3.png"
    ]
  },
  {
    id: "solar-110w",
    name: "110W Portable Solar Panel",
    tagline: "The standard match for the RIVER series.",
    watts: 110,
    price: 159,
    compatibleWith: ["river-3", "river-2-max", "river-2-pro"],
    description: "23% conversion efficiency, about 10% lighter and smaller than comparable 110W panels. IP68 waterproof rated. The included case unfolds into an adjustable stand for optimal sun angle. Note: RIVER 3 caps solar input at 110W, so this is the largest panel that makes sense to pair with it, a bigger panel won't charge it any faster.",
    images: [
      "images/solar-110w-real-1.png",
      "images/solar-110w-real-2.png",
      "images/solar-110w-real-3.png",
      "images/solar-110w-real-4.png",
      "images/solar-110w-real-5.png"
    ]
  },
  {
    id: "solar-125w-bifacial",
    name: "125W Bifacial Modular Solar Panel",
    tagline: "Modular, chain up to 8 panels (1000W total) for scalable solar arrays.",
    watts: 125,
    price: 239,
    compatibleWith: ["delta-pro-ultra", "delta-pro-ultra-x"],
    description: "25% conversion efficiency with a modular, chainable design, link multiple panels for scalable arrays (a 4-panel/500W setup weighs about 37 lb total). IP68 rated with a waterproof XT60-W connector. Bifacial cells capture reflected light on the back side for extra output, and the parallel-connection design resists efficiency loss from partial shading better than series-wired panels.",
    images: [
      "images/solar-125w-bifacial-real-1.png",
      "images/solar-125w-bifacial-real-2.png",
      "images/solar-125w-bifacial-real-3.png"
    ]
  },
  {
    id: "solar-160w",
    name: "NextGen 160W Portable Solar Panel",
    tagline: "Efficient mid-size panel for the DELTA 3 line.",
    watts: 160,
    price: 239,
    compatibleWith: ["delta-3-classic", "delta-3-plus"],
    description: "Foldable and self-supporting at 15.4 lb (7kg), unfolds in seconds with a built-in adjustable kickstand. IP67 waterproof rated for outdoor and camping use.",
    images: [
      "images/solar-160w-real-1.png",
      "images/solar-160w-real-2.png",
      "images/solar-160w-real-3.png",
      "images/solar-160w-real-4.png",
      "images/solar-160w-real-5.png",
      "images/solar-160w-real-6.png"
    ]
  },
  {
    id: "solar-175w-rigid",
    name: "175W Rigid Solar Panel",
    tagline: "For permanent installs, Class B vans and home roof mounting.",
    watts: 175,
    price: 199,
    compatibleWith: [],
    description: "25% conversion efficiency (TOPCon cells), notably higher than the 18-20% typical of traditional panels. Pre-cut mounting holes for van or off-grid installs; pair with the Rigid Solar Panel Mounting Feet for a secure attachment. Compatible with 48V systems and most third-party solar setups via its universal connector.",
    images: [
      "images/solar-175w-rigid-real-1.png",
      "images/solar-175w-rigid-real-2.png"
    ]
  },
  {
    id: "solar-220w-bifacial",
    name: "NextGen 220W Bifacial Solar Panel",
    tagline: "Captures reflected light for up to 25% more energy.",
    watts: 220,
    price: 289,
    compatibleWith: ["delta-3-max", "delta-2-max", "river-3-plus"],
    description: "220W on the front, plus a 155W bifacial back side that captures reflected ambient light for up to 25% more total energy. 22-23% conversion efficiency, IP68 waterproof, tempered-glass build rated to withstand heat up to 300°F. The included case doubles as an adjustable 40-80° stand. In the box: panel, MC4 to XT60i charging cable, protective bag.",
    images: [
      "images/solar-220w-bifacial-real-1.png",
      "images/solar-220w-bifacial-real-2.png",
      "images/solar-220w-bifacial-real-3.png",
      "images/solar-220w-bifacial-real-4.png",
      "images/solar-220w-bifacial-real-5.png",
      "images/solar-220w-bifacial-real-6.png",
      "images/solar-220w-bifacial-real-7.png",
      "images/solar-220w-bifacial-real-8.png"
    ]
  },
  {
    id: "solar-400w",
    name: "400W Portable Solar Panel",
    tagline: "The fastest way to solar-charge the DELTA Pro line.",
    watts: 400,
    price: 569,
    compatibleWith: ["delta-pro", "delta-pro-3", "delta-pro-ultra", "delta-pro-ultra-x", "delta-2"],
    description: "22.4% conversion efficiency with MPPT optimization for a steady charge throughout the day. Folds down with a built-in shoulder strap, ~35 lb. The protective case unfolds into a 40-90° adjustable stand. Uses the universal MC4 connector, compatible with the full DELTA lineup and most third-party generators. Chain up to 3 panels for 1,600W total input on a DELTA Pro.",
    images: [
      "images/solar-400w-real-1.png",
      "images/solar-400w-real-2.png",
      "images/solar-400w-real-3.png"
    ]
  }
];

// Series metadata for category pages and nav
const SERIES_INFO = {
  RIVER: {
    label: "RIVER Series",
    tagline: "Compact, portable power for camping, travel, and everyday carry.",
    slug: "river.html"
  },
  DELTA: {
    label: "DELTA Series",
    tagline: "The all-rounder, home backup, road trips, and everything between.",
    slug: "delta.html"
  },
  DELTA_PRO: {
    label: "DELTA Pro Series",
    tagline: "Whole-home backup power, built to replace a gas generator.",
    slug: "delta-pro.html"
  },
  TRAIL: {
    label: "TRAIL Series",
    tagline: "Ultralight, DC-only power for hikers and backcountry trips.",
    slug: "trail.html"
  }
};

// Escapes text before it's inserted into innerHTML via a template literal.
// Product/accessory/solar names, taglines, etc. all ultimately come from
// the admin panel (backed by Supabase once connected), so anything typed
// there - including an accidental stray HTML tag pasted from somewhere
// else - must never be interpreted as real markup on the live site. Use
// this around any admin-editable text field rendered into innerHTML.
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
