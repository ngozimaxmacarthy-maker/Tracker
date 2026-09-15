// Reset clocks. This mirrors the logic inside the pages exactly — a tick is
// filed under the period it belongs to, so a new month finds no rows and the
// list is open again. Nothing ever has to be cleared.

const DAY = 86400000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const fmtDate = (d) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

/**
 * The period an item is currently in.
 * `end` is exclusive — the instant the credit resets — or null when it never does.
 */
export function periodOf(item, now = new Date()) {
  const today = startOfDay(now);
  const Y = today.getFullYear();
  const M = today.getMonth();

  switch (item.cad) {
    case "m":
      return { key: `${Y}-${String(M + 1).padStart(2, "0")}`, end: new Date(Y, M + 1, 1) };
    case "q": {
      const q = Math.floor(M / 3);
      return { key: `${Y}-Q${q + 1}`, end: new Date(Y, q * 3 + 3, 1) };
    }
    case "h": {
      const h = M < 6 ? 0 : 1;
      return { key: `${Y}-H${h + 1}`, end: new Date(Y, h * 6 + 6, 1) };
    }
    case "y":
      return { key: String(Y), end: new Date(Y + 1, 0, 1) };
    case "a": {
      const am = item.anniv - 1;
      let start = new Date(Y, am, 1);
      if (start > today) start = new Date(Y - 1, am, 1);
      return { key: `a${item.id}${start.getFullYear()}`,
               end: new Date(start.getFullYear() + 1, am, 1) };
    }
    case "o": {
      const [y, m, d] = item.by.split("-").map(Number);
      return { key: "once", end: new Date(y, m - 1, d + 1) };
    }
    default:
      return { key: "cycle", end: null };
  }
}

/** Whole days until the period resets; null when it never does. */
export function daysLeft(period, now = new Date()) {
  if (!period?.end) return null;
  return Math.max(0, Math.ceil((period.end - startOfDay(now)) / DAY));
}

/** What an item is worth inside a period — Uber Cash pays more in December. */
export function valueIn(item, period) {
  if (item.dec && period?.end && period.end.getMonth() === 0) return item.dec;
  return item.amt ?? 0;
}

/** Every distinct period key in play right now, for one round-trip to the database. */
export function currentKeys(items, now = new Date()) {
  return [...new Set(items.map((i) => periodOf(i, now).key))];
}
