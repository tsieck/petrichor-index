import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const itemSourcePath = resolve(process.argv[2] || "data/source/wiki-items-data.json");
const equipmentSourcePath = resolve(process.argv[3] || "data/source/wiki-equipment-data.json");
const chefSourcePath = resolve(process.argv[4] || "data/source/wandering-chef-recipes.json");
const outputPath = resolve("data/items.json");
const iconConfigPath = resolve("scripts/icon-download.conf");
const verified = "2026-08-10";

const aliases = {
  "57 Leaf Clover": ["clover"],
  "AtG Missile Mk. 1": ["atg", "missile"],
  "Bustling Fungus": ["bungus"],
  "Weeping Fungus": ["wungus"],
  "Lens-Maker's Glasses": ["crit glasses", "glasses"],
  "Soldier's Syringe": ["syringe"],
  "Tougher Times": ["teddy bear", "bear"],
  "Paul's Goat Hoof": ["hoof", "goat hoof"],
  "Personal Shield Generator": ["psg", "shield generator"],
  "Tri-Tip Dagger": ["bleed dagger", "tri tip"],
  "Ukulele": ["uke", "guitar"],
  "Kjaro's Band": ["fire band", "kjaro"],
  "Runald's Band": ["ice band", "runald"],
  "Gesture of the Drowned": ["gesture"],
  "Spare Drone Parts": ["sdp", "drone parts"],
  "Brilliant Behemoth": ["behemoth"],
  "H3AD-5T v2": ["headstompers", "head stompers"],
  "Shatterspleen": ["spleen"],
  "Unstable Tesla Coil": ["tesla"],
  "Fuel Cell": ["fuelcell"],
  "Delicate Watch": ["watch"],
  "Ben's Raincoat": ["raincoat"],
  "Pluripotent Larva": ["larva"],
  "Benthic Bloom": ["benthic"],
  "Executive Card": ["credit card", "card"],
  "Recycler": ["reroll"],
  "Trophy Hunter's Tricorn": ["tricorn", "ahoy"],
  "Eulogy Zero": ["eulogy"],
  "Egocentrism": ["ego"],
  "Light Flux Pauldron": ["light flux"],
  "Purity": ["negative luck"],
  "Sonorous Whispers": ["whispers"],
  "Sale Star": ["sale star"],
  "Chance Doll": ["doll"],
  "Prayer Beads": ["beads"],
  "War Bonds": ["bonds"]
};

function decodeLuaString(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value.slice(1, -1).replaceAll('\\"', '"').replaceAll("\\\\", "\\");
  }
}

function findMatchingBrace(source, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let lineComment = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "-" && next === "-") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Unmatched brace at ${start}`);
}

function extractTable(source, field) {
  const match = new RegExp(`(?:^|\\n)\\s*${field}\\s*=\\s*\\{`).exec(source);
  if (!match) return null;
  const open = source.indexOf("{", match.index);
  return source.slice(open, findMatchingBrace(source, open) + 1);
}

function stringField(source, field) {
  const match = new RegExp(`(?:^|\\n)\\s*${field}\\s*=\\s*("(?:\\\\.|[^"\\\\])*")`).exec(source);
  return match ? decodeLuaString(match[1]) : null;
}

function numberField(source, field) {
  const match = new RegExp(`(?:^|\\n)\\s*${field}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`).exec(source);
  return match ? Number(match[1]) : null;
}

function booleanField(source, field) {
  return new RegExp(`(?:^|\\n)\\s*${field}\\s*=\\s*true`).test(source);
}

function listField(source, field) {
  const table = extractTable(source, field);
  if (!table) return [];
  return [...table.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((match) => decodeLuaString(`"${match[1]}"`));
}

function parseStats(source) {
  const table = extractTable(source, "Stats");
  if (!table) return [];
  const stats = [];
  let index = 1;
  while (index < table.length - 1) {
    if (table[index] !== "{") {
      index += 1;
      continue;
    }
    const end = findMatchingBrace(table, index);
    const block = table.slice(index, end + 1);
    const stat = stringField(`\n${block}`, "Stat");
    if (stat) {
      const rawValue = stringField(`\n${block}`, "Value") ?? numberField(`\n${block}`, "Value");
      const rawAdd = stringField(`\n${block}`, "Add") ?? numberField(`\n${block}`, "Add");
      stats.push({
        stat: stat.trim(),
        base: String(rawValue ?? ""),
        stacking: stringField(`\n${block}`, "Stack") || "None",
        add: String(rawAdd ?? "")
      });
    }
    index = end + 1;
  }
  return stats;
}

function cleanWikiText(input = "") {
  let value = input.replaceAll("\\r\\n", " ");
  let previous;
  do {
    previous = value;
    value = value.replace(/\{\{([^{}]*)\}\}/g, (_, body) => {
      const parts = body.split("|");
      const name = parts.shift()?.trim().toLowerCase();
      if (name === "color") return parts.slice(1).join("|");
      if (name === "stack") return parts.join("|");
      if (name?.endsWith("link")) return parts[1] || parts[0] || "";
      return parts.at(-1) || "";
    });
  } while (value !== previous && value.includes("{{"));
  return value
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function formulaFor(stats) {
  const primary = stats.find((stat) => stat.stacking !== "ProcCoeff");
  if (!primary) return "No stack calculation";
  switch (primary.stacking) {
    case "Linear":
      return `${primary.base} at 1 stack, ${primary.add || "no change"} each additional stack`;
    case "Hyperbolic":
      return "Diminishing returns: coefficient × stacks / (1 + coefficient × stacks)";
    case "Exponential":
      return "Each stack multiplies the remaining value";
    case "Reciprocal":
      return "Base value divided by the stack factor";
    case "None":
      return "Additional stacks do not change this effect";
    default:
      return "Custom in-game stacking behavior";
  }
}

function expansionName(value) {
  return ({ SotV: "Survivors of the Void", SotS: "Seekers of the Storm", AC: "Alloyed Collective" })[value] || "Base Game";
}

function parseEntries(wikitext, kind) {
  const records = [];
  const pattern = new RegExp(`${kind}\\[("(?:\\\\.|[^"\\\\])*")\\]\\s*=\\s*\\{`, "g");
  let match;
  while ((match = pattern.exec(wikitext))) {
    const name = decodeLuaString(match[1]);
    const open = wikitext.indexOf("{", match.index);
    const end = findMatchingBrace(wikitext, open);
    const block = wikitext.slice(open, end + 1);
    const rarity = stringField(`\n${block}`, "Rarity");
    const categories = listField(`\n${block}`, "Category");
    records.push({
      name,
      rarity,
      quote: cleanWikiText(stringField(`\n${block}`, "Quote") || ""),
      description: cleanWikiText(stringField(`\n${block}`, "Desc") || ""),
      expansion: stringField(`\n${block}`, "Expansion"),
      id: stringField(`\n${block}`, "ID") || slugify(name),
      internalName: stringField(`\n${block}`, "LocalizationInternalName") || "",
      categories,
      stats: parseStats(`\n${block}`),
      cooldown: numberField(`\n${block}`, "Cooldown"),
      duration: numberField(`\n${block}`, "Duration"),
      unused: booleanField(`\n${block}`, "Unused"),
      internal: booleanField(`\n${block}`, "Internal")
    });
    pattern.lastIndex = end + 1;
  }
  return records;
}

async function loadWikitext(path) {
  return JSON.parse(await readFile(path, "utf8")).parse.wikitext;
}

const itemRarities = new Set(["Common", "Uncommon", "Legendary", "Boss", "Lunar", "Void", "Meal", "Untiered", "Untiered (Legendary)"]);
const equipmentRarities = new Set(["Equipment", "Lunar Equipment", "Elite Equipment"]);
const sourceItems = parseEntries(await loadWikitext(itemSourcePath), "items")
  .filter((item) => itemRarities.has(item.rarity) && !item.unused && !item.internal && !item.categories.includes("Hidden") && !item.categories.includes("Abandoned") && !item.name.endsWith("(Consumed)"));
const sourceEquipment = parseEntries(await loadWikitext(equipmentSourcePath), "equipment")
  .filter((item) => equipmentRarities.has(item.rarity) && !item.unused && !item.internal && !item.categories.includes("Hidden") && !item.name.endsWith("(Consumed)"));
const chefSource = JSON.parse(await readFile(chefSourcePath, "utf8"));
const chefRecipesByResult = new Map();
for (const recipe of chefSource.recipes) {
  const recipes = chefRecipesByResult.get(recipe.result) || [];
  recipes.push({
    category: recipe.category,
    yield: recipe.yield || 1,
    ingredients: recipe.ingredients,
    note: recipe.note || null
  });
  chefRecipesByResult.set(recipe.result, recipes);
}

const tierSort = new Map(["Common", "Uncommon", "Legendary", "Boss", "Lunar", "Void", "Meal", "Equipment", "Other"].map((tier, index) => [tier, index]));
const items = [...sourceItems, ...sourceEquipment]
  .map((item) => {
    const slug = slugify(item.name);
    const isEquipment = equipmentRarities.has(item.rarity);
    return {
      id: slug,
      gameId: item.id,
      internalName: item.internalName,
      name: item.name,
      aliases: aliases[item.name] || [],
      tier: isEquipment ? "Equipment" : item.rarity.startsWith("Untiered") ? "Other" : item.rarity,
      subTier: isEquipment ? item.rarity : item.rarity.startsWith("Untiered") ? item.rarity : null,
      dlc: expansionName(item.expansion),
      summary: item.quote || item.description,
      exactEffect: item.description || item.quote,
      tags: [...new Set(item.categories.map((category) => category.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()))],
      icon: `public/assets/icons/${slug}.png`,
      sourceIconName: `${item.name}.png`,
      source: `https://riskofrain2.wiki.gg/wiki/${encodeURIComponent(item.name.replaceAll(" ", "_"))}`,
      lastVerified: verified,
      stacking: {
        type: item.stats.find((stat) => stat.stacking !== "ProcCoeff")?.stacking || "None",
        formula: formulaFor(item.stats),
        stats: item.stats
      },
      equipment: isEquipment ? { cooldown: item.cooldown, duration: item.duration } : null,
      chef: chefRecipesByResult.has(item.name) ? {
        source: chefSource.source,
        lastVerified: chefSource.lastVerified,
        recipes: chefRecipesByResult.get(item.name)
      } : null
    };
  })
  .sort((a, b) => tierSort.get(a.tier) - tierSort.get(b.tier) || a.name.localeCompare(b.name));

const indexedNames = new Set(items.map((item) => item.name));
const missingChefResults = [...chefRecipesByResult.keys()].filter((name) => !indexedNames.has(name));
if (missingChefResults.length) throw new Error(`Wandering CHEF results are missing from the catalog: ${missingChefResults.join(", ")}`);

const dataset = {
  meta: {
    title: "Petrichor Index item catalog",
    source: "Risk of Rain 2 Wiki structured item modules",
    sourceUrl: "https://riskofrain2.wiki.gg/wiki/Items",
    lastVerified: verified,
    passiveItems: sourceItems.length,
    equipment: sourceEquipment.length,
    total: items.length,
    chefRecipeResults: chefRecipesByResult.size,
    chefRecipes: chefSource.recipes.length,
    excludedAbandonedRecords: 4,
    excludedConsumedVariants: 7
  },
  items
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);

const curlConfig = [
  "create-dirs",
  "location",
  "fail",
  "silent",
  "show-error",
  "parallel",
  "parallel-max = 8",
  ...items.flatMap((item) => [
    `url = \"https://riskofrain2.wiki.gg/wiki/Special:Redirect/file/${encodeURIComponent(item.sourceIconName)}?width=160\"`,
    `output = \"public/assets/icons/${item.id}.png\"`
  ])
];
await writeFile(iconConfigPath, `${curlConfig.join("\n")}\n`);

console.log(`Generated ${items.length} records (${sourceItems.length} passive, ${sourceEquipment.length} equipment).`);
