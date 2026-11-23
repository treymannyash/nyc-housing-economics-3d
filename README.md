# NYC Housing Economics in 3D

An interactive, sourced explainer: **why New York feels so expensive, and why six popular fixes tend to backfire.** Each chapter pairs a step-by-step 3D cascade with a live model you can change, real data, the best counterarguments, and a short quiz.

Chapters: **0** the melting dollar · **homes as a money asset** · **1** rent control and stabilization (with the stabilization simulator) · **2** price controls · **3** home-loan subsidies · **4** steep tax brackets · **5** capital gains tax · **6** printing money · glossary · sources.

The tone is meant for New Yorkers who support rent regulation: steelman first, cite everything, and label every model number as illustrative.

## Rent stabilization simulator

In the rent chapter, switch between **Free market**, **NYC-style stabilization** and a **Hard freeze**, then scrub a 10–20 year timeline. The 3D block, the rent chart and the metric cards all follow the selected year.

- **Stabilization**: the regulated rent rises each year by an RGB-style cap (slider), compared against a building-cost inflation slider and a market-rent growth slider.
- **2019 rules (HSTPA)**: no high-rent vacancy decontrol, no 20% vacancy bonus, and Individual Apartment Improvements capped at $15,000 per 15 years (recovered at 1/168 or 1/180 of the cost per month). A **pre-2019** toggle shows the old vacancy bonus, uncapped IAIs and decontrol for comparison.
- **Hard freeze**: 0% a year, whatever costs do.
- **Outputs over time**:
  - the gap between regulated and market rent
  - operating cost and a deferred-maintenance index
  - the share of units held off market (labelled **disputed**)
  - tenant turnover and mobility
  - a new-construction index
  - the line per vacancy
- **Winners vs losers**: an incumbent's cumulative savings, a newcomer's extra rent from the spillover premium, and the owner's net operating income per unit.

All model parameters live in [`src/sim/stab.ts`](src/sim/stab.ts). They are illustrative teaching assumptions, not forecasts.

## How it's built

- **Vite, React 19, TypeScript and three.js.** There's no UI framework; the small kit in `src/kit.tsx` provides layout, tables and charts.
- **One WebGL context for the whole page** (`src/engine/renderer.ts`):
  - The WebGL canvas is never placed in the page. Each visible view is rendered into it and immediately copied into that view's own 2D canvas, inside a clipped box (`overflow: hidden; contain: paint`).
  - The 3D picture is therefore ordinary page content. It scrolls with its box and can't bleed over text, even when JavaScript lags behind iOS momentum scrolling or Safari's toolbar resizes the viewport.
  - A single context stays well under iOS's limit on live WebGL contexts.
  - The loop stops when no view is visible.
- **Lighting and geometry**: a hemisphere light plus one shadow-casting directional light, ACES tone mapping and fog. Geometry is instanced: one draw call per primitive type per view (boxes, glass, ice, roofs, lit and dark windows, people, rods).
- **Labels** are DOM overlays, projected every frame, with a greedy pass that moves or drops any label that would overlap another.
- **Code splitting**:
  - Each chapter's scene builder is its own chunk (`src/scenes/*`).
  - three.js and the renderer load only when the first 3D view comes within about 600px of the viewport.
- **No React re-renders per frame**: animation time, camera easing and slider smoothing all run in the render loop, from refs.
- **Phones and accessibility**:
  - The device pixel ratio is capped (1.75 on desktop, 1.5 on touch screens).
  - Pages scroll vertically through the 3D views (`touch-action: pan-y`).
  - `prefers-reduced-motion` freezes scene time, idle orbit and transitions.

```
src/
  engine/   prims.ts (scene description), renderer.ts (single WebGL context), View3D.tsx (lazy view slot)
  scenes/   one module per chapter + index.ts registry (dynamic imports)
  sim/      stab.ts (rent stabilization model)
  App.tsx   all chapter content
  components.tsx, Stabilization.tsx, charts.tsx, kit.tsx, data.ts, lib.ts, index.css
```

## Run

```bash
npm install
npm run dev       # local dev server
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
```

Requires Node 20+ (built with Node 24). `vite.config.ts` uses a relative base, so `dist/` works from any static host or sub-path. `.github/workflows/deploy.yml` builds every pull request and builds and deploys every push to `main` to GitHub Pages: https://treymannyash.github.io/nyc-housing-economics-3d/

## Sources (selection)

- **Rent regulation**
  - NY Homes and Community Renewal, [HSTPA 2019 rent regulation changes](https://hcr.ny.gov/system/files/documents/2020/02/rent-regulation-hstpa-presentation.pdf)
  - NYC Rent Guidelines Board, [research (Price Index of Operating Costs)](https://rentguidelinesboard.cityofnewyork.us/research/) and [2026–27 adopted guidelines](https://rentguidelinesboard.cityofnewyork.us/adopted-summary-of-guidelines-2026-27/)
  - NYC Comptroller, [vacancies in the rent-stabilized stock](https://comptroller.nyc.gov/reports/accurately-assessing-and-effectively-addressing-vacancies-in-nycs-rent-stabilized-housing-stock/)
  - NYC HPD, [2023 Housing and Vacancy Survey initial findings](https://www.nyc.gov/assets/hpd/downloads/pdfs/about/2023-nychvs-selected-initial-findings.pdf)
- **Research**
  - Diamond, McQuade & Qian (2019), [rent control in San Francisco](https://www.aeaweb.org/articles?id=10.1257/aer.20181289), *AER*
  - Autor, Palmer & Pathak (2014), [ending rent control in Cambridge](https://www.journals.uchicago.edu/doi/full/10.1086/675536), *JPE*
  - Asquith, Mast & Reed (2023), [local effects of large new apartment buildings](https://direct.mit.edu/rest/article-abstract/105/2/359/100977/Local-Effects-of-Large-New-Apartment-Buildings-in), *REStat*
- **Data**
  - FRED series CPIAUCSL, AHETPI, CUURA101SEHA, CSUSHPINSA, M2SL, MORTGAGE30US and WSHOMCB

The full list, with notes, is in the app's **Sources** section.

## Caveats

- **Illustrative models.** Every slider model shows direction and mechanism, not a forecast. Numbers from models are labelled as such in the UI.
- **Contested claims.** Claims that are actively contested (for example, how many stabilized units are kept off the market) are marked as disputed, with both sides cited.
