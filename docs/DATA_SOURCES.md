# Data sources and integrity notes

Last verified: **August 10, 2026**

## Mechanics and catalog records

The catalog is normalized from the Risk of Rain 2 Wiki’s structured Lua modules:

- [Module:Items/Data](https://riskofrain2.wiki.gg/wiki/Module:Items/Data)
- [Module:Equipment/Data](https://riskofrain2.wiki.gg/wiki/Module:Equipment/Data)
- [Rendered item index](https://riskofrain2.wiki.gg/wiki/Items)

Every generated record retains its direct item-page source, DLC, tier, exact effect text, stack fields, internal game ID when present, and `lastVerified` date.

The raw module currently counts 187 non-hidden item records, but four are explicitly categorized `Abandoned`: `BurnNearby`, `CritHeal`, `CrippleWardOnLevel`, and `MageAttunement`. They are developer leftovers without a player-facing pickup flow. The app also excludes seven explicit `(Consumed)` state variants across passive items and equipment because they are not distinct pickups. The resulting catalog contains 178 passive entries and 42 equipment entries. Three meaningful non-consumed state records remain under **Other**: `Delicate Watch (Broken)`, `Empty Bottle`, and `Tonic Affliction`.

## Wandering CHEF recipes

The checked-in `data/source/wandering-chef-recipes.json` snapshot is normalized from the wiki's [Wandering CHEF recipe tables](https://riskofrain2.wiki.gg/wiki/Wandering_CHEF). It covers 80 recipes producing 73 indexed results: all five Meal items plus progression, boss, bulk-common, uncommon, legendary, equipment, Elite Aspect, and repair recipes. Ingredient alternatives, multi-item yields, and the special `H3AD-5T v2` different-ingredient rule are preserved. Consumed variants remain excluded from the grid but can still appear by name when they are required recipe inputs.

## Sprites

The app uses real item sprites, not generated artwork.

- Primary current asset snapshot: [diogoriba/ror2-build-planner](https://github.com/diogoriba/ror2-build-planner)
- Direct wiki file fallback for four records absent from or incorrect in that asset mapping: `His Reassurance`, `His Spiteful Boon`, `Soulbound Catalyst`, and `Spectral Circlet`

All shipped sprites are stored locally under `public/assets/icons` so the grid does not make hundreds of requests to third-party hosts during play.
The checked-in `data/source/build-planner-items.js` snapshot supplies the bounded top-level name-to-sprite mapping. Recipe ingredient objects are deliberately ignored so nested names cannot overwrite the main item mapping.

## Formula policy

The source schema is allowed to describe multiple stats per item. The calculator does not force every record through a single universal formula.

- `Linear`: base plus per-stack addition
- `Hyperbolic`: coefficient-based diminishing returns
- `Reciprocal`: base value divided by the stack factor
- `Exponential`: remaining-value reduction, multiplicative growth, or multiplicative penalty based on the stat metadata
- `Special` / custom: source behavior is shown without inventing a numeric result
- `None`: additional stacks are explicitly described as unchanged

Known outputs are fixture-tested at representative stack counts. Items whose raw value is a range or whose source marks a special rule remain descriptive instead of returning a misleading number.

## Refresh checklist

1. Run `npm run fetch:data`.
2. Review source diffs for new tiers, renamed fields, and expansion identifiers.
3. Run `npm run build:data`.
4. Refresh the local sprite source and run `npm run import:icons`.
5. Resolve any reported sprite fallback or missing record deliberately.
6. Add calculator fixtures for new nonlinear/custom rules.
7. Run `npm run check`.
8. Perform desktop hover/click, keyboard, search, tier-filter, and mobile bottom-sheet QA.
