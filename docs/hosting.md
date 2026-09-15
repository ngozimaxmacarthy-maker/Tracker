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
already in the code: the page renders immediately from `localStorage`, then
reconciles with the server when it answers. Never block the first paint on the
database.

## Auth: you already paid for the answer

You are on **Vercel Pro at $20/month**, not Hobby — Hobby is the free tier. That
changes the recommendation I made before I knew that.

The pages hold no card numbers and nothing that lets anyone spend your money.
What they do hold is a fairly precise picture of your finances: ten cards, $1,385
in fees, where you shop, that you pay an HOA. Not a catastrophe if seen, but not
something to leave on a guessable URL.

**Use Vercel Deployment Protection.** Settings → Deployment Protection →
Password Protection. It is included in Pro, it is a dashboard toggle, and it runs
at Vercel's edge before any of your code executes, which is stronger than
anything you would write yourself. I previously suggested a hand-rolled cookie
gate on the assumption you were on the free plan; do not build that now.

One consequence to plan for, because it has bitten people: **protection runs at
the edge, so it sits in front of `/api/cron` too.** Two defences, and you want
both:

- `CRON_SECRET` in the environment. Vercel sends it as a bearer token on every
  scheduled invocation, and `api/cron.js` **fails closed** — an unset secret means
  the route refuses to run at all, rather than quietly becoming public. That is
  the opposite of the usual default and it is deliberate.
- If the first scheduled run comes back 401 from the edge rather than from your
  code, the fix is Settings → Deployment Protection → **Protection Bypass for
  Automation**, which issues a secret Vercel passes as `x-vercel-protection-bypass`.

Pro also lifts the once-a-day cron ceiling, so the 1st-and-15th schedule is
comfortable rather than borderline, and you could move to weekly later without
changing plans.

## The reminder, done properly

This replaces the Claude Routine, and fixes the problem we hit: the Routine
cannot reach Gmail from this organization, so it currently pushes to your phone
instead of emailing. On Vercel that constraint disappears.

- **Vercel Cron** — already configured in `vercel.json` as `0 13 1,15 * *`,
  which is 9am Eastern on the 1st and the 15th. Pro has no once-a-day ceiling,
  so this is well inside the limits.
- **Resend** — 3,000 emails a month free, 100 a day. You need two. Sending from
  your own address means verifying a domain; `onboarding@resend.dev` works
  immediately if you do not have one and do not mind the from-address.

`api/cron.js` does the work: today's period keys, one `select`, diff against
`lib/items.js`, send what is missing. Its `buildReminder()` is a pure function
taking ticks and a date, so the email can be checked without a database or an
email provider — which is how the December Uber Cash bump and the all-clear case
were verified.

## Do not migrate to Next.js

The tempting move is a framework. Resist it.

`public/index.html` is one self-contained file that works by being opened. That
portability is worth keeping — it is why it runs as a Claude Artifact *and* on
Vercel *and* off a USB stick. Rebuilding it as React routes buys nothing a user
would notice.

```
public/
  index.html          both tabs in one file: the checklist and the card guide
api/
  ticks.js            GET  -> ticks for the given period keys
                      POST -> add or remove one tick
  cron.js             GET  -> the 1st/15th reminder, bearer-token gated
lib/
  items.js            the item list the reminder reads
  periods.js          reset clocks, mirroring the page exactly
  db.js               Neon client and the two queries
db/schema.sql         two tables, run once
scripts/check-drift.mjs   fails if the page and lib/items.js disagree
vercel.json           the cron schedule
```

No `auth.js` — Deployment Protection handles that at the edge.

Vercel serves `public/` statically and `api/` as functions with no config. The
page already picks its storage at runtime — it tries `/api/ticks`, falls back to
the Artifact store, and falls back again to `localStorage` alone — so the same
file works in all three places without a build flag.

## What it costs

Vercel Pro you are already paying for at $20/month. Neon Free and Resend Free
add **nothing** — this app is far below both free tiers and will stay there.

## Deploying it

The code is written. What is left is account setup, in this order:

1. **Neon.** Vercel dashboard → Storage → Neon. Creating it from Vercel sets
   `DATABASE_URL` automatically. Then run `db/schema.sql` in Neon's SQL editor.
2. **Deployment Protection.** Settings → Deployment Protection → Password.
   Do this before the domain is reachable, not after.
3. **`CRON_SECRET`.** Settings → Environment Variables. Any random 16+ character
   string; `openssl rand -hex 24` if you want one. Without it the reminder route
   refuses to run.
4. **Resend.** Sign up, create an API key, set `RESEND_API_KEY`. Sending from
   your own address needs a verified domain; `onboarding@resend.dev` works
   immediately if you would rather not bother yet.
5. **Deploy**, then hit `/api/cron` by hand with the bearer token to confirm the
   email lands before you trust the schedule:
   ```
   curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR-APP.vercel.app/api/cron
   ```
6. **Turn off the Claude Routine** so you are not reminded twice.

The round-trip in step 1 is the part that proves the idea, and it is already
tested: with `localStorage` wiped entirely, ticks come back from the server.
