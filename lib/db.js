import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add the Neon connection string in Vercel > Settings > Environment Variables.");
}

// Neon's serverless driver speaks HTTP, so there is no pool to manage and no
// connection to leak across invocations.
export const sql = neon(process.env.DATABASE_URL);

/** Ticks for the given period keys, as { periodKey: [itemId, ...] }. */
export async function readTicks(periodKeys) {
  if (!periodKeys.length) return {};
  const rows = await sql`
    select period_key, item_id
      from tick
     where period_key = any(${periodKeys})
  `;
  const out = {};
  for (const k of periodKeys) out[k] = [];
  for (const r of rows) (out[r.period_key] ||= []).push(r.item_id);
  return out;
}

/** A row exists means ticked. Writing is an insert or a delete — never an update. */
export async function setTick(periodKey, itemId, ticked) {
  if (ticked) {
    await sql`
      insert into tick (period_key, item_id) values (${periodKey}, ${itemId})
      on conflict (period_key, item_id) do nothing
    `;
  } else {
    await sql`delete from tick where period_key = ${periodKey} and item_id = ${itemId}`;
  }
}
