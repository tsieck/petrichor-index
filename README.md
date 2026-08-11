# Petrichor Index


Petrichor Index is a small, polished, unofficial Risk of Rain 2 item reference. It keeps the item grid dominant, gives desktop players hover/focus previews, opens a bottom sheet on mobile, and puts the next-stack comparison ahead of long wiki prose.

Live site: [tsieck.github.io/petrichor-index](https://tsieck.github.io/petrichor-index/)

## Run locally

```bash
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173).

No install step, backend, account, or external runtime dependency is required. The app is static HTML, CSS, JavaScript, JSON, and local WebP/PNG sprites.

## What ships

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

## Validate

```bash
npm run check
```

This runs calculator fixtures and validates counts, required fields, unique IDs, and all local sprite files. The nonlinear fixtures include Tougher Times diminishing returns, exponential cooldown reduction, Shaped Glass multiplicative damage, and negative exponential penalties.

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

## Project structure

```text
index.html                 Static application shell
src/app.js                 Search, filters, grid, detail UI, keyboard behavior
src/calculators.js         Stack calculation strategies
src/styles.css             Responsive visual system and bottom sheet
data/items.json            Generated catalog consumed by the app
data/source/               Traceable source snapshots
public/assets/icons/       Local item sprites
scripts/                   Fetch, normalize, import, validate, and serve tools
tests/                     Formula fixtures
```

## Rights and affiliation

This is an unofficial, non-commercial companion and is not affiliated with Gearbox Software or 2K. Risk of Rain 2 names and game artwork belong to their respective owners. Data and sprite provenance is recorded for reference and replacement if distribution requirements change.
