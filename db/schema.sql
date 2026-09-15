-- Run once against your Neon database (SQL Editor, or `psql "$DATABASE_URL" -f db/schema.sql`).
--
-- A row in `tick` means that credit was claimed in that period. Deleting the row
-- unticks it. There are no updates and no nulls, and the primary key is the whole
-- design: a tick is identified by which credit and which period, which is exactly
-- why the list resets by itself when the calendar turns over.

create table if not exists tick (
  period_key text        not null,   -- '2026-09', '2026-Q3', 'acsph2025', 'once'
  item_id    text        not null,   -- 'uber', 'resy', 'bilt899'
  ticked_at  timestamptz not null default now(),
  primary key (period_key, item_id)
);

-- Point valuations and anything else small and singular.
create table if not exists setting (
  key   text  primary key,
  value jsonb not null
);

-- Deliberately no indexes beyond the primary key. At roughly 130 rows a year,
-- a sequential scan is faster than anything you could add.
