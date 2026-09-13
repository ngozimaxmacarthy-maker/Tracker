// ─────────────────────────────────────────────────────────────────────────────
// Reset clocks.
//
// Every perk lives inside a period. Redemptions are stored against that
// period's key, so when the calendar rolls the credit is automatically open
// again — there is no "reset" button to forget to press, and a checkmark from
// August can never make September look handled.
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 86400000;

export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtDate = (d) => `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
export const fmtShort = (d) => `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`;

/**
 * The period a perk is currently in.
 * Returns { key, start, end, label } where `end` is exclusive — the instant the
 * credit resets. Returns null when the perk has no live period (an anniversary
 * date that has not been recorded, or a one-time deadline already past).
 */
export function periodFor(perk, now, settings = {}) {
  const today = startOfDay(now);
  const y = today.getFullYear();
  const m = today.getMonth();

  switch (perk.cadence) {
    case "monthly": {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 1);
      return { key: `${y}-${String(m + 1).padStart(2, "0")}`, start, end, label: `${MONTH_ABBR[m]} ${y}` };
    }
    case "quarterly": {
      const q = Math.floor(m / 3);
      const start = new Date(y, q * 3, 1);
      const end = new Date(y, q * 3 + 3, 1);
      return { key: `${y}-Q${q + 1}`, start, end, label: `Q${q + 1} ${y}` };
    }
    case "semiannual": {
      const h = m < 6 ? 0 : 1;
      const start = new Date(y, h * 6, 1);
      const end = new Date(y, h * 6 + 6, 1);
      return { key: `${y}-H${h + 1}`, start, end, label: `${h === 0 ? "Jan–Jun" : "Jul–Dec"} ${y}` };
    }
    case "annual": {
      if (perk.reset === "account_anniversary") {
        const anniv = settings.anniversaries?.[perk.card];
        if (!anniv) return null; // UI prompts for the date instead of guessing.
        const [, am, ad] = anniv.split("-").map(Number);
        let start = new Date(y, am - 1, ad);
        if (start > today) start = new Date(y - 1, am - 1, ad);
        const end = new Date(start.getFullYear() + 1, am - 1, ad);
        return { key: `AY${start.getFullYear()}`, start, end, label: `Card year from ${fmtShort(start)}` };
      }
      return { key: `${y}`, start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1), label: `${y}` };
    }
    case "one_time": {
      const end = perk.deadline ? new Date(parseYmd(perk.deadline).getTime() + DAY) : new Date(y + 50, 0, 1);
      return { key: "once", start: new Date(2000, 0, 1), end, label: "One-time offer" };
    }
    case "every_4_years": {
      const last = settings.globalEntry?.usedOn ? parseYmd(settings.globalEntry.usedOn) : null;
      if (!last) return { key: "open", start: new Date(2000, 0, 1), end: null, label: "Available now" };
      const end = new Date(last.getFullYear() + 4, last.getMonth(), last.getDate());
      return { key: `cycle-${last.getFullYear()}`, start: last, end, label: `Cycle from ${fmtDate(last)}` };
    }
    default:
      return null;
  }
}

/** Whole days until the period resets. null when the period never closes. */
export function daysLeft(period, now) {
  if (!period?.end) return null;
  return Math.max(0, Math.ceil((period.end - startOfDay(now)) / DAY));
}

/** The dollar value of a perk inside a given period (Uber Cash is $35 in December). */
export function valueIn(perk, period) {
  if (perk.valueByMonth && period) {
    const override = perk.valueByMonth[period.start.getMonth() + 1];
    if (override != null) return override;
  }
  return perk.value ?? 0;
}

/**
 * Every period of a perk that both started and closed inside the given calendar
 * year. Used to measure what actually leaked — value from windows that are shut.
 */
export function closedPeriodsInYear(perk, year, now, settings = {}) {
  const out = [];
  const today = startOfDay(now);
  if (perk.cadence === "one_time" || perk.cadence === "every_4_years") return out;

  const probes = [];
  if (perk.cadence === "monthly") for (let i = 0; i < 12; i++) probes.push(new Date(year, i, 15));
  else if (perk.cadence === "quarterly") for (let i = 0; i < 4; i++) probes.push(new Date(year, i * 3 + 1, 15));
  else if (perk.cadence === "semiannual") for (let i = 0; i < 2; i++) probes.push(new Date(year, i * 6 + 1, 15));
  else probes.push(new Date(year, 5, 15));

  const seen = new Set();
  for (const probe of probes) {
    const p = periodFor(perk, probe, settings);
    if (!p || seen.has(p.key)) continue;
    seen.add(p.key);
    if (p.end && p.end <= today) out.push(p);
  }
  return out;
}

/** Sort key: soonest deadline first, then biggest dollars at stake. */
export function urgencyRank(daysRemaining, atRisk) {
  const d = daysRemaining == null ? 9999 : daysRemaining;
  return d * 1000 - Math.min(atRisk, 999);
}

export function urgencyTone(daysRemaining) {
  if (daysRemaining == null) return { color: "#52627A", fill: "#8296B4", bg: "#F1F4F9", label: "no deadline" };
  if (daysRemaining <= 3)  return { color: "#B42318", fill: "#D92D20", bg: "#FEECEA", label: "closing" };
  if (daysRemaining <= 10) return { color: "#C2410C", fill: "#EA7317", bg: "#FFF3E8", label: "soon" };
  if (daysRemaining <= 30) return { color: "#8A6A00", fill: "#FFC400", bg: "#FFF8DC", label: "this period" };
  return { color: "#1B5CF3", fill: "#1B5CF3", bg: "#EAF1FE", label: "time remains" };
}
