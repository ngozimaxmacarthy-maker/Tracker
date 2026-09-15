// The checklist page carries its own inline copy of the item list so it stays a
// single portable file. The reminder reads lib/items.js. Two copies drift, so
// this fails the build when they stop agreeing.
//
//   npm run check

import { readFileSync } from "node:fs";
import { ITEMS } from "../lib/items.js";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

// Pull { id:"uber", card:"plat", name:"Uber Cash", amt:15, cad:"m", ... } rows
// out of the page's ITEMS array without evaluating any of its code.
const start = html.indexOf("var ITEMS = [");
if (start === -1) fail("Could not find the ITEMS array in public/index.html.");
const end = html.indexOf("\n  ];", start);
const block = html.slice(start, end);

const pageItems = [...block.matchAll(/\{\s*id:\s*"([^"]+)"[^}]*?card:\s*"([^"]+)"[^}]*?name:\s*"([^"]*)"[^}]*?amt:\s*([\d.]+)[^}]*?cad:\s*"([^"]+)"/g)]
  .map((m) => ({ id: m[1], card: m[2], name: m[3], amt: Number(m[4]), cad: m[5] }));

if (!pageItems.length) fail("Parsed zero items out of public/index.html — the regex has gone stale.");

const problems = [];
const pageById = Object.fromEntries(pageItems.map((i) => [i.id, i]));
const libById = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

for (const id of Object.keys(libById)) {
  if (!pageById[id]) problems.push(`${id}: in lib/items.js but missing from the page`);
}
for (const id of Object.keys(pageById)) {
  if (!libById[id]) problems.push(`${id}: on the page but missing from lib/items.js`);
}
for (const id of Object.keys(libById)) {
  const a = libById[id], b = pageById[id];
  if (!b) continue;
  for (const field of ["card", "amt", "cad"]) {
    if (a[field] !== b[field]) {
      problems.push(`${id}.${field}: lib says ${JSON.stringify(a[field])}, page says ${JSON.stringify(b[field])}`);
    }
  }
}

if (problems.length) {
  console.error(`\nThe page and lib/items.js disagree on ${problems.length} thing${problems.length > 1 ? "s" : ""}:\n`);
  for (const p of problems) console.error("  " + p);
  console.error("\nFix whichever is wrong. The reminder emails what lib/items.js says;");
  console.error("the page shows what the page says, and only one of them can be right.\n");
  process.exit(1);
}

console.log(`Item lists agree — ${pageItems.length} items, ${pageItems.filter((i) => i.cad === "m").length} of them monthly.`);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}
