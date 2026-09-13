// ─────────────────────────────────────────────────────────────────────────────
// SOURCE OF TRUTH — credit card perks.
//
// Last verified: September 2026. Card terms change constantly (Amex refreshed
// Platinum in late 2025, Chase refreshed Sapphire Preferred in June 2026, Bilt
// relaunched in February 2026). Re-verify this file annually — the Setup tab
// surfaces a reminder when VERIFIED_ON goes stale.
// ─────────────────────────────────────────────────────────────────────────────

export const VERIFIED_ON = "2026-09-01";
export const OWNER = "Ngozi";

export const CARDS = [
  { id: "amex_platinum",     name: "Amex Platinum",                issuer: "American Express", fee: 895, tier: "personal", note: "" },
  { id: "united_explorer",   name: "United Explorer",              issuer: "Chase",            fee: 150, tier: "personal", note: "" },
  { id: "delta_gold_biz",    name: "Delta SkyMiles Gold Business", issuer: "American Express", fee: 150, tier: "business", note: "LLC card — fee and credits are business expenses" },
  { id: "csp",               name: "Chase Sapphire Preferred",     issuer: "Chase",            fee:  95, tier: "personal", note: "Refreshed June 2026" },
  { id: "bilt_obsidian",     name: "Bilt Obsidian",                issuer: "Column N.A.",      fee:  95, tier: "personal", note: "Bilt Card 2.0, Feb 2026" },
  { id: "jetblue",           name: "JetBlue Card",                 issuer: "Barclays",         fee:   0, tier: "personal", note: "Base tier, not Plus" },
  { id: "apple_card",        name: "Apple Card",                   issuer: "Goldman Sachs",    fee:   0, tier: "personal", note: "" },
  { id: "bofa_cash",         name: "BofA Cash Rewards",            issuer: "Bank of America",  fee:   0, tier: "personal", note: "" },
  { id: "amazon_prime_visa", name: "Amazon Prime Visa",            issuer: "Chase",            fee:   0, tier: "personal", note: "Requires Prime membership" },
  { id: "freedom_unlimited", name: "Chase Freedom Unlimited",      issuer: "Chase",            fee:   0, tier: "personal", note: "" },
];

// Card-year credits turn over on the account anniversary. The owner gave the
// month only, so the 1st stands in: the countdown runs slightly early, which is
// the safe direction to be wrong in. Replace with exact dates when known.
export const DEFAULT_ANNIVERSARIES = {
  csp: "2025-12-01",
  united_explorer: "2026-03-01",
};

export const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));

// cadence drives the reset clock. See lib/periods.js.
export const PERKS = [
  // ── MONTHLY — resets the 1st, never rolls over. This is where money leaks. ──
  {
    id: "amex_entertainment", card: "amex_platinum", name: "Digital entertainment credit",
    value: 25, cadence: "monthly", enrollment: true,
    note: "Hulu, Disney+, ESPN+, Peacock, Paramount+, YouTube Premium/TV, NYT, WSJ.",
  },
  {
    id: "amex_uber_cash", card: "amex_platinum", name: "Uber Cash",
    value: 15, cadence: "monthly", valueByMonth: { 12: 35 },
    note: "Platinum must be set as a payment method in the Uber app. Jumps to $35 in December.",
  },
  {
    id: "amex_walmart", card: "amex_platinum", name: "Walmart+ membership",
    value: 20, cadence: "monthly", enrollment: true, disputed: true,
    note: "Covers the monthly Walmart+ cost.",
    verifyNote: "Amex publishes this as $155 a year (about $12.95/mo — the cost of a monthly Walmart+ plan), not $20/mo. Your $20 figure is kept until you check a statement, but it may be overstating this credit by about $85 a year.",
  },
  {
    id: "amex_equinox", card: "amex_platinum", name: "Equinox credit",
    value: 25, cadence: "monthly", enrollment: true, needsVerification: true, dormant: true,
    dormantNote: "No Equinox membership billing this card, so this credit cannot pay. Excluded from the monthly total until that changes.",
    note: "Equinox club membership or the Equinox+ app, paid directly with the card. Up to $300 a calendar year. Spa services, day passes and personal training do not count.",
  },
  {
    id: "united_instacart", card: "united_explorer", name: "Instacart credit",
    value: 10, cadence: "monthly", needsVerification: true,
    note: "Purchases made directly through Instacart. Up to $120 a calendar year.",
  },
  {
    id: "united_rideshare", card: "united_explorer", name: "Rideshare credit",
    value: 5, cadence: "monthly", needsVerification: true,
    note: "Posts on use. Up to $60 a calendar year. This is your third rideshare credit — Platinum and Delta each have their own, and one ride can only feed one of them.",
  },
  {
    id: "delta_rideshare", card: "delta_gold_biz", name: "Rideshare credit",
    value: 10, cadence: "monthly",
    note: "US rideshare purchases. Separate from the Platinum Uber Cash credit.",
  },
  {
    id: "csp_doordash", card: "csp", name: "DoorDash credit",
    value: 10, cadence: "monthly", needsVerification: true,
    note: "Non-restaurant orders only \u2014 grocery, convenience, retail. Requires an active DashPass and the offer has to be toggled on before you submit the order.",
  },
  {
    id: "bilt_spend", card: "bilt_obsidian", name: "Spend $899 on the card",
    value: 0, cadence: "monthly", nonCash: true, actionLabel: "Hit $899",
    note: "Bilt sets your housing rate from non-housing spend. Clearing $899 keeps the HOA payment earning 1.25x instead of drifting toward zero \u2014 no statement credit, but the most expensive line here to miss.",
  },
  {
    id: "bofa_category", card: "bofa_cash", name: "Select 3% category",
    value: 0, cadence: "monthly", nonCash: true, actionLabel: "Category chosen",
    note: "Must be actively selected each month or it stays on last month's pick.",
  },

  // ── QUARTERLY — resets Jan 1 / Apr 1 / Jul 1 / Oct 1 ──
  {
    id: "amex_resy", card: "amex_platinum", name: "Resy dining credit",
    value: 100, cadence: "quarterly", enrollment: true,
    note: "Any US restaurant on the Resy platform. No reservation required.",
  },
  {
    id: "amex_lululemon", card: "amex_platinum", name: "lululemon credit",
    value: 75, cadence: "quarterly", enrollment: true,
    note: "US stores (excluding outlets) and lululemon.com.",
  },

  // ── SEMIANNUAL — resets Jan 1 and Jul 1 ──
  {
    id: "amex_hotel", card: "amex_platinum", name: "Hotel credit (FHR / Hotel Collection)",
    value: 300, cadence: "semiannual",
    note: "Prepaid Fine Hotels + Resorts, or Hotel Collection with a 2-night minimum. Book through Amex Travel.",
  },
  {
    id: "bilt_hotel", card: "bilt_obsidian", name: "Bilt Travel hotel credit",
    value: 50, cadence: "semiannual",
    note: "2-night minimum, booked through the Bilt Travel portal.",
  },

  // ── ANNUAL — calendar year unless noted ──
  {
    id: "amex_airline", card: "amex_platinum", name: "Airline incidental credit",
    value: 200, cadence: "annual", reset: "calendar_year", enrollment: true,
    note: "Select one airline in your Amex account. Baggage and seat fees — not airfare.",
  },
  {
    id: "amex_clear", card: "amex_platinum", name: "CLEAR+ credit",
    value: 209, cadence: "annual", reset: "calendar_year",
    note: "Subject to auto-renewal.",
  },
  {
    id: "amex_oura", card: "amex_platinum", name: "Oura Ring credit",
    value: 200, cadence: "annual", reset: "calendar_year",
    note: "Hardware only — does not cover the membership.",
  },
  {
    id: "amex_uber_one", card: "amex_platinum", name: "Uber One membership",
    value: 120, cadence: "annual", reset: "calendar_year",
    note: "Subject to auto-renewal.",
  },
  {
    id: "delta_stays", card: "delta_gold_biz", name: "Delta Stays credit",
    value: 150, cadence: "annual", reset: "calendar_year",
    note: "Prepaid hotel or vacation rental through Delta Stays on delta.com.",
  },
  {
    id: "delta_flight", card: "delta_gold_biz", name: "Delta flight credit",
    value: 200, cadence: "annual", reset: "calendar_year", requiresSpend: 10000,
    note: "Locked until $10,000 of calendar-year spend posts to this card.",
  },
  {
    id: "csp_hotel", card: "csp", name: "Chase Travel hotel credit",
    value: 100, cadence: "annual", reset: "account_anniversary",
    note: "Must be paid in cash, not points. Does not apply to 5x portal bookings.",
  },
  {
    id: "united_club", card: "united_explorer", name: "United Club one-time passes",
    value: 0, cadence: "annual", reset: "calendar_year", nonCash: true, quantity: 2,
    actionLabel: "Passes used",
    note: "Two lounge passes per calendar year.",
  },
  {
    id: "united_hotels", card: "united_explorer", name: "United Hotels credit",
    value: 100, cadence: "annual", reset: "account_anniversary", needsVerification: true,
    note: "$50 back on each of your first and second prepaid stays booked through United Hotels. Up to $100 per anniversary year — book two separate stays, not one big one.",
  },
  {
    id: "united_travelbank", card: "united_explorer", name: "United TravelBank credit",
    value: 100, cadence: "annual", reset: "calendar_year", requiresSpend: 10000, needsVerification: true,
    note: "$100 of TravelBank cash for United or United Express flights, after $10,000 of calendar-year spend on the card.",
  },
  {
    id: "united_jsx", card: "united_explorer", name: "JSX flight credits",
    value: 100, cadence: "annual", reset: "calendar_year",
    note: "Flights booked directly with JSX.",
  },

  // ── ONE-TIME, HARD DEADLINE ──
  {
    id: "csp_appletv", card: "csp", name: "Apple TV subscription",
    value: 99, cadence: "one_time", deadline: "2026-12-31",
    note: "12 months free. Must be activated by Dec 31, 2026 — it does not come back.",
  },

  {
    id: "csp_dashpass", card: "csp", name: "DoorDash DashPass membership",
    value: 0, cadence: "one_time", deadline: "2027-12-31", nonCash: true,
    actionLabel: "Activated", needsVerification: true,
    note: "Complimentary DashPass through Dec 31, 2027. Activation is one click and then it is done — but it has to be clicked.",
  },

  // ── EVERY 4 YEARS, MUTUALLY EXCLUSIVE ACROSS THREE CARDS ──
  {
    id: "global_entry", card: "multiple", name: "Global Entry / TSA PreCheck / NEXUS",
    value: 120, cadence: "every_4_years",
    eligibleCards: ["amex_platinum", "csp", "united_explorer"],
    note: "Three cards offer this, but one application can only be reimbursed once. Record which card paid so the other two aren't wasted across the cycle.",
  },
];

export const PERK_BY_ID = Object.fromEntries(PERKS.map(p => [p.id, p]));

// One-time setup gates. An unenrolled credit silently pays out nothing, all year.
export const SETUP_TASKS = [
  { id: "s_ent",   card: "amex_platinum",  label: "Enroll in the digital entertainment credit",     detail: "Amex account → Benefits → Digital Entertainment. Pick your streaming/news subscriptions." },
  { id: "s_wmt",   card: "amex_platinum",  label: "Enroll in Walmart+",                             detail: "Amex account → Benefits → Walmart+. Statement credit only applies once enrolled." },
  { id: "s_resy",  card: "amex_platinum",  label: "Enroll in the Resy dining credit",               detail: "Amex account → Benefits → Resy. $100/quarter is the single largest recurring credit after the hotel." },
  { id: "s_lulu",  card: "amex_platinum",  label: "Enroll in the lululemon credit",                 detail: "Amex account → Benefits → lululemon." },
  { id: "s_uber",  card: "amex_platinum",  label: "Add Platinum as a payment method in the Uber app", detail: "Uber Cash will not load until the card is attached to the Uber account." },
  { id: "s_air",   card: "amex_platinum",  label: "Select your airline for incidental credits",     detail: "Amex account → Airline Fee Credit. One airline per calendar year — pick before you fly." },
  { id: "s_equinox", card: "amex_platinum",  label: "Only if you join Equinox: put the Platinum on file", detail: "Worth $25 a month, but only once Equinox bills this card. Enrolment must also precede the first charge \u2014 it does not backdate." },
  { id: "s_dash",   card: "csp",             label: "Activate the DoorDash DashPass membership", detail: "Free through Dec 31, 2027, and the $10 monthly DoorDash credit does not pay without it." },
  { id: "s_prime", card: "amazon_prime_visa", label: "Confirm the Prime membership is active",      detail: "The 5% Amazon/Whole Foods rate depends on an active Prime membership." },
];

// Spend thresholds worth watching — these unlock value, not statement credits.
export const SPEND_THRESHOLDS = [
  { card: "delta_gold_biz",  target: 10000, reward: "$200 Delta flight credit unlocks", unlocksPerk: "delta_flight" },
  { card: "united_explorer", target: 10000, reward: "$100 United TravelBank credit unlocks", unlocksPerk: "united_travelbank" },
  { card: "united_explorer", target: 20000, reward: "10,000-mile award flight discount" },
];

// Cards with nothing to track. Listed so they are visibly accounted for rather
// than looking like an omission.
export const EARN_ONLY = {
  jetblue:           "3x JetBlue, 2x dining and grocery, 1x everything else. 50% off inflight food and drink, 10% points back on award redemptions. No free checked bag — that is Plus-only.",
  apple_card:        "Daily Cash. No expiring credits.",
  amazon_prime_visa: "5% at Amazon and Whole Foods while Prime is active.",
  freedom_unlimited: "Flat 1.5% back. No rotating categories — that is the Freedom Flex.",
};

// Standing benefits on cards that DO have trackable credits. Nothing resets, so
// there is nothing to check off \u2014 but they belong on the card's page so the
// fee math is not read as "credits only."
export const ALWAYS_ON = {
  united_explorer: [
    "First checked bag free for you and one companion on United flights paid for with the card \u2014 about $70 a roundtrip for two people, and quietly the largest benefit on this card.",
    "25% back as a statement credit on United inflight food, drink and Wi-Fi.",
    "Priority boarding for you and companions on the same reservation.",
    "No foreign transaction fees.",
  ],
  amex_platinum: [
    "Centurion Lounge, Priority Pass and Delta Sky Club access (Sky Club only when flying Delta).",
    "Fine Hotels + Resorts benefits: room upgrades, daily breakfast, late checkout.",
  ],
  csp: [
    "5x on Chase Travel, 3x dining, 3x gas and EV charging, 3x streaming and online groceries.",
    "3x on vacation rentals booked direct \u2014 Airbnb, Vrbo and similar.",
    "Primary rental car coverage, trip delay and cancellation reimbursement, baggage delay insurance.",
    "No foreign transaction fees.",
  ],
  delta_gold_biz: [
    "First checked bag free on Delta flights for you and up to eight companions on the same reservation.",
    "Main Cabin 1 priority boarding.",
  ],
  bilt_obsidian: [
    "Rent, mortgage and HOA earn points with no transaction fee \u2014 the reason the card exists.",
    "4x hotels and 3x flights through Bilt Travel, 3x dining (up to 6x at Bilt partners), 3x groceries.",
    "The housing rate is set by non-housing spend: $899 a month is the threshold for the full 1.25x.",
  ],
};

export const CADENCE_META = {
  monthly:       { label: "Monthly",     color: "#C2410C", fill: "#EA7317", bg: "#FFF3E8", order: 0, per: "mo" },
  quarterly:     { label: "Quarterly",   color: "#8A6A00", fill: "#FFC400", bg: "#FFF8DC", order: 1, per: "qtr" },
  semiannual:    { label: "Semiannual",  color: "#0369A1", fill: "#0EA5E9", bg: "#E6F5FE", order: 2, per: "half" },
  annual:        { label: "Annual",      color: "#1B5CF3", fill: "#1B5CF3", bg: "#EAF1FE", order: 3, per: "yr" },
  one_time:      { label: "One-time",    color: "#4F46E5", fill: "#6366F1", bg: "#EEF0FE", order: 4, per: "once" },
  every_4_years: { label: "Every 4 yrs", color: "#52627A", fill: "#8296B4", bg: "#F1F4F9", order: 5, per: "4 yrs" },
};
