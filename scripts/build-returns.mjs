import { readFile, writeFile } from "node:fs/promises";
import { parseReturnsModule, cleanWikiText } from "./returns-source.mjs";
import { stats, notes } from "../data/source/returns-stacking.js";

const load = async (file) => JSON.parse(await readFile(new URL(`../data/source/${file}`, import.meta.url), "utf8"));
const source = await load("returns-wiki-items-data.json");
const images = await load("returns-wiki-images.json");
const pages = await load("returns-wiki-pages.json");
const records = parseReturnsModule(source.parse.wikitext);
const verified = source.retrievedAt.slice(0, 10);
const wiki = "https://riskofrainreturns.wiki.gg/wiki/";
const order = ["Common", "Uncommon", "Legendary", "Boss", "Equipment", "Special"];
const slug = (value) => value.normalize("NFKD").replace(/[’']/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
const aliases = {
  "Soldier's Syringe": ["syringe"],
  "Lens Maker's Glasses": ["crit glasses", "glasses", "lens-maker's glasses"],
  "Bustling Fungus": ["bungus", "fungus"],
  "Hermit's Scarf": ["scarf", "dodge", "evasion"],
  "Tough Times": ["teddy bear", "bear", "armor"],
  "Paul's Goat Hoof": ["hoof", "goat hoof"],
  "AtG Missile Mk. 1": ["atg", "missile"],
  "AtG Missile Mk. 2": ["atg", "missile"],
  "56 Leaf Clover": ["clover", "elite drops"],
  "Will-O'-The-Wisp": ["wisp", "will o the wisp"],
  "Ukulele": ["uke"],
  "Dio's Best Friend": ["dio", "revive"],
  "Imp Overlord's Tentacle": ["imp", "tentacle"],
  "Marinated Lizard Loaf": ["chef meal"],
  "Golem Essence on the Rocks": ["chef meal"]
};

const summaries = {
  "Tough Times": "Increase armor to reduce incoming damage.",
  "Predatory Instincts": "Critical strikes build an attack speed buff.",
  "Prescriptions": "Temporarily increase damage and attack speed.",
  "Snowglobe": "Freeze enemies in a snowstorm."
};

function formulaFor(stat) {
  if (!stat) return "Equipment occupies one slot; additional copies do not stack";
  if (stat.stacking === "Custom") return "See effect and mechanics notes for this item's stacking behavior";
  if (stat.stacking === "None") return "Additional stacks do not change this effect";
  if (stat.stacking === "Hyperbolic") return "0.1 × stacks / (1 + 0.1 × stacks)";
  if (stat.stacking === "Exponential") return "(1 − 0.75^stacks) × 100% cooldown reduction";
  let formula = `${stat.base} at 1 stack, ${stat.add.startsWith("-") ? "" : "+"}${stat.add} each additional stack`;
  if (Number.isFinite(stat.maxValue)) formula += `; maximum ${stat.maxValue}${stat.base.includes("%") ? "%" : ""}`;
  if (Number.isFinite(stat.minValue)) formula += `; minimum ${stat.minValue}`;
  return formula;
}

// These temporary meals are described on CHEF's page, not in the item module.
const chef = pages.pages.find((page) => page.title === "CHEF");
const chefText = chef.revisions[0].slots.main.content;
const mealEffects = new Map();
for (const row of chefText.split("\n|-")) {
  const columns = row.split("||");
  if (columns.length !== 3) continue;
  const meal = records.find((record) => record.Type === "Meal" && columns[0].includes(record.name));
  if (meal) mealEffects.set(meal.name, cleanWikiText(columns[2].split("\n|}")[0]));
}

const items = records.map((record) => {
  const equipment = record.Rarity === "Equipment" || record.Type === "Equipment";
  const tier = equipment ? "Equipment" : record.Rarity === "Rare" ? "Legendary" : record.Rarity;
  const itemStats = equipment ? [] : stats[record.name];
  if (!itemStats) throw new Error(`No reviewed stacking metadata for ${record.name}.`);
  const image = images.images.find((entry) => entry.title === `File:${record.Icon.replaceAll("_", " ")}`)?.imageinfo?.[0];
  if (!image?.url) throw new Error(`Missing sprite provenance for ${record.name}.`);
  const itemNotes = [...(notes[record.name] || [])];
  if (record.Type === "Meal") itemNotes.push("CHEF's COOK or BUFFET produces this temporary meal. Copies expire together; picking up another copy refreshes the 30-second timer.");
  const pageName = record.name === "Small Enigma" ? "Artifact of Enigma" : (record.Link || record.name).split("#")[0];
  const page = pages.pages.find((entry) => entry.title === pageName);
  if (!page?.revisions?.length) throw new Error(`Missing item-page provenance for ${record.name}.`);
  const sourcePath = record.Link || record.name;
  const [article, anchor] = sourcePath.split("#");
  return {
    id: slug(record.name),
    name: record.name,
    tier,
    subTier: equipment && record.Rarity !== "Equipment" ? `${record.Rarity} Equipment` : record.Type === "Meal" ? "Meal" : "",
    kind: equipment ? "equipment" : "item",
    game: "returns",
    dlc: "Risk of Rain Returns",
    aliases: aliases[record.name] || [],
    tags: [...record.Category, ...(record.Type === "Meal" ? ["CHEF", "meal", "temporary"] : [])],
    summary: summaries[record.name] || cleanWikiText(record.Pickup),
    exactEffect: record.name === "Prescriptions" ? "Increase damage by 30% and attack speed by 40% for 15 seconds." : mealEffects.get(record.name) || cleanWikiText(record.Desc || record.Pickup),
    unlock: cleanWikiText(record.Unlock || record.From),
    icon: `./public/assets/returns/${encodeURIComponent(record.Icon)}`,
    assetSource: image.descriptionurl,
    assetKey: record.Icon,
    source: `${wiki}${encodeURIComponent(article.replaceAll(" ", "_"))}${anchor ? `#${anchor}` : ""}`,
    sourceRevision: page.revisions[0].revid,
    lastVerified: verified,
    stacking: { type: itemStats[0]?.stacking || "None", formula: formulaFor(itemStats[0]), stats: itemStats },
    ...(equipment ? { equipment: { cooldown: record.Cooldown } } : {}),
    ...(itemNotes.length ? { notes: itemNotes } : {})
  };
}).sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier) || a.name.localeCompare(b.name));

const dataset = {
  meta: {
    game: "Risk of Rain Returns",
    total: items.length,
    passiveItems: items.filter((item) => item.kind === "item").length,
    equipment: items.filter((item) => item.kind === "equipment").length,
    tiers: Object.fromEntries(order.map((tier) => [tier, items.filter((item) => item.tier === tier).length])),
    lastVerified: verified,
    source: `${wiki}Module:Items/Data`,
    license: "https://creativecommons.org/licenses/by-sa/4.0/"
  },
  items
};
await writeFile(new URL("../data/returns-items.json", import.meta.url), `${JSON.stringify(dataset, null, 2)}\n`);
console.log(`Built ${items.length} Returns entries: ${dataset.meta.passiveItems} passive / special, ${dataset.meta.equipment} equipment.`);
