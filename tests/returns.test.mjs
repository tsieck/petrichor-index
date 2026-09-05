import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateItem, calculateStat, differenceBetween } from "../src/calculators.js";
import { parseReturnsModule, cleanWikiText } from "../scripts/returns-source.mjs";

const load = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const returns = load("../data/returns-items.json");
const ror2 = load("../data/items.json");
const item = (name) => returns.items.find((entry) => entry.name === name);
const value = (name, stacks) => calculateItem(item(name), stacks)[0];

test("each game retains its own syringe and missile mechanics", () => {
  assert.equal(value("Soldier's Syringe", 2).display, "24%");
  assert.equal(calculateItem(ror2.items.find((entry) => entry.name === "Soldier's Syringe"), 2)[0].display, "30%");
  assert.equal(value("AtG Missile Mk. 1", 2).display, "20%");
  assert.equal(calculateItem(item("AtG Missile Mk. 1"), 2)[1].display, "300%");
});

test("Returns uses armor for Tough Times and hyperbolic evasion for Hermit's Scarf", () => {
  assert.equal(value("Tough Times", 2).display, "28");
  assert.equal(value("Hermit's Scarf", 1).display, "9.09%");
  assert.equal(value("Hermit's Scarf", 10).display, "50%");
});

test("Rapid Mitosis multiplies the remaining equipment cooldown", () => {
  assert.equal(value("Rapid Mitosis", 1).display, "25%");
  assert.equal(value("Rapid Mitosis", 2).display, "43.75%");
  assert.equal(value("Rapid Mitosis", 4).display, "68.36%");
});

test("chance caps and minimum attack intervals hold at high stack counts", () => {
  assert.equal(value("Beating Embryo", 3).display, "90%");
  assert.equal(value("Beating Embryo", 4).display, "100%");
  assert.equal(differenceBetween(value("Beating Embryo", 4), value("Beating Embryo", 5)), "0%");
  assert.equal(value("Heaven Cracker", 2).value, 3);
  assert.equal(value("Heaven Cracker", 999).value, 1);
  assert.equal(value("Lens Maker's Glasses", 999).value, 100);
});

test("movement speed corrections use flat km/h, and meals use their own effects", () => {
  assert.equal(value("Paul's Goat Hoof", 2).display, "6km/h");
  assert.equal(value("Red Whip", 2).display, "24km/h");
  assert.equal(value("Marinated Lizard Loaf", 2).display, "30%");
  assert.match(item("Big Bison Steak").exactEffect, /0.6 HP\/s/);
  assert.match(item("Jelly Brain Salad").exactEffect, /0.5s/);
});

test("unverified custom curves do not imply zero marginal gain", () => {
  for (const name of ["Umbrella", "Ancient Scepter", "Alien Head", "Mu Construct", "Imp Overlord's Tentacle"]) {
    assert.equal(value(name, 10).supported, false);
    assert.equal(value(name, 10).value, null);
    assert.equal(differenceBetween(value(name, 1), value(name, 2)), null);
  }
  const result = calculateStat({ stat: "Custom", base: "15s", stacking: "Special" }, 2);
  assert.equal(result.value, null);
});

test("equipment keeps cooldowns and boss provenance without passive formulas", () => {
  const nozzle = item("Evolved Nematocyst Nozzle");
  assert.equal(nozzle.tier, "Equipment");
  assert.equal(nozzle.subTier, "Boss Equipment");
  assert.equal(nozzle.equipment.cooldown, 24);
  assert.deepEqual(calculateItem(nozzle, 2), []);
  assert.equal(item("Prescriptions").exactEffect, "Increase damage by 30% and attack speed by 40% for 15 seconds.");
});

test("source parser preserves item names, categories, and nested descriptions", () => {
  const source = load("../data/source/returns-wiki-items-data.json");
  const records = parseReturnsModule(source.parse.wikitext);
  assert.equal(records.length, 144);
  assert.deepEqual(records.find((entry) => entry.name === "Mocha").Category.toSorted(), ["Damage", "Utility"]);
  assert.equal(cleanWikiText("{{color|d|A {{color|g|nested}} effect}} [[Page|label]]"), "A nested effect label");
});
