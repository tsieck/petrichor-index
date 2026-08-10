import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const dataset = JSON.parse(await readFile(new URL("../data/items.json", import.meta.url), "utf8"));
const errors = [];
const ids = new Set();
const spriteFixtures = new Map([
  ["armor-piercing-rounds", "bossDamage"],
  ["backup-magazine", "backupMag"],
  ["bison-steak", "steak"],
  ["hooks-of-heresy", "purpleBlade"],
  ["lens-makers-glasses", "glasses"],
  ["soldiers-syringe", "syringe"],
  ["soulbound-catalyst", "Soulbound Catalyst.png"],
  ["spectral-circlet", "Spectral Circlet.png"],
  ["tougher-times", "bear"]
]);

if (dataset.meta.total !== dataset.items.length) errors.push("Metadata total does not match record count.");
if (dataset.meta.passiveItems !== 178) errors.push(`Expected 178 player-facing passive items, found ${dataset.meta.passiveItems}.`);
if (dataset.meta.equipment !== 42) errors.push(`Expected 42 equipment, found ${dataset.meta.equipment}.`);
if (dataset.meta.chefRecipeResults !== 73) errors.push(`Expected 73 Wandering CHEF results, found ${dataset.meta.chefRecipeResults}.`);
if (dataset.meta.chefRecipes !== 80) errors.push(`Expected 80 Wandering CHEF recipes, found ${dataset.meta.chefRecipes}.`);
const chefItems = dataset.items.filter((item) => item.chef);
const attachedChefRecipes = chefItems.reduce((total, item) => total + item.chef.recipes.length, 0);
if (chefItems.length !== dataset.meta.chefRecipeResults) errors.push(`Attached CHEF result count is ${chefItems.length}, expected ${dataset.meta.chefRecipeResults}.`);
if (attachedChefRecipes !== dataset.meta.chefRecipes) errors.push(`Attached CHEF recipe count is ${attachedChefRecipes}, expected ${dataset.meta.chefRecipes}.`);

for (const item of dataset.items) {
  if (item.name.endsWith("(Consumed)")) errors.push(`Consumed variant should not be indexed: ${item.name}.`);
  for (const field of ["id", "name", "tier", "summary", "exactEffect", "source", "lastVerified"]) {
    if (!item[field]) errors.push(`${item.name || item.id || "Unknown"} is missing ${field}.`);
  }
  if (ids.has(item.id)) errors.push(`Duplicate id: ${item.id}.`);
  ids.add(item.id);
  if (!item.assetSource || !item.assetKey) errors.push(`${item.name} is missing sprite provenance.`);
  if (spriteFixtures.has(item.id) && item.assetKey !== spriteFixtures.get(item.id)) {
    errors.push(`${item.name} has sprite key ${item.assetKey}; expected ${spriteFixtures.get(item.id)}.`);
  }
  try {
    await access(new URL(`../${item.icon}`, import.meta.url), constants.R_OK);
  } catch {
    errors.push(`Missing icon: ${item.icon}.`);
  }
  if (item.chef) {
    if (!item.chef.source || !item.chef.lastVerified || !item.chef.recipes?.length) errors.push(`${item.name} has incomplete CHEF provenance.`);
    for (const recipe of item.chef.recipes || []) {
      if (!recipe.category || !Number.isInteger(recipe.yield) || recipe.yield < 1) errors.push(`${item.name} has an invalid CHEF recipe header.`);
      if (recipe.ingredients?.length !== 2 || recipe.ingredients.some((group) => !Array.isArray(group) || !group.length)) {
        errors.push(`${item.name} has an invalid CHEF ingredient pair.`);
      }
    }
  }
}

for (const meal of dataset.items.filter((item) => item.tier === "Meal")) {
  if (!meal.chef?.recipes?.length) errors.push(`${meal.name} is missing its Wandering CHEF recipe.`);
}

if (errors.length) {
  console.error(errors.slice(0, 30).join("\n"));
  if (errors.length > 30) console.error(`...and ${errors.length - 30} more errors.`);
  process.exit(1);
}

console.log(`Validated ${dataset.items.length} complete records and local icons.`);
