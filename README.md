# Perks Tracker

A recurring-credit tracker for a ten-card wallet. The premise: credit card perks
are not lost to bad decisions, they are lost to a calendar nobody watches. Every
credit here belongs to a period, and the tracker's only job is to show you which
periods are about to close with money still in them.

## The design decisions that matter

**Deadline-first, not card-first.** The default view is one queue of every open
credit, ranked by how soon it expires and how much is on it. Cards are a filter,
not the organising principle — because money leaks on a calendar, not on a card.

**Redemptions are scoped to a period key.** Marking a credit used writes against
`perkId::periodKey` — `amex_resy::2026-Q3`, `amex_uber_cash::2026-09`. When the
calendar rolls, the new period has no record and the credit is simply open again.
There is no reset button to forget, and an August checkmark can never make
September look handled.

**Partial redemption.** Spend $40 of the $100 Resy credit and the row shows $60
still open. A boolean would hide that $60.

**A tracking start date.** Leakage is only counted from the day you started
using this. Without that, a fresh install would open by accusing you of losing
hundreds of dollars in credits you probably did use — a number that is both
alarming and wrong.

**Unknown beats guessed.** Two credits reset on an account anniversary rather
than January 1. Until you enter those dates in Setup, those credits show as
locked rather than inventing a deadline.

## Layout

```
src/data/perks.js    Source of truth — cards, perks, setup gates, thresholds
src/lib/periods.js   Reset clocks: period keys, bounds, days remaining
src/PerkTracker.jsx  UI
```

Changing a credit amount or adding a card means editing `src/data/perks.js` and
nothing else. Every total on every tab is derived from it.

## Tabs

- **Now** — the urgency queue. Log a partial amount or mark a credit fully used.
- **Cards** — fee against captured value, per card, plus the standing benefits
  that need no tracking so they do not read as omissions.
- **Value** — captured vs. fees, a leak report, and the places the headline
  totals mislead.
- **Setup** — enrollment gates, anniversary dates, the Global Entry cycle, spend
  thresholds, and an annual re-verification prompt.

## Data and privacy

Everything lives in `localStorage` in one browser. Nothing is transmitted, and
no account or card numbers are stored — only credit amounts and dates you enter.
Clearing site data clears the tracker.

## Verify the terms annually

Issuers change perks constantly. `VERIFIED_ON` in `src/data/perks.js` drives a
prompt on the Setup tab once the data is over a year old. Credits carrying
`needsVerification: true` were added from published issuer terms rather than the
owner's own records — confirm them against a statement, then drop the flag.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```
