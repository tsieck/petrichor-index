import test from "node:test";
import assert from "node:assert/strict";
import { calculateStat, differenceBetween, parseMeasurement } from "../src/calculators.js";

test("parses numeric values and units", () => {
  assert.deepEqual(parseMeasurement("+15%"), { value: 15, unit: "%" });
  assert.deepEqual(parseMeasurement("2.5m"), { value: 2.5, unit: "m" });
  assert.equal(parseMeasurement("5m-100m"), null);
});

test("Soldier's Syringe stacks linearly", () => {
  const stat = { base: "15%", add: "+15%", stacking: "Linear" };
  assert.equal(calculateStat(stat, 1).display, "15%");
  assert.equal(calculateStat(stat, 2).display, "30%");
  assert.equal(calculateStat(stat, 5).display, "75%");
  assert.equal(calculateStat(stat, 10).display, "150%");
});

test("Tougher Times uses hyperbolic diminishing returns", () => {
  const stat = { base: "15%", add: "+15%", stacking: "Hyperbolic" };
  assert.equal(calculateStat(stat, 1).display, "13.04%");
  assert.equal(calculateStat(stat, 2).display, "23.08%");
  assert.equal(calculateStat(stat, 5).display, "42.86%");
  assert.equal(calculateStat(stat, 10).display, "60%");
});

test("exponential cooldown halves each additional stack", () => {
  const stat = { stat: "Cooldown", base: "30s", add: "-50%", stacking: "Exponential" };
  assert.equal(calculateStat(stat, 1).display, "30s");
  assert.equal(calculateStat(stat, 2).display, "15s");
  assert.equal(calculateStat(stat, 5).display, "1.88s");
  assert.equal(calculateStat(stat, 10).display, "0.06s");
});

test("exponential reductions preserve the first-stack value", () => {
  const gesture = { stat: "Cooldown Reduction", base: "50%", add: "15%", stacking: "Exponential" };
  assert.equal(calculateStat(gesture, 1).display, "50%");
  assert.equal(calculateStat(gesture, 2).display, "57.5%");
  assert.equal(calculateStat(gesture, 5).display, "73.9%");
});

test("multiplicative damage doubles total damage per stack", () => {
  const shapedGlass = { stat: "Damage", base: "100%", add: "+100%", stacking: "Exponential" };
  assert.equal(calculateStat(shapedGlass, 1).display, "100%");
  assert.equal(calculateStat(shapedGlass, 2).display, "300%");
  assert.equal(calculateStat(shapedGlass, 5).display, "3,100%");
});

test("negative exponential penalties keep their sign", () => {
  const tonic = { stat: "Most", base: "-5%", add: "-5%", stacking: "Exponential" };
  assert.equal(calculateStat(tonic, 1).display, "-5%");
  assert.equal(calculateStat(tonic, 2).display, "-9.75%");
});

test("next-stack marginal gain is explicit", () => {
  const stat = { base: "15%", add: "+15%", stacking: "Linear" };
  assert.equal(differenceBetween(calculateStat(stat, 5), calculateStat(stat, 6)), "+15%");
});
