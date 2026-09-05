import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateItem } from "../src/calculators.js";
import { parseReturnsModule } from "./returns-source.mjs";

const dataset = JSON.parse(await readFile(new URL("../data/returns-items.json", import.meta.url), "utf8"));
const source = JSON.parse(await readFile(new URL("../data/source/returns-wiki-items-data.json", import.meta.url), "utf8"));
const originalNames = parseReturnsModule(source.parse.wikitext).map((item) => item.name).sort();
assert.deepEqual(dataset.items.map((item) => item.name).sort(), originalNames, "Catalog must cover every source record exactly once");
assert.equal(dataset.items.length, 144);
assert.equal(dataset.meta.total, dataset.items.length);
assert.equal(dataset.meta.passiveItems, 114);
assert.equal(dataset.meta.equipment, 30);
assert.equal(new Set(dataset.items.map((item) => item.id)).size, dataset.items.length);
const expectedTiers = { Common: 33, Uncommon: 33, Legendary: 32, Boss: 7, Equipment: 30, Special: 9 };
assert.deepEqual(dataset.meta.tiers, expectedTiers);

for (const [tier, count] of Object.entries(expectedTiers)) {
  assert.equal(dataset.items.filter((item) => item.tier === tier).length, count, tier);
}
for (const item of dataset.items) {
  for (const field of ["id", "name", "tier", "summary", "exactEffect", "source", "sourceRevision", "lastVerified", "assetSource", "assetKey"]) {
    assert.ok(item[field], `${item.name}: missing ${field}`);
  }
  assert.equal(item.game, "returns");
  assert.ok(item.source.startsWith("https://riskofrainreturns.wiki.gg/"), item.name);
  assert.ok(item.icon.startsWith("./public/assets/returns/"), item.name);
  assert.ok(!item.chef, "RoR2's Wandering CHEF recipes must not leak into Returns");
  assert.ok(!/\{\{|\[\[|<\w/.test(`${item.summary} ${item.exactEffect}`), `${item.name}: unresolved markup`);
  if (item.kind === "equipment") {
    assert.equal(item.tier, "Equipment");
    assert.ok(Number.isFinite(item.equipment.cooldown));
    assert.equal(item.stacking.stats.length, 0);
  } else assert.ok(item.stacking.stats.length, `${item.name}: missing stacking metadata`);
  for (const stacks of [1, 2, 5, 10, 999]) {
    for (const result of calculateItem(item, stacks)) {
      if (!result.supported) assert.equal(result.value, null, `${item.name}: custom rule must not imply a numeric comparison`);
      else {
        assert.ok(Number.isFinite(result.value), `${item.name}: nonfinite result`);
        assert.ok(result.value >= 0, `${item.name}: negative duration or effect`);
      }
    }
  }
  const icon = await readFile(new URL(`../${item.icon}`, import.meta.url));
  assert.equal(icon.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${item.name}: invalid PNG sprite`);
  assert.ok(icon.readUInt32BE(16) > 0 && icon.readUInt32BE(20) > 0, `${item.name}: empty sprite`);
}
console.log(`Validated ${dataset.items.length} Returns records, formulas, source links, and local sprites.`);
