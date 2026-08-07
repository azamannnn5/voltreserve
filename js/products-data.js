// Product catalog — EcoFlow RIVER + DELTA lineup
// Prices are set ~5% under EcoFlow's typical current sale price (not inflated "regular" price),
// based on live data pulled directly from us.ecoflow.com.
const PRODUCTS = [
  {
    id: "river-2",
    series: "RIVER",
    capacityTier: "UNDER500",
    name: "RIVER 2",
    tagline: "Compact, affordable power for everyday small devices.",
    capacityWh: 240,
    capacityLabel: "240Wh",
    outputW: 300,
    outputLabel: "300W (600W X-Boost)",
    chargeTime: "60 min full AC charge",
    weight: "7.7 lb",
    price: 169,
    useCase: "Everyday carry & small trips",
    badge: null,
    description: "A compact, budget-friendly entry point for keeping phones, cameras, and small electronics charged — an easy first power station for new campers.",
    images: [
      "images/river-2-real-1.png",
      "images/river-2-real-2.png",
      "images/river-2-real-3.png",
      "images/river-2-real-4.png"
    ]
  },
  {
    id: "river-2-max",
    series: "RIVER",
    capacityTier: "UNDER500",
    name: "RIVER 2 Max",
    tagline: "More capacity for weekend trips and small home backup.",
    capacityWh: 512,
    capacityLabel: "512Wh",
    outputW: 500,
    outputLabel: "500W (1,000W X-Boost)",
    chargeTime: "60 min full AC charge",
    weight: "13.4 lb",
    price: 269,
    useCase: "Weekend trips & light backup",
    badge: null,
    description: "Doubles the RIVER 2's capacity while staying genuinely portable — a strong middle ground for campers who also want light home backup.",
    images: ["images/river-2-max-1.png"]
  },
  {
    id: "river-2-pro",
    series: "RIVER",
    capacityTier: "500-1000",
    name: "RIVER 2 Pro",
    tagline: "The most capable RIVER for extended off-grid trips.",
    capacityWh: 768,
    capacityLabel: "768Wh",
    outputW: 800,
    outputLabel: "800W (1,600W X-Boost)",
    chargeTime: "70 min full AC charge",
    weight: "17.2 lb",
    price: 339,
    useCase: "Extended camping & RV trips",
    badge: null,
    description: "TÜV Rheinland safety certified with enough headroom for small appliances and multi-day trips without stepping up to the bulkier DELTA class.",
    images: [
      "images/river-2-pro-real-1.png",
      "images/river-2-pro-real-2.png",
      "images/river-2-pro-real-3.png",
      "images/river-2-pro-real-4.png"
    ]
  },
  {
    id: "river-3",
    series: "RIVER",
    capacityTier: "UNDER500",
    name: "RIVER 3",
    tagline: "Grab-and-go power for phones, laptops, and weekend trips.",
    capacityWh: 245,
    capacityLabel: "245Wh",
    outputW: 300,
    outputLabel: "300W (600W X-Boost)",
    chargeTime: "1 hr AC full charge",
    weight: "7.9 lb",
    price: 189,
    useCase: "Camping & everyday carry",
    badge: "Most Affordable",
    description: "The entry point into the current EcoFlow lineup. RIVER 3 is built for keeping phones, cameras, and small electronics topped up on weekend trips, with fast 1-hour AC charging and a rugged, pocketable frame.",
    images: [
      "images/river-3-real-1.png",
      "images/river-3-real-2.png",
      "images/river-3-real-3.png",
      "images/river-3-real-4.png",
      "images/river-3-real-5.png"
    ]
  },
  {
    id: "river-3-plus",
    series: "RIVER",
    capacityTier: "UNDER500",
    name: "RIVER 3 Plus",
    tagline: "More output, expandable capacity, home-office UPS backup.",
    capacityWh: 286,
    capacityLabel: "286Wh (expandable to 858Wh)",
    outputW: 600,
    outputLabel: "600W (1,200W X-Boost)",
    chargeTime: "1 hr AC full charge",
    weight: "10.4 lb",
    price: 245,
    useCase: "Home office UPS & camping",
    badge: null,
    description: "Doubles the output of the base RIVER 3 with a sub-10ms UPS switchover, making it a genuinely useful backup for desktops, routers, and NAS drives — plus enough headroom for small kitchen appliances while camping.",
    images: [
      "images/river-3-plus-real-1.png",
      "images/river-3-plus-real-2.png",
      "images/river-3-plus-real-3.png",
      "images/river-3-plus-real-4.png",
      "images/river-3-plus-real-5.png",
      "images/river-3-plus-real-6.png",
      "images/river-3-plus-real-7.png"
    ]
  },
  {
    id: "delta-2",
    series: "DELTA",
    capacityTier: "1000-2000",
    name: "DELTA 2",
    tagline: "The benchmark mid-size station for home backup and travel.",
    capacityWh: 1024,
    capacityLabel: "1,024Wh (expandable to 3kWh)",
    outputW: 1800,
    outputLabel: "1,800W (2,200W X-Boost)",
    chargeTime: "50 min AC full charge",
    weight: "27 lb",
    price: 469,
    useCase: "Home backup & road trips",
    badge: "Best Seller",
    description: "EcoFlow's best-selling station. DELTA 2 balances capacity, output, and portability, and runs everything from mini-fridges to power tools without breaking a sweat.",
    images: [
      "images/delta-2-real-1.png",
      "images/delta-2-real-2.png",
      "images/delta-2-real-3.png"
    ]
  },
  {
    id: "delta-3-classic",
    series: "DELTA",
    capacityTier: "1000-2000",
    name: "DELTA 3 Classic",
    tagline: "The straightforward, budget-friendly DELTA-class station.",
    capacityWh: 1024,
    capacityLabel: "1,024Wh",
    outputW: 1800,
    outputLabel: "1,800W (3,600W surge)",
    chargeTime: "45 min AC full charge",
    weight: "26 lb",
    price: 449,
    useCase: "Budget home backup",
    badge: null,
    description: "All the core DELTA-class power at a lower price point — 10ms auto-switch, whisper-quiet ≤30dB operation, and a 5-year warranty option via app registration.",
    images: [
      "images/delta-3-classic-real-1.png",
      "images/delta-3-classic-real-2.png"
    ]
  },
  {
    id: "delta-3",
    series: "DELTA",
    capacityTier: "1000-2000",
    name: "DELTA 3",
    tagline: "The current-generation base DELTA — expandable and dependable.",
    capacityWh: 1024,
    capacityLabel: "1,024Wh (expandable to 5kWh)",
    outputW: 1800,
    outputLabel: "1,800W (3,600W surge)",
    chargeTime: "45 min AC full charge, 5 charging methods",
    weight: "26 lb",
    price: 519,
    useCase: "Home backup & everyday use",
    badge: null,
    description: "The current-generation DELTA at the 1,024Wh tier, expandable up to 5kWh with DELTA 3, DELTA 2, or DELTA Pro 3 extra batteries. 5 ways to charge including alternator and dual-fuel generator.",
    images: [
      "images/delta-3-real-1.png",
      "images/delta-3-real-2.png",
      "images/delta-3-real-3.png",
      "images/delta-3-real-4.png"
    ]
  },
  {
    id: "delta-3-plus",
    series: "DELTA",
    capacityTier: "1000-2000",
    name: "DELTA 3 Plus",
    tagline: "The most versatile all-rounder in the lineup.",
    capacityWh: 1024,
    capacityLabel: "1,024Wh (expandable 1–5kWh)",
    outputW: 1800,
    outputLabel: "1,800W (2,200W X-Boost, 3,600W surge)",
    chargeTime: "89 min full charge, 5 charging methods",
    weight: "28 lb",
    price: 649,
    useCase: "All-purpose: camping to backup",
    badge: "Recommended",
    description: "Expandable from 1kWh up to 5kWh with DELTA 3, DELTA 2, or DELTA Pro 3 extra battery packs — the smartest starting point for most buyers who expect their needs to grow.",
    images: [
      "images/delta-3-plus-real-1.png",
      "images/delta-3-plus-real-2.png",
      "images/delta-3-plus-real-3.png"
    ]
  },
  {
    id: "delta-2-max",
    series: "DELTA",
    capacityTier: "2000PLUS",
    name: "DELTA 2 Max",
    tagline: "More headroom for full home-appliance backup.",
    capacityWh: 2048,
    capacityLabel: "2,048Wh (expandable to 6.1kWh)",
    outputW: 2400,
    outputLabel: "2,400W (3,400W X-Boost)",
    chargeTime: "Solar charge 0-100% in 2.3 hrs",
    weight: "48 lb",
    price: 899,
    useCase: "Serious home backup",
    badge: null,
    description: "Runs 15 devices at once across 6 AC outlets. World's fastest AC recharging with X-Stream dual AC+Solar charging — a genuine step toward whole-home confidence.",
    images: [
      "images/delta-2-max-real-1.png",
      "images/delta-2-max-real-2.png",
      "images/delta-2-max-real-3.png",
      "images/delta-2-max-real-4.png",
      "images/delta-2-max-real-5.png"
    ]
  },
  {
    id: "delta-3-max",
    series: "DELTA",
    capacityTier: "2000PLUS",
    name: "DELTA 3 Max",
    tagline: "The best value-per-watt-hour in the current lineup.",
    capacityWh: 2048,
    capacityLabel: "2,048Wh",
    outputW: 2400,
    outputLabel: "2,400W (4,800W surge)",
    chargeTime: "68 min charge, ≤25dB whisper-quiet",
    weight: "45 lb",
    price: 799,
    useCase: "Home backup & extended off-grid",
    badge: "Pre-Order — Ships Early August",
    description: "Refreshed internals bring faster charging and a quieter 25dB operation to the 2,048Wh tier, with a sub-10ms UPS switchover. Currently available for pre-order.",
    images: [
      "images/delta-3-max-real-1.png",
      "images/delta-3-max-real-2.png",
      "images/delta-3-max-real-3.png",
      "images/delta-3-max-real-4.png",
      "images/delta-3-max-real-1.png"
    ]
  },
  {
    id: "delta-3-max-plus",
    series: "DELTA",
    capacityTier: "2000PLUS",
    name: "DELTA 3 Max Plus",
    tagline: "DELTA 3 Max with expandable capacity for growing needs.",
    capacityWh: 2048,
    capacityLabel: "2,048Wh (expandable 2-10kWh)",
    outputW: 3000,
    outputLabel: "3,000W continuous (6,000W surge)",
    chargeTime: "43 min charge (0-80%), Smart Output Priority via app",
    weight: "48.7 lb",
    price: 1049,
    useCase: "Home backup with room to grow",
    badge: null,
    description: "Runs heavy-duty appliances up to 3,800W (fridges, washers, circular saws). Choose which circuits stay powered via the app, and pairs with EcoFlow's Smart Generator for automatic start/stop.",
    images: [
      "images/delta-3-max-plus-real-1.png",
      "images/delta-3-max-plus-real-2.png",
      "images/delta-3-max-plus-real-3.png"
    ]
  },
  {
    id: "delta-pro",
    series: "DELTA_PRO",
    capacityTier: "2000PLUS",
    name: "DELTA Pro",
    tagline: "The original whole-home-leaning battery.",
    capacityWh: 3600,
    capacityLabel: "3,600Wh (expandable to 25kWh)",
    outputW: 3600,
    outputLabel: "3,600W (7,200W surge)",
    chargeTime: "2.7 hr AC charge, 6,500W MultiCharge",
    weight: "99 lb",
    price: 1549,
    useCase: "Whole-home backup",
    badge: null,
    description: "Built for serious backup: well pumps, multiple fridges, and high-draw appliances. Industry-first EV charging station compatibility. Expandable up to 25kWh with extra batteries for multi-day outages.",
    images: [
      "images/delta-pro-real-1.png",
      "images/delta-pro-real-2.png"
    ]
  },
  {
    id: "delta-3-ultra",
    series: "DELTA",
    capacityTier: "2000PLUS",
    name: "DELTA 3 Ultra",
    tagline: "Flagship portable tier with smart circuit prioritization.",
    capacityWh: 3072,
    capacityLabel: "3,072Wh (expandable 3–11kWh)",
    outputW: 3600,
    outputLabel: "3,600W (7,200W surge)",
    chargeTime: "89 min full AC charge",
    weight: "80 lb",
    price: 1249,
    useCase: "Apartments & small homes",
    badge: null,
    description: "Runs heavy-duty appliances up to 4,600W. Two ways to connect to your home (manual transfer switch or inlet box), Class-B EV-grade certification, and ≤25dB whisper-quiet operation.",
    images: [
      "images/delta-3-ultra-real-1.png",
      "images/delta-3-ultra-real-2.png",
      "images/delta-3-ultra-real-3.png",
      "images/delta-3-ultra-real-4.png",
      "images/delta-3-ultra-real-5.png",
      "images/delta-3-ultra-real-1.png"
    ]
  },
  {
    id: "delta-3-ultra-plus",
    series: "DELTA",
    capacityTier: "2000PLUS",
    name: "DELTA 3 Ultra Plus",
    tagline: "The top of the portable DELTA 3 line, further expandable.",
    capacityWh: 3072,
    capacityLabel: "3,072Wh (expandable to 11kWh+)",
    outputW: 3600,
    outputLabel: "3,600W (7,200W surge)",
    chargeTime: "48 min charge (0-80%) with solar + generator dual charging",
    weight: "74.3 lb",
    price: 1449,
    useCase: "Apartments & small homes",
    badge: null,
    description: "Adds Smart Output Priority (choose which circuits stay powered via the app) and faster 48-minute charging on top of the standard DELTA 3 Ultra — for households that expect to add capacity over time.",
    images: [
      "images/delta-3-ultra-plus-real-1.png",
      "images/delta-3-ultra-plus-real-2.png",
      "images/delta-3-ultra-plus-real-3.png"
    ]
  },
  {
    id: "delta-pro-3",
    series: "DELTA_PRO",
    capacityTier: "2000PLUS",
    name: "DELTA Pro 3",
    tagline: "The flagship — chainable for whole-home, multi-day power.",
    capacityWh: 4096,
    capacityLabel: "4,096Wh (expandable to 48kWh)",
    outputW: 4000,
    outputLabel: "4,000W (6,000W X-Boost)",
    chargeTime: "50 min charge to 80%, continuous output while charging",
    weight: "126 lb",
    price: 2299,
    useCase: "Whole-home & off-grid properties",
    badge: "Flagship",
    description: "120V and 240V output in a single unit, capable of powering a 3-ton central AC. Retains 80% capacity even after 4,000 cycles. UL9540 certified with eligibility for Residential Clean Energy Credit rebates.",
    images: [
      "images/delta-pro-3-real-1.png",
      "images/delta-pro-3-real-2.png",
      "images/delta-pro-3-real-3.png",
      "images/delta-pro-3-real-4.png"
    ]
  },
  {
    id: "delta-pro-ultra",
    series: "DELTA_PRO",
    capacityTier: "2000PLUS",
    name: "DELTA Pro Ultra",
    tagline: "Whole-home backup power built to replace a gas generator.",
    capacityWh: 6144,
    capacityLabel: "6,144Wh (expandable to 90kWh)",
    outputW: 7200,
    outputLabel: "7.2-21.6kW with up to 3 inverters",
    chargeTime: "0ms online-UPS transfer time",
    weight: "186 lb (inverter + battery)",
    price: 3799,
    useCase: "Whole-home & off-grid properties",
    badge: "UL 9540 Certified",
    description: "The only portable power station certified to both UL1973 and UL9540. Auto-switchover with EcoFlow Smart Home Panel, 5 charging options, and self-heating battery for reliable operation below 32°F.",
    images: [
      "images/delta-pro-ultra-real-1.png",
      "images/delta-pro-ultra-real-2.png"
    ]
  },
  {
    id: "delta-pro-ultra-x",
    series: "DELTA_PRO",
    capacityTier: "2000PLUS",
    name: "DELTA Pro Ultra X",
    tagline: "EcoFlow's largest system — 100% whole-home power.",
    capacityWh: 12000,
    capacityLabel: "12,000Wh starting (expandable to 180kWh)",
    outputW: 12000,
    outputLabel: "12,000W (expandable to 36,000W with 3 units)",
    chargeTime: "20ms auto switchover, plug & play install in 7 days",
    weight: "Inverter + 2 batteries (ships as a set)",
    price: 7599,
    useCase: "Whole-home & multi-property backup",
    badge: "Maximum Configuration",
    description: "Ships as an inverter plus two 6,000Wh battery packs. Delivers 12-36kW output — enough to run a 5-ton AC. Save up to $6,000/year with a 3-year ROI, installed in as little as 7 days.",
    images: [
      "images/delta-pro-ultra-x-real-1.png",
      "images/delta-pro-ultra-x-real-2.png",
      "images/delta-pro-ultra-x-real-3.png"
    ]
  },
  {
    id: "trail-200",
    series: "TRAIL",
    capacityTier: "UNDER500",
    name: "TRAIL 200 DC",
    tagline: "The lightest way to keep essentials charged in the backcountry.",
    capacityWh: 192,
    capacityLabel: "192Wh (60,000mAh)",
    outputW: 220,
    outputLabel: "220W DC-only",
    chargeTime: "~1.5 hr full charge",
    weight: "4.03 lb",
    price: 99,
    useCase: "Hiking & ultralight camping",
    badge: "Ultralight",
    description: "DC-only, no bulky AC inverter — built purely for phones, headlamps, cameras, and small gear on trips where every ounce counts. 90% gear compatibility with zero wasted energy.",
    images: [
      "images/trail-200-real-1.png",
      "images/trail-200-real-2.png",
      "images/trail-200-real-3.png"
    ]
  },
  {
    id: "trail-300",
    series: "TRAIL",
    capacityTier: "UNDER500",
    name: "TRAIL 300 DC",
    tagline: "The flagship TRAIL — more ports, more capacity, still pocket-light.",
    capacityWh: 288,
    capacityLabel: "288Wh (90,000mAh)",
    outputW: 300,
    outputLabel: "300W DC-only",
    chargeTime: "~2 hr full charge",
    weight: "5.69 lb",
    price: 139,
    useCase: "Camping, tailgating & group trips",
    badge: null,
    description: "Charges up to 5 devices at once with fast PD 3.1 USB-C ports — the practical choice for groups who don't want to fight over one charger. Drop-proof, fire-resistant construction.",
    images: [
      "images/trail-300-real-1.png",
      "images/trail-300-real-2.png",
      "images/trail-300-real-3.png"
    ]
  },
  {
    id: "trail-plus-300",
    series: "TRAIL",
    capacityTier: "UNDER500",
    name: "TRAIL Plus 300 DC",
    tagline: "TRAIL 300, plus a built-in light and detachable cable handle.",
    capacityWh: 288,
    capacityLabel: "288Wh (80,000mAh)",
    outputW: 300,
    outputLabel: "300W DC-only",
    chargeTime: "~2 hr full charge",
    weight: "4.98 lb",
    price: 179,
    useCase: "Tent camping & lifestyle trips",
    badge: "Most Versatile TRAIL",
    description: "Adds a built-in multi-function camping light and a detachable 140W cable handle — genuinely useful extras for tent nights and campsite hangouts.",
    images: [
      "images/trail-plus-300-real-1.png"
    ]
  }
];

// Power Kits — bundled combos (power station + solar panel/battery/accessories).
const BUNDLES = [
  {
    id: "kit-weekend-camper",
    name: "Weekend Camper Kit",
    tagline: "RIVER 3 + 45W solar panel + waterproof carry bag",
    productId: "river-3",
    accessories: ["45W Portable Solar Panel", "RIVER 3 Waterproof Bag"],
    price: 219,
    compareAt: 264,
    badge: "Great Starter Kit",
    useCase: "Camping",
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
    image: "images/kit-home-office-ups-1.png"
  },
  {
    id: "river-3-max",
    name: "RIVER 3 Max Bundle",
    tagline: "RIVER 3 Plus + EB300 Extra Battery — EcoFlow's own bundled config",
    productId: "river-3-plus",
    accessories: ["RIVER 3 EB300 Extra Battery (+286Wh)"],
    price: 299,
    compareAt: 394,
    badge: "New",
    useCase: "Extended Camping",
    image: null
  },
  {
    id: "river-3-max-plus",
    name: "RIVER 3 Max Plus Bundle",
    tagline: "RIVER 3 Plus + EB600 Extra Battery — maximum RIVER capacity",
    productId: "river-3-plus",
    accessories: ["RIVER 3 EB600 Extra Battery (+572Wh)"],
    price: 429,
    compareAt: 484,
    badge: "New",
    useCase: "Extended Camping & RV",
    image: "images/river-3-max-plus-kit-real-1.png"
  },
  {
    id: "kit-everyday-backup",
    name: "Everyday Backup Kit",
    tagline: "DELTA 2 + 220W solar panel — the most popular combo",
    productId: "delta-2",
    accessories: ["NextGen 220W Bifacial Solar Panel"],
    price: 719,
    compareAt: 758,
    badge: "Most Popular",
    useCase: "Home Backup",
    image: "images/kit-everyday-backup-1.png"
  },
  {
    id: "kit-expandable-starter",
    name: "Expandable Starter Kit",
    tagline: "DELTA 3 Plus + Extra Battery — grow capacity as you need it",
    productId: "delta-3-plus",
    accessories: ["DELTA 3 Series Extra Battery (+1,024Wh)"],
    price: 989,
    compareAt: 1038,
    badge: null,
    useCase: "Growing Households",
    image: "images/kit-expandable-starter-1.png"
  },
  {
    id: "kit-serious-backup",
    name: "Serious Backup Kit",
    tagline: "DELTA 2 Max + 400W solar panel for faster, greener recharge",
    productId: "delta-2-max",
    accessories: ["400W Portable Solar Panel"],
    price: 1399,
    compareAt: 1498,
    badge: null,
    useCase: "Home Backup",
    image: "images/kit-serious-backup-1.png"
  },
  {
    id: "kit-off-grid",
    name: "Off-Grid Living Kit",
    tagline: "DELTA Pro 3 + 400W solar panel + Smart Extra Battery",
    productId: "delta-pro-3",
    accessories: ["400W Portable Solar Panel", "DELTA Pro 3 Extra Battery (+4,096Wh)"],
    price: 4599,
    compareAt: 4767,
    badge: "Maximum Off-Grid",
    useCase: "Off-Grid Properties",
    image: "images/kit-off-grid-1.png"
  }
];

// Extra batteries, cases, carts, panels, and power management accessories — sold standalone
const ACCESSORIES = [
  {
    id: "river-3-extra-battery-eb300",
    category: "battery",
    name: "RIVER 3 Extra Battery (EB300, 286Wh)",
    tagline: "Compact capacity boost for RIVER 3 and RIVER 3 Plus.",
    price: 149,
    compatibleWith: ["river-3", "river-3-plus"],
    images: ["images/river-3-extra-battery-1.png"]
  },
  {
    id: "river-3-extra-battery-eb600",
    category: "battery",
    name: "RIVER 3 Extra Battery (EB600, 572Wh)",
    tagline: "Bigger capacity boost — expands RIVER 3 Plus up to 858Wh total.",
    price: 239,
    compatibleWith: ["river-3", "river-3-plus"],
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
    images: ["images/river-3-waterproof-bag-1.png"]
  },
  {
    id: "river-3-tool-pegboard",
    category: "case",
    name: "RIVER 3 Plus Tool Pegboard",
    tagline: "Mount tools and gear directly to your RIVER 3 Plus.",
    price: 36,
    compatibleWith: ["river-3-plus"],
    images: ["images/river-3-tool-pegboard-real-1.png"]
  },
  {
    id: "delta-2-extra-battery",
    category: "battery",
    name: "DELTA 2 Smart Extra Battery",
    tagline: "Expand DELTA 2 up to 3kWh total capacity.",
    price: 279,
    compatibleWith: ["delta-2"],
    images: ["images/delta-2-extra-battery-1.png"]
  },
  {
    id: "delta-2-max-extra-battery",
    category: "battery",
    name: "DELTA 2 Max Extra Battery",
    tagline: "Expand DELTA 2 Max up to 6.1kWh total capacity.",
    price: 949,
    compatibleWith: ["delta-2-max"],
    images: ["images/delta-2-max-extra-battery-1.png"]
  },
  {
    id: "delta-3-extra-battery",
    category: "battery",
    name: "DELTA 3 Series Smart Extra Battery",
    tagline: "1,024Wh battery for DELTA 3 and DELTA 3 Plus — expandable up to 5kWh total.",
    price: 389,
    compatibleWith: ["delta-3-classic", "delta-3", "delta-3-plus", "delta-2"],
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
    tagline: "2,048Wh battery for DELTA 3 Max Plus and DELTA 3 Ultra Plus — 25% smaller than the DELTA 2 Max equivalent.",
    price: 799,
    compatibleWith: ["delta-3-max-plus", "delta-3-ultra-plus"],
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
    tagline: "Expand DELTA Pro up to 10.8kWh with up to two batteries — ~30% more affordable than a same-capacity station.",
    price: 1149,
    compatibleWith: ["delta-pro"],
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
    images: ["images/delta-trolley-1.png"]
  },
  {
    id: "delta-pro-ultra-trolley",
    category: "cart",
    name: "DELTA Pro Ultra Trolley",
    tagline: "Purpose-built cart for the DELTA Pro Ultra's weight and stack height.",
    price: 219,
    compatibleWith: ["delta-pro-ultra", "delta-pro-ultra-x"],
    images: ["images/delta-pro-ultra-trolley-1.png"]
  },
  {
    id: "smart-home-panel-2",
    category: "panel",
    name: "Smart Home Panel 2",
    tagline: "12-circuit intelligent subpanel with 20ms auto switchover. Installation required.",
    price: 1429,
    compatibleWith: ["delta-pro-3", "delta-pro-ultra"],
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
    tagline: "Command center with 32 smart circuits — under 20ms seamless backup, saves up to $6,000/year, extends backup time up to 42%.",
    price: 2849,
    compatibleWith: ["delta-pro-ultra-x", "delta-pro-ultra"],
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
    images: ["images/alternator-charger-500w-real-1.png"]
  },
  {
    id: "alternator-charger-800w",
    category: "charger",
    name: "800W Alternator Charger",
    tagline: "Charge 1kWh in just 1.3 hours while you drive.",
    price: 255,
    compatibleWith: ["delta-3-plus", "delta-2-max"],
    images: ["images/alternator-charger-800w-real-1.png"]
  },
  {
    id: "trail-waterproof-case",
    category: "case",
    name: "TRAIL DC Series Waterproof Bag",
    tagline: "Keep your TRAIL station dry on fishing or kayak trips.",
    price: 42,
    compatibleWith: ["trail-200", "trail-300", "trail-plus-300"],
    images: ["images/trail-waterproof-case-1.png"]
  },
  {
    id: "solar-extension-cable",
    category: "cable",
    name: "Solar Extension Cable",
    tagline: "Extend the reach between your panel and power station.",
    price: 27,
    compatibleWith: [],
    images: ["images/solar-extension-cable-real-1.png"]
  }
];

// Portable solar panels — shared across the whole lineup
const SOLAR_PANELS = [
  {
    id: "solar-45w",
    name: "45W Portable Solar Panel",
    tagline: "Ultralight Type-C panel for TRAIL and RIVER 3.",
    watts: 45,
    price: 75,
    compatibleWith: ["trail-200", "trail-300", "trail-plus-300", "river-3"],
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
    images: [
      "images/solar-60w-real-1.png",
      "images/solar-60w-real-2.png",
      "images/solar-60w-real-3.png"
    ]
  },
  {
    id: "solar-100w-flexible",
    name: "100W Flexible Solar Panel",
    tagline: "258° flexible — bends to fit curved surfaces like RV roofs.",
    watts: 100,
    price: 189,
    compatibleWith: [],
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
    tagline: "Modular — chain up to 8 panels (1000W total) for scalable solar arrays.",
    watts: 125,
    price: 239,
    compatibleWith: ["delta-pro-ultra", "delta-pro-ultra-x"],
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
    tagline: "For permanent installs — Class B vans and home roof mounting.",
    watts: 175,
    price: 199,
    compatibleWith: [],
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
    tagline: "The all-rounder — home backup, road trips, and everything between.",
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

// Service & Benefits trust badges — shown on every product detail page (matches EcoFlow's own site pattern)
const SERVICE_BENEFITS = [
  { icon: "shield", label: "30-Day Returns" },
  { icon: "truck", label: "5-7 Day Delivery" },
  { icon: "chat", label: "Live Chat Support" },
  { icon: "tool", label: "Manufacturer Warranty" }
];
