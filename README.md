# Bielefeld Study Planner

Unofficial drag-and-drop semester planner for degree programmes at Universität Bielefeld,
inspired by [UCI 4 Year Planner](https://github.com/calebvergene/uci4yearplan).

- Pick your programme and start semester (WiSe/SoSe); drag modules from the eKVV module list into semesters.
- Live checks: total LP vs. the programme target, missing Pflicht modules, modules placed in a semester
  they are not offered in (Turnus), and prerequisites from the module description that are not planned earlier.
- Current focus: M.Sc. Naturwissenschaftliche Informatik in both FsB versions — 2025 (variante 462589642) and the expiring
  2016 version (variante 81435339) — with every Wahlpflicht area from the respective FsB checked. Other programmes are
  scraped but hidden in the picker (`LISTED` in `lib/programs.ts`) until their FsB rules are written.
- Custom modules for anything not in the list (e.g. Individueller Ergänzungsbereich).
- German / English, light / dark theme, plan saved in your browser, share a plan as a link. No account, no server.

> Not affiliated with Bielefeld University. The Fächerspezifische Bestimmungen (FsB) of your programme are binding.

## Data

There is no public eKVV API, so `scripts/scrape-ekvv.ts` reads the public _Studieninformation_ pages
(`sinfo/publ/variante/<id>`, `?m` module list, `modul/<id>`) — paths allowed by the eKVV `robots.txt` —
one request at a time, and writes `data/programs/*.json`. The programmes are listed in `scripts/programs.ts`.

```bash
npm run scrape                 # all programmes (~20 min, cached in .cache/ekvv)
npm run scrape -- 462589642    # one programme
```

Wahlpflicht area rules are not machine-readable in the eKVV; they are hand-written from the FsB PDF in
`lib/rules.ts`.

| Programme                                                                | eKVV variante |
| ------------------------------------------------------------------------ | ------------- |
| M.Sc. Naturwissenschaftliche Informatik, FsB 2025 (area rules)           | 462589642     |
| M.Sc. Naturwissenschaftliche Informatik, FsB 2016, expiring (area rules) | 81435339      |
| B.Sc. Naturwissenschaftliche Informatik                                  | 453996665     |
| B.Sc. Informatik (Kernfach)                                              | 453998098     |
| B.Sc. Künstliche Intelligenz und Kognitive Informatik                    | 405818172     |
| M.Sc. Data Science                                                       | 569518710     |
| M.Sc. Intelligente Interaktive Systeme                                   | 366747897     |
| M.Sc. Genome Based Systems Biology                                       | 189447354     |

## Development

```bash
npm ci
npm run dev        # http://localhost:3000
npm run lint && npm run typecheck && npm run format:check && npm test && npm run build
```

Stack: Next.js (static export), React, Tailwind CSS, dnd-kit, Vitest, cheerio (scraper).

## Deploy

`.github/workflows/pages.yml` builds with `PAGES_BASE_PATH=/bielefeld-studyplan` and deploys `out/` to
GitHub Pages on every push to `main`. One-time setup: _Settings → Pages → Source: GitHub Actions_.
The manual _Refresh eKVV data_ workflow re-runs the scraper and opens a PR.
