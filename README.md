# Perk Tracker

A monthly credit card perk checklist that resets on its own, and a guide to which
card to pull out for any given purchase. Ten cards, $1,385 in annual fees,
~$3,900 of recurring credits sitting against them.

Live as a Claude Artifact:
**[Perk Tracker](https://claude.ai/code/artifact/ad1a8cc1-badd-4e94-9fce-a304f4f9d583)**

## What it is

One page, two tabs.

**This month** — the tick list. Eight monthly credits worth $89.10 ($109.10 in
December), then anything non-monthly closing within six weeks, then the long tail
collapsed out of the way. Tap a row, it is done.

Append `?as=2026-10-01` to any date to preview it. Ticking is disabled while
previewing, so looking at next month can never write a tick into it.

**Which card** — every earn rate above 1×, converted to cents per dollar, because
a raw multiplier is meaningless across currencies: 3× SkyMiles is worth less than
2× Membership Rewards. The point valuations are editable, since they are
estimates rather than facts, and every ranking recomputes when you change them.

## Why it resets by itself

A tick is stored against the period it belongs to — `uber` in `2026-09`, `resy`
in `2026-Q3`, `csph` in `acsph2025`. When the calendar turns over, the new period
has no rows and the list is simply open again. There is no reset button to
forget, and an August tick can never make September look handled.

That one idea is most of the design.

## Layout

```
public/index.html          the whole app: both tabs, no build step, no dependencies
api/ticks.js               read and write ticks
api/cron.js                the 1st and 15th reminder
lib/items.js               the item list the reminder reads
lib/periods.js             reset clocks, mirroring the page exactly
lib/db.js                  Neon client
db/schema.sql              two tables
scripts/check-drift.mjs    fails if the page and lib/items.js disagree
docs/hosting.md            the Vercel and Neon setup, and why
```

`public/index.html` is self-contained — open it in a browser and it works. It
finds its storage in whichever of three homes exists: this app's own API, the
Claude Artifact store, or `localStorage` alone. It renders from the local copy
first and reconciles with the server afterwards, so a cold serverless database
never blocks the first paint.

## Working on it

```bash
npm install
npm run check      # the page and lib/items.js must agree
npm run dev        # vercel dev, needs the Vercel CLI
```

`npm run check` exists because the item list lives in two places on purpose: the
page keeps an inline copy so it stays one portable file, and the reminder reads
`lib/items.js`. Two copies drift. The check fails loudly when they do.

## Verify the terms once a year

Issuers change perks constantly — Amex refreshed the Platinum in late 2025, Chase
the Sapphire Preferred in June 2026, Bilt relaunched in February 2026. Rates here
were checked against issuer terms in September 2026.

Two rates are set by you rather than the issuer and will be wrong the moment you
change them: the **Bilt 3× category** (groceries or dining, one choice per
calendar year — currently groceries) and the **BofA 3% category**, re-chosen
monthly.

## Privacy

No card numbers, no account numbers, no credentials — only credit amounts and
dates. Hosted, it sits behind Vercel Deployment Protection.
