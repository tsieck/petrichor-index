# Risk of Rain Returns sources

Retrieved and reviewed September 5, 2026. This is a separate dataset from Risk of Rain 2; similarly named items are never used as a mechanics source across games.

## Catalog and artwork

The [Returns Wiki item module](https://riskofrainreturns.wiki.gg/wiki/Module:Items/Data) provides 144 records, pickup descriptions, detailed effects, rarity, category, equipment cooldowns, and sprite filenames. All 144 are included. The wiki's `Rare` tier is displayed as **Legendary**. Boss and special equipment are included in **Equipment**, with their original rarity retained as a subtitle. CHEF's five meals remain **Special**.

The resulting counts are 33 Common, 33 Uncommon, 32 Legendary, 7 passive Boss, 30 Equipment, and 9 Special. The latter includes CHEF's meals, Keycard, Small Enigma, White Undershirt (M), and Metal Scrap. Lost Pickaxe and Evolved Nematocyst Nozzle are included.

Raw module, item-page revision text, image metadata, and the wiki's declared license are checked in as `data/source/returns-wiki-*.json`. Each normalized item includes its source page, revision ID, verification date, and image-file attribution. Sprites are downloaded into `public/assets/returns/` and served locally. Game artwork remains the property of its respective owners.

## Formula decisions

`data/source/returns-stacking.js` maps each passive or special pickup deliberately. Most numeric effects follow the module's explicit first-stack and per-stack values. Chances cap at 100%; Heaven Cracker cannot trigger more often than every basic attack. Damage percentages are not capped at 100%.

Item-page notes supply these notable corrections:

- [Hermit's Scarf](https://riskofrainreturns.wiki.gg/wiki/Hermit%27s_Scarf): hyperbolic evasion, `0.1n / (1 + 0.1n)`.
- [Rapid Mitosis](https://riskofrainreturns.wiki.gg/wiki/Rapid_Mitosis): multiplicative cooldown reduction, `1 - 0.75^n`.
- Paul's Goat Hoof, Mocha, Red Whip, and Hunter's Harpoon: flat movement-speed changes in km/h rather than the listed percentages.
- [CHEF](https://riskofrainreturns.wiki.gg/wiki/CHEF#Possible_meals_generated_from_COOK_or_BUFFET): exact meal effects and the shared 30-second expiration timer.
- [Ancient Scepter](https://riskofrainreturns.wiki.gg/wiki/Ancient_Scepter): no cooldown reduction from the first copy.
- [Prescriptions](https://riskofrainreturns.wiki.gg/wiki/Prescriptions): the item-page notes update the effect to 15 seconds despite the catalog's older description.

Nine primary effects remain descriptive: Mu Construct, Rusty Jetpack, Golden Gun, Alien Head, Ancient Scepter, Umbrella, Imp Overlord's Tentacle, Small Enigma, and Fried Eyeball. Their sources do not specify a complete curve, cap, or required contextual inputs. Toxic Centipede's infection duration is calculated while its recharge interval stays descriptive. These effects produce no invented marginal numbers or numeric stack table. Equipment shows its activation cooldown instead of implying that duplicate equipment stacks.

These are item-isolated comparisons. Attack timings, other items, current gold, enemy state, and survivor-specific interactions can change actual outcomes. Source-provided corrections are shown next to the effect where relevant.

## Attribution and adaptation

The Wiki API declares [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The adapted Returns catalog, mechanics mapping, and source snapshots retain that license. Changes include markup removal, normalization to the app's schema, sorting, search aliases, calculator metadata, and summarized mechanics notes. The page footer credits the wiki and links the license; every item links its source. This data attribution does not claim ownership of, or relicense, game artwork.

## Refresh and verification

1. Run `npm run fetch:returns` to refresh the module, item pages, image metadata, and license statement.
2. Review changed mechanics and update `data/source/returns-stacking.js`; every passive record requires a mapping.
3. Run `npm run build:returns` and `npm run import:returns-icons`.
4. If deliberately updating existing artwork, replace only the relevant cached PNG before running the importer; valid PNGs are otherwise reused.
5. Run `npm run check`. Review and update the explicit catalog counts if the game's content changes.
6. Check both games in the browser: switching, search, tier filters, keyboard navigation, stack changes, equipment, and the mobile detail sheet.
