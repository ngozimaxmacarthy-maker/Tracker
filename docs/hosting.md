# Hosting this on Vercel

Written September 2026. Verify the quoted free-tier numbers before relying on
them — every provider here changes them.

## The one decision that actually matters

**You do not need a database for the checklist. You need one for the email.**

Worth being blunt about, because it changes what you build. The checklist works
today with `localStorage` and no server at all. Ticks survive reloads, cost
nothing, and can never leak. If the page were the whole product, the right
architecture would be a static file on a CDN and nothing else.

The reminder is what breaks that. It has to answer "what has she not ticked?" at
9am on the 1st, from a server, while your browser is shut. `localStorage` lives
in your browser and is unreachable from anywhere else. That single requirement —
not data volume, not scale, not "apps should have databases" — is why Postgres
enters the picture.

Everything below follows from it.

## Storage: stop worrying about this one

| | |
|---|---|
| Rows written per year | ~130 (9 monthly items × 12, plus ~20 non-monthly) |
| Bytes per year | ~15 KB |
| Neon Free storage | 0.5 GB per project |
| Years before you notice | roughly thirty thousand |

The database will never be your constraint. Do not index for scale, do not
shard, do not cache. One table, no cleverness.

```sql
-- A row exists means it is ticked. Deleting it unticks. No updates, no nulls.
create table tick (
  period_key text        not null,   -- '2026-09', '2026-Q3', 'acsph2025', 'once'
  item_id    text        not null,   -- 'uber', 'resy', 'bilt899'
  ticked_at  timestamptz not null default now(),
  primary key (period_key, item_id)
);

-- Point valuations, spend-to-date, anything else small and singular.
create table setting (
  key   text  primary key,
  value jsonb not null
);
```

The primary key is the whole schema design: a tick is identified by *which
credit* and *which period*, which is exactly why the list resets by itself. A new
month is a new `period_key`, finds no rows, and everything is open again.

No `user_id`. You are one person. If you ever share it, add the column with a
default and backfill in one statement.

Keeping `ticked_at` costs nothing and buys the leak history later — "which credit
do I miss most?" is a `group by item_id` away. That, not relational modelling, is
the honest argument for Postgres over a key-value store here. Vercel KV or Upstash
would also work fine and be slightly simpler; the difference is small enough that
Neon being what you already asked about is a good enough reason to pick it.

## Compute: the cold start is the real quirk

Neon Free gives 100 CU-hours per project per month and **scales to zero after
5 minutes idle**. Your usage is nowhere near the quota. But scale-to-zero has a
consequence worth designing around:

> A checklist you open a few times a month is almost *always* hitting a cold
> database. Expect roughly half a second to a second before the first query
> returns.

That would feel broken on a page whose whole job is to be glanceable. The fix is
already in the code: both pages render immediately from `localStorage`, then
reconcile with the server when it answers. Keep that pattern when you swap the
storage layer — render local, fetch remote, re-render on arrival. Never block the
first paint on the database.

## Auth: the part that needs real thought

Everything above is bookkeeping. This is the actual decision.

The pages hold no card numbers, no credentials, nothing that lets anyone spend
your money. What they do hold is a fairly precise picture of your finances — ten
cards, $1,385 in fees, where you shop, what your HOA situation is. Not a
catastrophe if seen, but not something to leave on a guessable URL either.

Three options, worst to best for your case:

1. **Vercel Deployment Protection.** Password-gates the whole deployment. It is
   the least code. It is also a Pro feature at $20/month — more than the rest of
   the stack costs combined, for one password. Skip it.

2. **A signed cookie behind a password form.** ~20 lines, no dependency. Rolling
   your own auth is usually bad advice, and here are the specific conditions
   under which it is fine: the data is not credentials, there is no write path
   that harms anyone but you, and you use an `HttpOnly` `Secure` `SameSite=Lax`
   cookie holding an HMAC — not the password — compared in constant time. Meet
   those and the realistic threat is "someone stumbles on the URL," which a
   password solves completely.

3. **Auth.js with Google, allowlisting your address.** Battle-tested, free, and
   you already have the Google account. Costs an afternoon and a dependency.

**Recommendation: (2) now, (3) if you ever share it.** A single-user page with
no dangerous write path does not need an identity provider, and pretending
otherwise is how a weekend project turns into a month.

Separately and non-negotiably: the cron endpoint is not a browser request and
needs its own secret. Put `CRON_SECRET` in the environment, have Vercel send it
as a bearer token, and reject the route without it — otherwise anyone who finds
`/api/cron` can trigger your email.

## The reminder, done properly

This replaces the Claude Routine, and fixes the problem we hit: the Routine
cannot reach Gmail from this organization, so it currently pushes to your phone
instead of emailing. On Vercel that constraint disappears.

- **Vercel Cron** — Hobby allows at most one run per day. Your `0 13 1,15 * *`
  is twice a month, comfortably inside the limit, so it deploys on the free plan.
  Fire times are approximate on Hobby; it may run within the hour, which does not
  matter for this.
- **Resend** — 3,000 emails a month free, 100 a day. You need two. Sending from
  your own address means verifying a domain; `onboarding@resend.dev` works
  immediately if you do not have one and do not mind the from-address.

The cron handler is about thirty lines: work out today's period keys, `select`
the ticks for them, diff against the item list, send what is missing. The
period-key logic already exists in `pages/checklist.html` — lift it rather than
rewrite it.

## Do not migrate to Next.js

The tempting move is a framework. Resist it.

Both pages are single self-contained HTML files that work by opening them. That
portability is worth keeping — it is why they run as Claude Artifacts *and* will
run on Vercel *and* will run off a USB stick. Rebuilding them as React routes
buys nothing a user would notice.

```
public/
  index.html          -> checklist
  wallet.html
api/
  ticks.js            GET  -> rows for the given period keys
                      POST -> upsert or delete one tick
  cron.js             GET  -> the 1st/15th reminder, bearer-token gated
  auth.js             POST -> set the session cookie
vercel.json           cron schedule + the /api rewrites
```

Vercel serves `public/` statically and `api/` as functions with no config. The
only change inside the pages is swapping the `claude.use("db")` block for a
`fetch("/api/ticks")` adapter with the same shape — around twenty lines, and the
`localStorage` fallback stays exactly as it is.

## What it costs

Vercel Hobby, Neon Free and Resend Free: **$0**, and nothing here approaches a
paid tier. The one caveat is that Vercel's Hobby plan is for non-commercial use,
which a personal perk tracker plainly is.

## Order to build it

1. Neon project, run the two `create table` statements.
2. `api/ticks.js`, and the fetch adapter in `checklist.html`. Confirm a tick
   survives a hard reload in a private window.
3. The password gate. Do this before the domain is public, not after.
4. `api/cron.js` and Resend. Trigger it by hand before trusting the schedule.
5. Turn off the Claude Routine so you are not reminded twice.

Step 2 is the one that proves the idea. If a tick made on your phone shows up on
your laptop, everything else is plumbing.
