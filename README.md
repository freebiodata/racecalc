# RaceCalc — Free Sim Racing FOV & Setup Calculators

A static Astro site with 4 free browser-based calculators for sim racers:

| Tool | URL | What it does |
|---|---|---|
| FOV Calculator | `/fov-calculator/` | Correct FOV from screen size, resolution and eye distance; per-game entry notes |
| Triple Screen Calculator | `/triple-screen-calculator/` | Full rig FOV with side angles and bezel correction |
| PPD Calculator | `/ppd-calculator/` | Pixels per degree for screens, triples and VR comparison |
| Fuel & Stint Calculator | `/fuel-calculator/` | Race fuel planning: margins, safe laps, stint counts |

Plus support pages: home, all-tools hub, 2 guides, about, methodology, contact, changelog, HTML sitemap, privacy, terms, 404.

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output to dist/
npm run preview    # serve the build locally
```

Node 22+ required. No environment variables, no backend, no database.

## Verification

```bash
node scripts/test-math.mjs   # 17 formula tests (FOV, triple geometry, PPD, fuel planning)
node scripts/test-dom.mjs    # 13 DOM tests (loads built pages in jsdom, runs the tools)
```

Both must pass before deploy. The DOM tests execute the actual bundled scripts and verify computed outputs (e.g. 27" screen at 60 cm → 53.0° hFOV).

## Project structure

```
src/
├── data/site.ts         # Site name, domain, contact email
├── lib/sim.ts           # Pure math functions (mirrors scripts/test-math.mjs)
├── layouts/Base.astro   # <head> SEO: title, meta, canonical, OG, JSON-LD graph
├── components/          # Header, Footer, Breadcrumbs, Faq, ToolCard, TrustBlock
├── styles/global.css    # Design system (dark theme, telemetry red accent)
└── pages/               # One directory per route; tool pages carry their own client script
public/                  # robots.txt, favicon.svg, og-default.png, logo-512.png
scripts/
├── test-math.mjs        # Formula tests
├── test-dom.mjs         # Browser-behavior tests (jsdom + esbuild)
└── gen-assets.py        # Regenerates OG image / logo / favicon (PIL)
```

## Editing guide

- **Change copy**: each page's text lives in its own `src/pages/<tool>/index.astro` (title/description consts at top of frontmatter).
- **Change colors/spacing**: `src/styles/global.css` variables at `:root`.
- **Update example numbers**: recompute with `node scripts/test-math.mjs` values; never hand-wave numbers (test failures catch mismatches).
- **Regenerate images**: `python3 scripts/gen-assets.py`.
- **Domain change**: `src/data/site.ts` + `astro.config.mjs` (site:) + `public/robots.txt` sitemap line.

## SEO implementation notes

- SSG: all content (headings, tool shells, FAQ answers, internal links, JSON-LD) is in the server HTML. Tools hydrate as plain inline scripts.
- One H1 per page; titles ≤ 60 chars, meta ≤ 155 (audited before ship).
- JSON-LD: Organization + WebSite sitewide; BreadcrumbList on subpages; WebApplication on every tool; Article on guides. No fake ratings.
- Canonicals self-referencing; sitemap-index generated; robots.txt allows CSS/JS, blocks parameter spaces.
- E-E-A-T: methodology page with formulas and sources, changelog, contact, privacy; corrections-with-credit policy.
- Privacy: zero trackers; all math client-side.

## Deploy (Cloudflare Pages)

| Setting | Value |
|---|---|
| Framework preset | Astro (or None) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(empty — repo root)* |
| Node version | 22+ required; set env var `NODE_VERSION=22` if the build fails on an older default |

After deploy:
1. Add your custom domain (`racecalc.top`) in Cloudflare Pages → Custom domains.
2. Submit `https://<domain>/sitemap-index.xml` in Google Search Console + Bing Webmaster Tools.
3. Post-deploy checks: canonicals point at the production domain; 404 returns a real 404.

## Accuracy policy

- Per-game FOV notes are based on the games' own settings documentation and community verification; re-checked when sims change UIs (changelog entries).
- Never ship a number you can't reproduce with `scripts/test-math.mjs`.
