const precision = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function parseMeasurement(value) {
  const text = String(value ?? "").trim();
  if (!text || /\d[^\s]*[-–]\d/.test(text)) return null;
  const match = text.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  return { value: Number(match[1]), unit: match[2].trim() };
}

function formatMeasurement(value, unit = "") {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return `${precision.format(normalized)}${unit}`;
}

export function calculateStat(stat, stacks) {
  const count = Math.max(1, Math.floor(Number(stacks) || 1));
  const base = parseMeasurement(stat.base);
  const add = parseMeasurement(stat.add);
  if (!base) return { supported: false, display: stat.base || "—", value: null, unit: "" };

  let value = base.value;
  let unit = base.unit;
  const type = stat.stacking || "None";

  if (type === "Linear" && add) {
    value = base.value + add.value * (count - 1);
  } else if (type === "Hyperbolic" && (base.unit === "%" || add?.unit === "%")) {
    const coefficient = Math.abs((add?.value || base.value) / 100);
    value = (coefficient * count) / (1 + coefficient * count) * 100;
    unit = "%";
  } else if (type === "Reciprocal") {
    const factor = Math.abs(add?.value || 1);
    value = base.value / (1 + factor * (count - 1));
  } else if (type === "Exponential") {
    const rate = Math.abs((add?.value || base.value) / 100);
    if (base.unit === "%") {
      const baseRate = Math.abs(base.value) / 100;
      const statName = String(stat.stat || "").toLowerCase();
      const remainingValue = /reduction/.test(statName) || statName === "cooldown";
      if (base.value < 0) {
        value = -(1 - (1 - baseRate) * (1 - rate) ** (count - 1)) * 100;
      } else if (remainingValue) {
        value = (1 - (1 - baseRate) * (1 - rate) ** (count - 1)) * 100;
      } else if ((add?.value || 0) < 0) {
        value = base.value * (1 - rate) ** (count - 1);
      } else {
        value = ((1 + baseRate) * (1 + rate) ** (count - 1) - 1) * 100;
      }
      unit = "%";
    } else {
      const multiplier = (add?.value || 0) < 0 ? 1 - Math.min(rate, 0.9999) : 1 + rate;
      value = base.value * multiplier ** (count - 1);
    }
  } else if (!["None", "Special", "Custom", "ProcCoeff"].includes(type)) {
    return { supported: false, display: stat.base, value: null, unit: base.unit };
  }

  return { supported: !["Special", "Custom"].includes(type), display: formatMeasurement(value, unit), value, unit };
}

export function calculateItem(item, stacks) {
  const stats = item.stacking.stats.filter((stat) => stat.stacking !== "ProcCoeff");
  return stats.map((stat) => ({ ...stat, ...calculateStat(stat, stacks) }));
}

export function differenceBetween(current, next) {
  if (current.value == null || next.value == null || current.unit !== next.unit) return null;
  const difference = next.value - current.value;
  const sign = difference > 0 ? "+" : "";
  return `${sign}${formatMeasurement(difference, current.unit)}`;
}
