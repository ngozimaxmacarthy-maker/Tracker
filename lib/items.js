// Canonical item list for the server side — the reminder reads this.
//
// The pages carry their own inline copy so they stay single-file and portable.
// `npm run check` diffs the two and fails loudly if they drift apart.
//
// cadence: m = monthly · q = quarterly · h = semiannual · y = calendar year
//          a = card anniversary · o = one-time deadline · 4 = every four years

export const CARDS = {
  plat: "Amex Platinum",
  united: "United Explorer",
  delta: "Delta Gold Business",
  csp: "Sapphire Preferred",
  bilt: "Bilt Obsidian",
};

export const ITEMS = [
  // ── Monthly. Where the money actually leaks. ──
  { id: "uber",    card: "plat",   name: "Uber Cash",                  amt: 15, cad: "m", dec: 35 },
  { id: "ent",     card: "plat",   name: "Digital entertainment",      amt: 25, cad: "m" },
  { id: "wmt",     card: "plat",   name: "Walmart+",                   amt: 14.10, cad: "m",
    note: "On autopay, so the charge and the credit both happen by themselves. Tick it to confirm, do not go and do it." },
  { id: "dride",   card: "delta",  name: "Rideshare",                  amt: 10, cad: "m" },
  { id: "insta",   card: "united", name: "Instacart",                  amt: 10, cad: "m",
    note: "United has this partnership ending 31 Dec 2027." },
  { id: "uride",   card: "united", name: "Rideshare",                  amt:  5, cad: "m" },
  { id: "dashcr",  card: "csp",    name: "DoorDash credit",            amt: 10, cad: "m",
    note: "Non-restaurant orders only. Toggle the offer on before you submit." },
  { id: "bilt899", card: "bilt",   name: "Spend $899 on the Bilt card", amt: 0, cad: "m",
    note: "Keeps your HOA payment earning 1.25x. No credit attached, which is why it goes unnoticed." },
  { id: "bcLyft",  card: "bilt",   name: "Bilt Cash to Lyft",          amt: 10, cad: "m",
    note: "Resets midnight PT on the 1st and does not roll over." },
  { id: "bcWalg",  card: "bilt",   name: "Bilt Cash to Walgreens",     amt: 10, cad: "m",
    note: "Resets midnight PT on the 1st and does not roll over." },
  { id: "bcGrub",  card: "bilt",   name: "Bilt Cash to Grubhub",       amt: 10, cad: "m",
    note: "Redeeming emails you a $10 promo code that dies at the end of the same month. Redeem it when you are about to order, not before." },

  // ── Quarterly ──
  { id: "resy", card: "plat", name: "Resy dining", amt: 100, cad: "q" },
  { id: "lulu", card: "plat", name: "lululemon",   amt:  75, cad: "q" },

  // ── Semiannual ──
  { id: "hotel", card: "plat", name: "Hotel credit",       amt: 300, cad: "h",
    note: "2-night minimum through Amex Travel. CHANGES JAN 1 2027: becomes the $600 Lodging Credit \u2014 Fine Hotels + Resorts picks up the same 2-night minimum The Hotel Collection already had, and prepaid Airbnb Luxe stays start counting. Still $300 per half." },
  { id: "bilth", card: "bilt", name: "Bilt Travel hotel",  amt:  50, cad: "h",
    note: "2-night minimum. CHANGES JAN 15 2027: becomes $100 of Bilt Cash paid on your cardmember anniversary instead of two $50 hotel credits \u2014 no booking, no night minimum. Sources disagree on whether existing cardholders are moved automatically; check before relying on it." },

  // ── Calendar year ──
  { id: "air",    card: "plat",   name: "Airline incidentals",  amt: 200, cad: "y",
    note: "Only incidental fees on your ONE selected airline, charged separately from the ticket. What counts is the CHARGE date, not the travel date \u2014 so paying seat or bag fees now on a 2027 Delta flight uses the 2026 credit. The San Diego trip is the obvious candidate. Excluded by the terms: airfare, award-ticket taxes, upgrades, gift cards, buying miles. Allow 6\u20138 weeks for the credit to post; a late-December charge still counts for 2026." },
  { id: "clear",  card: "plat",   name: "CLEAR+",               amt: 209, cad: "y" },
  { id: "oura",   card: "plat",   name: "Oura Ring",            amt: 200, cad: "y",
    note: "Waiting for the Black Friday price. Hardware only, and the credit dies Dec 31 \u2014 so buy in the sale window, not in late December." },
  { id: "uone",   card: "plat",   name: "Uber One",             amt: 120, cad: "y" },
  { id: "dstays", card: "delta",  name: "Delta Stays",          amt: 150, cad: "y",
    note: "Earmarked for the San Diego conference. Prepaid hotel or vacation rental booked through Delta Stays on delta.com \u2014 and it has to be booked and charged before Dec 31, not just travelled. Charge it to the Delta Gold Business \u2014 the credit lives on that card, so paying with the Platinum forfeits it. Flights on the Gold Business too: it carries the free checked bag and the spend counts toward the $10k threshold. Seats go on the Platinum, separately." },
  { id: "jsx",    card: "united", name: "JSX flights",          amt: 100, cad: "y",
    note: "JSX is a semi-private carrier: single seats on small jets out of private terminals, no TSA line. Mostly West and South routes; New York service is only due in Feb 2027. Probably unusable before this expires." },
  { id: "uclub1", card: "united", name: "United Club pass 1 of 2", amt: 0, cad: "y" },
  { id: "uclub2", card: "united", name: "United Club pass 2 of 2", amt: 0, cad: "y" },
  { id: "dflt",   card: "delta",  name: "Delta flight credit",  amt: 200, cad: "y", gate: true,
    note: "Unlocks at $10,000 of calendar-year spend on the Gold Business. Putting the San Diego flights and hotel on that card moves you toward it \u2014 worth checking the running total before booking elsewhere." },
  { id: "tbank",  card: "united", name: "United TravelBank",    amt: 100, cad: "y", gate: true },
  { id: "bcDrain", card: "bilt",  name: "Spend Bilt Cash down to $100", amt: 0, cad: "y",
    note: "Only $100 of Bilt Cash rolls into next year. Everything above that is forfeited on Dec 31." },

  // ── Card anniversary. Month only is known; the 1st stands in, which runs the
  //    countdown slightly early — the safe direction. ──
  { id: "csph",  card: "csp",    name: "Chase Travel hotel", amt: 100, cad: "a", anniv: 12 },
  { id: "unith", card: "united", name: "United Hotels",      amt: 100, cad: "a", anniv:  3,
    note: "$50 on your 1st prepaid stay and $50 on your 2nd, each $50 or more, booked directly through United Hotels. No night minimum \u2014 but one long booking still only earns $50." },

  // ── One-time, hard deadline ──
  { id: "atv",  card: "csp", name: "Apple TV, 12 months free", amt: 99, cad: "o", by: "2026-12-31" },
  { id: "dash", card: "csp", name: "DoorDash DashPass",        amt:  0, cad: "o", by: "2027-12-31" },
  { id: "udrain", card: "united", name: "Empty the United Explorer before downgrading", amt: 0, cad: "o", by: "2027-03-01",
    note: "Downgrading forfeits whatever is left. Still unused: both Club passes, the $100 JSX credit, and the $100 United Hotels credit for the card year that runs to March. The $150 fee posts at the March anniversary, and Chase normally refunds it if you product-change shortly after." },

  // ── Every four years, one card only ──
  { id: "ge", card: "plat", name: "Global Entry or PreCheck", amt: 120, cad: "4" },
];

export const MONTHLY = ITEMS.filter((i) => i.cad === "m");
export const BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
