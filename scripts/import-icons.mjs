import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const mappingPath = resolve(process.argv[2] || "data/source/build-planner-items.js");
const assetRoot = resolve(process.argv[3] || "/private/tmp/ror2-build-planner-assets/ror2-build-planner-main/public/img");
const dataPath = resolve("data/items.json");
const iconRoot = resolve("public/assets/icons");

const mappingSource = await readFile(mappingPath, "utf8");
const map = new Map();

function extractAssignedArray(source, variableName) {
  const assignment = source.indexOf(`const ${variableName} =`);
  if (assignment < 0) throw new Error(`Could not find ${variableName} in the sprite mapping.`);
  const start = source.indexOf("[", assignment);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "[") depth += 1;
    if (character === "]") {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(start, index + 1));
    }
  }
  throw new Error(`Unclosed ${variableName} array in the sprite mapping.`);
}

const itemGroups = extractAssignedArray(mappingSource, "itemsByRarity");
for (const group of itemGroups) {
  for (const item of group.items || []) {
    if (item.name && item.image) map.set(item.name, item.image);
  }
}

const manualAliases = new Map([
  ["Tri-Tip Dagger", "tritip"],
  ["Bison Steak", "steak"],
  ["Milky Chrysalis", "larva"],
  ["Pocket I.C.B.M.", "hugeMissile"],
  ["Will-o'-the-wisp", "wisp"],
  ["Aurelionite's Blessing", "goldenSeed"],
  ["Fuel Array", "fuelArray"],
  ["Her Biting Embrace", "iceAspect"],
  ["Ifrit's Distinction", "fireAspect"],
  ["N'kuhana's Retort", "affixMalachite"],
  ["Of One Mind", "alloyedCollective"],
  ["Shared Design", "pyramid"],
  ["Silence Between Two Strikes", "lightningAspect"],
  ["Spinel Tonic", "tonic"],
  ["Volcanic Egg", "magmaEgg"],
  ["Hooks of Heresy", "purpleBlade"],
  ["Dio's Best Friend (Consumed)", "dio"],
  ["Delicate Watch (Broken)", "brokenWatch"],
  ["Empty Bottle", "bottle"],
  ["Pluripotent Larva (Consumed)", "corruptedDio"],
  ["Regenerating Scrap (Consumed)", "orangeScrap"],
  ["Sale Star (Consumed)", "saleStar"],
  ["Tonic Affliction", "tonic"],
  ["Unstable Transmitter (Consumed)", "unstableTramsmitter"],
  ["Trophy Hunter's Tricorn (Consumed)", "hat"],
  ["Seed of Life (Consumed)", "seedOfLife"]
]);

const dataset = JSON.parse(await readFile(dataPath, "utf8"));
const missing = [];
let imported = 0;
let retainedWikiSprites = 0;
let retainedLocalSprites = 0;
await mkdir(iconRoot, { recursive: true });

for (const item of dataset.items) {
  const imageName = map.get(item.name) || manualAliases.get(item.name);
  const source = imageName ? resolve(assetRoot, `${imageName}.webp`) : null;
  if (!source || !existsSync(source)) {
    const localSprite = resolve(iconRoot, `${item.id}.webp`);
    if (imageName && existsSync(localSprite)) {
      item.icon = `public/assets/icons/${item.id}.webp`;
      item.assetSource = "https://github.com/diogoriba/ror2-build-planner";
      item.assetKey = imageName;
      retainedLocalSprites += 1;
      continue;
    }
    const wikiSprite = resolve(iconRoot, `${item.id}.png`);
    if (existsSync(wikiSprite)) {
      item.icon = `public/assets/icons/${item.id}.png`;
      item.assetSource = item.source;
      item.assetKey = item.sourceIconName;
      retainedWikiSprites += 1;
      continue;
    }
    missing.push(item.name);
    continue;
  }
  const destination = resolve(iconRoot, `${item.id}.webp`);
  await copyFile(source, destination);
  item.icon = `public/assets/icons/${item.id}.webp`;
  item.assetSource = "https://github.com/diogoriba/ror2-build-planner";
  item.assetKey = imageName;
  imported += 1;
}

await writeFile(dataPath, `${JSON.stringify(dataset, null, 2)}\n`);
console.log(`Imported ${imported} real item sprites.`);
if (retainedLocalSprites) console.log(`Retained ${retainedLocalSprites} already-local sprites.`);
if (retainedWikiSprites) console.log(`Retained ${retainedWikiSprites} wiki sprites for records absent from the asset pack.`);
if (missing.length) console.log(`Missing (${missing.length}): ${missing.join(", ")}`);
