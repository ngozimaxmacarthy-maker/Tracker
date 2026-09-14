# pages/

The two pages actually in use, published as Claude Artifacts:

| File | Artifact | What it is |
|---|---|---|
| `checklist.html` | [checklist](https://claude.ai/code/artifact/ad1a8cc1-badd-4e94-9fce-a304f4f9d583) | The monthly tick list. Resets on its own. |
| `wallet.html` | [wallet playbook](https://claude.ai/code/artifact/ecd552f0-5268-4d0d-ad22-9086b6f7e4fe) | Which card to pull out, by category. |

Each is a single self-contained HTML file: no build step, no dependencies,
fonts from Google Fonts and everything else inline. Open either directly in a
browser and it works.

## How they store things

`checklist.html` writes ticks to the Artifact `db` capability when it is running
on claude.ai, and mirrors them to `localStorage` so the page renders filled in
immediately and still works if the store is unreachable. Ticks are filed under
the period they belong to (`2026-09`, `2026-Q3`), which is what makes the list
reset by itself — a new month finds no record and everything is open again.

`wallet.html` stores only your point valuations, in `localStorage`. Nothing else
on that page is state.

## Moving these to Vercel

`claude.use("db")` only exists inside the Artifact runtime. Hosted anywhere else
it resolves `null` and both pages fall back to `localStorage` — they keep working,
but the ticks become per-browser and unreadable from a scheduled job.

That last part is the whole reason a database is needed: the twice-monthly
reminder has to read your ticks at 9am while your browser is shut. See
`docs/hosting.md`.
