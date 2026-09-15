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
  bofa: "BofA Cash Rewards",
};

export const ITEMS = [
  // ── Monthly. Where the money actually leaks. ──
  { id: "uber",    card: "plat",   name: "Uber Cash",                  amt: 15, cad: "m", dec: 35 },
  { id: "ent",     card: "plat",   name: "Digital entertainment",      amt: 25, cad: "m" },
  { id: "wmt",     card: "plat",   name: "Walmart+",                   amt: 20, cad: "m" },
  { id: "dride",   card: "delta",  name: "Rideshare",                  amt: 10, cad: "m" },
  { id: "insta",   card: "united", name: "Instacart",                  amt: 10, cad: "m" },
  { id: "uride",   card: "united", name: "Rideshare",                  amt:  5, cad: "m" },
  { id: "dashcr",  card: "csp",    name: "DoorDash credit",            amt: 10, cad: "m",
    note: "Non-restaurant orders only. Toggle the offer on before you submit." },
  { id: "bofa",    card: "bofa",   name: "Pick your 3% category",      amt:  0, cad: "m",
    note: "Stays on last month's pick until you change it." },
  { id: "bilt899", card: "bilt",   name: "Spend $899 on the Bilt card", amt: 0, cad: "m",
    note: "Keeps your HOA payment earning 1.25x. No credit attached, which is why it goes unnoticed." },

  // ── Quarterly ──
  { id: "resy", card: "plat", name: "Resy dining", amt: 100, cad: "q" },
  { id: "lulu", card: "plat", name: "lululemon",   amt:  75, cad: "q" },

  // ── Semiannual ──
  { id: "hotel", card: "plat", name: "Hotel credit",       amt: 300, cad: "h",
    note: "2-night minimum through Amex Travel." },
  { id: "bilth", card: "bilt", name: "Bilt Travel hotel",  amt:  50, cad: "h",
    note: "2-night minimum." },

  // ── Calendar year ──
  { id: "air",    card: "plat",   name: "Airline incidentals",  amt: 200, cad: "y" },
  { id: "clear",  card: "plat",   name: "CLEAR+",               amt: 209, cad: "y" },
  { id: "oura",   card: "plat",   name: "Oura Ring",            amt: 200, cad: "y" },
  { id: "uone",   card: "plat",   name: "Uber One",             amt: 120, cad: "y" },
  { id: "dstays", card: "delta",  name: "Delta Stays",          amt: 150, cad: "y" },
  { id: "jsx",    card: "united", name: "JSX flights",          amt: 100, cad: "y" },
  { id: "uclub",  card: "united", name: "United Club passes",   amt:   0, cad: "y" },
  { id: "dflt",   card: "delta",  name: "Delta flight credit",  amt: 200, cad: "y", gate: true },
  { id: "tbank",  card: "united", name: "United TravelBank",    amt: 100, cad: "y", gate: true },

  // ── Card anniversary. Month only is known; the 1st stands in, which runs the
  //    countdown slightly early — the safe direction. ──
  { id: "csph",  card: "csp",    name: "Chase Travel hotel", amt: 100, cad: "a", anniv: 12 },
  { id: "unith", card: "united", name: "United Hotels",      amt: 100, cad: "a", anniv:  3 },

  // ── One-time, hard deadline ──
  { id: "atv",  card: "csp", name: "Apple TV, 12 months free", amt: 99, cad: "o", by: "2026-12-31" },
  { id: "dash", card: "csp", name: "DoorDash DashPass",        amt:  0, cad: "o", by: "2027-12-31" },

  // ── Every four years, one card only ──
  { id: "ge", card: "plat", name: "Global Entry or PreCheck", amt: 120, cad: "4" },
];

export const MONTHLY = ITEMS.filter((i) => i.cad === "m");
export const BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
