import { readTicks } from "../lib/db.js";
import { ITEMS, MONTHLY, CARDS } from "../lib/items.js";
import { periodOf, daysLeft, valueIn, currentKeys, fmtDate } from "../lib/periods.js";

const TO = process.env.REMINDER_TO || "ngozi.maxmacarthy@gmail.com";
const FROM = process.env.REMINDER_FROM || "onboarding@resend.dev";
const CHECKLIST_URL = process.env.CHECKLIST_URL || "https://claude.ai/code/artifact/ad1a8cc1-badd-4e94-9fce-a304f4f9d583";

// Cents only when there are cents: $95, $14.10, $1,385.
const money = (n) => `$${Math.abs(n % 1) > 0.001 ? n.toFixed(2) : n.toLocaleString()}`;

/** Today's date as it reads in New York, so period keys never straddle a day. */
function nowInNY() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).reduce((a, p) => (a[p.type] = p.value, a), {});
  return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
}

/**
 * Build the reminder from a { periodKey: [itemId] } map. Pure: no database, no
 * network, no clock of its own — which is what makes it testable.
 */
export function buildReminder(ticks, now) {
  const dayOfMonth = now.getDate();
  const isTicked = (item) => (ticks[periodOf(item, now).key] || []).includes(item.id);

  const openMonthly = MONTHLY.filter((i) => !isTicked(i));
  const dollarsLeft = openMonthly.reduce((a, i) => a + valueIn(i, periodOf(i, now)), 0);
  const daysInMonth = daysLeft(periodOf(MONTHLY[0], now), now);

  const closingSoon = ITEMS
    .filter((i) => i.cad !== "m" && !i.gate && !isTicked(i))
    .map((i) => ({ item: i, period: periodOf(i, now) }))
    .map((x) => ({ ...x, days: daysLeft(x.period, now) }))
    .filter((x) => x.days !== null && x.days <= 45)
    .sort((a, b) => a.days - b.days);

  const firstOfMonth = dayOfMonth <= 7;
  const subject = openMonthly.length === 0
    ? "Nothing left to claim this month"
    : firstOfMonth
      ? `New month \u00b7 ${money(dollarsLeft)} in card credits are open`
      : `Halfway \u00b7 ${money(dollarsLeft)} still unclaimed this month`;

  const lines = [];
  if (openMonthly.length === 0) {
    lines.push("Every monthly credit is already ticked off. Nothing to do.");
  } else {
    lines.push(firstOfMonth
      ? `Everything monthly just reset. ${money(dollarsLeft)} is on the table.`
      : `${daysInMonth} days until these expire. They do not roll over.`);
    lines.push("");
    lines.push("STILL OPEN THIS MONTH");
    for (const i of openMonthly) {
      const v = valueIn(i, periodOf(i, now));
      const amt = v > 0 ? money(v) : (i.id === "bilt899" ? "no credit, but the costliest to miss" : "no cash value");
      lines.push(`  ${i.name} \u2014 ${CARDS[i.card]} \u2014 ${amt}`);
    }
  }

  if (closingSoon.length) {
    lines.push("");
    lines.push("CLOSING SOON");
    for (const { item, period, days } of closingSoon) {
      const v = valueIn(item, period);
      lines.push(`  ${item.name} \u2014 ${CARDS[item.card]} \u2014 ${v > 0 ? money(v) : "no cash value"} \u2014 ${days} days, closes ${fmtDate(new Date(period.end - 86400000))}`);
    }
  }

  lines.push("");
  lines.push(CHECKLIST_URL);

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#0E1830;max-width:560px">`
    + `<p style="margin:0 0 18px">${lines[0]}</p>`
    + section("Still open this month", openMonthly.map((i) => {
        const v = valueIn(i, periodOf(i, now));
        return [i.name, CARDS[i.card], v > 0 ? money(v) : (i.id === "bilt899" ? "no credit, but the costliest to miss" : "\u2014")];
      }))
    + section("Closing soon", closingSoon.map(({ item, period, days }) => {
        const v = valueIn(item, period);
        return [item.name, CARDS[item.card], `${v > 0 ? money(v) + " \u00b7 " : ""}${days} days left`];
      }))
    + `<p style="margin:22px 0 0"><a href="${CHECKLIST_URL}" style="color:#1B5CF3">Open the checklist</a></p>`
    + `</div>`;

  return { subject, text: lines.join("\n"), html, openCount: openMonthly.length, closingCount: closingSoon.length };
}

export default async function handler(req, res) {
  // Fail closed. An unset secret must never mean "anyone may trigger this" —
  // Vercel sends CRON_SECRET as a bearer token on every scheduled invocation.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("cron: CRON_SECRET is not set; refusing to run.");
    return res.status(500).json({ error: "Reminder is not configured." });
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  try {
    const now = nowInNY();
    const ticks = await readTicks(currentKeys(ITEMS, now));
    const { subject, text, html, openCount, closingCount } = buildReminder(ticks, now);

    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.error("cron: RESEND_API_KEY is not set; nothing was sent.");
      return res.status(500).json({ error: "Email is not configured.", subject, text });
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        subject,
        text,
        html,
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      console.error("cron: Resend rejected the send:", r.status, body);
      return res.status(502).json({ error: "Email provider rejected the send.", status: r.status });
    }

    return res.status(200).json({ ok: true, subject, open: openCount, closingSoon: closingCount });
  } catch (err) {
    console.error("cron:", err);
    return res.status(500).json({ error: "Reminder failed." });
  }
}

function section(title, rows) {
  if (!rows.length) return "";
  return `<p style="margin:22px 0 8px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8B99B2">${title}</p>`
    + rows.map(([a, b, c]) =>
        `<div style="padding:8px 0;border-top:1px solid #EAEFF7">`
        + `<strong>${a}</strong> <span style="color:#8B99B2">${b}</span>`
        + `<span style="float:right;color:#5E6E8A">${c}</span></div>`
      ).join("");
}
