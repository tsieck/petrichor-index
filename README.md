# Petrichor Index

Petrichor Index is an unofficial item reference for **Risk of Rain 2** and **Risk of Rain Returns**. The game switcher links two separate pages that share the same search, tier filters, desktop hover/focus previews, mobile bottom sheet, and next-stack calculator.

Live site: [tsieck.github.io/petrichor-index](https://tsieck.github.io/petrichor-index/)

## Run locally

```bash
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173).

The Returns page is [http://127.0.0.1:4173/returns.html](http://127.0.0.1:4173/returns.html). Both pages use relative links and assets, including when served from a GitHub Pages project subdirectory.

No install step, backend, account, or external runtime dependency is required. The app is static HTML, CSS, JavaScript, JSON, and local WebP/PNG sprites.

## What ships

### Risk of Rain 2

- 178 player-facing passive item records
- 42 equipment records, including Lunar and Elite Equipment
- 220 indexed entries with locally stored, recognizable item sprites
- Common, Uncommon, Legendary, Boss, Lunar, Void, Meal, Equipment, and Other filters
- Instant name, alias, description, DLC, category, and effect-keyword search
- Desktop hover/focus preview and click-to-pin behavior
- Mobile tap-to-open bottom sheet
- Per-item stack count with current, next-stack, and marginal-change readouts
- 80 Wandering CHEF recipes attached to all 73 indexed results, including Meals, boss items, repairs, equipment, and progression crafts
- Linear, hyperbolic, reciprocal, exponential, multiplicative, non-stacking, and custom behavior labels
- Keyboard shortcuts: `/` search, arrows navigate, `Enter` pin, `Esc` clear/close
- Traceable mechanics source and verification date on every record

### Risk of Rain Returns

- 144 indexed entries: 114 passive/special pickups and 30 equipment, with local pixel-art sprites
- Common, Uncommon, Legendary, Boss, Equipment, and Special filters
- Separate Returns mechanics, aliases, effect search, and per-item stack counts
- Chance caps, minimum attack intervals, Hermit's Scarf diminishing returns, and Rapid Mitosis multiplicative cooldown reduction
- Explicit notes for effects whose complete stacking formulas are not documented
- CHEF's five temporary meals, plus special pickups and the newer boss drops
- Equipment cooldowns, item-page sources, revision IDs, and verification dates

## Validate

```bash
npm run check
```

This runs calculator fixtures for both games and validates catalog completeness, counts, required fields, unique IDs, and all local sprite files. The fixtures also cover cross-game differences, capped probabilities, minimum intervals, and descriptive custom effects.

## Data pipeline

The UI never contains hard-coded item records. [`data/items.json`](data/items.json) is generated from the checked-in source snapshots:

```bash
npm run fetch:data
npm run build:data
npm run import:icons
npm run check
```

`fetch:data` refreshes the structured wiki modules. `build:data` normalizes fields, DLC names, search aliases, stack metadata, Wandering CHEF recipes, and source links. `import:icons` copies real game sprites from the maintained local asset snapshot when available and retains direct wiki sprites for records missing there.

See [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) for provenance and the abandoned or consumed-state records intentionally excluded from the player-facing catalog.

Returns has its own reproducible pipeline:

```bash
npm run fetch:returns
npm run build:returns
npm run import:returns-icons
npm run check
```

The importer resumes from valid local PNGs and honors wiki rate limits. Review the source diff and [`data/source/returns-stacking.js`](data/source/returns-stacking.js) when refreshing mechanics; catalog growth intentionally requires a reviewed formula mapping. The Returns dataset is adapted from the wiki under CC BY-SA 4.0; see [`docs/RETURNS_DATA_SOURCES.md`](docs/RETURNS_DATA_SOURCES.md).

## Project structure

```text
index.html                 Static application shell
returns.html               Risk of Rain Returns application shell
src/app.js                 Search, filters, grid, detail UI, keyboard behavior
src/calculators.js         Stack calculation strategies
src/styles.css             Responsive visual system and bottom sheet
data/items.json            Generated catalog consumed by the app
data/returns-items.json    Separate Returns catalog
data/source/               Traceable source snapshots
public/assets/icons/       Local item sprites
scripts/                   Fetch, normalize, import, validate, and serve tools
tests/                     Formula fixtures
```

## Rights and affiliation

This is an unofficial, non-commercial companion and is not affiliated with the games' developers or publishers. Risk of Rain names and game artwork belong to their respective owners. Data and sprite provenance is recorded for reference and replacement if distribution requirements change.
