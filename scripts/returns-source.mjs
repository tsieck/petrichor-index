// The Returns wiki exposes its catalog as a Lua table, independent of RoR2's schema.
export function parseReturnsModule(source) {
  return [...source.matchAll(/^items\["((?:\\.|[^"\\])*)"\]\s*=\s*\{\r?\n([\s\S]*?)^\}/gm)].map(([, name, body]) => {
    const record = { name: JSON.parse(`"${name}"`) };
    for (const [, key, value] of body.matchAll(/^\s*(\w+)\s*=\s*("(?:\\.|[^"\\])*"|\d+)\s*,?\s*$/gm)) {
      record[key] = JSON.parse(value);
    }
    record.Category = [...(body.match(/Category\s*=\s*\{([^}]+)\}/)?.[1] || "").matchAll(/"([^"]+)"/g)].map(([, tag]) => tag);
    return record;
  });
}

export function cleanWikiText(value = "") {
  let text = value;
  // Resolve innermost templates first, including nested color and item links.
  while (/\{\{[^{}]+\}\}/.test(text)) {
    text = text.replace(/\{\{([^{}]+)\}\}/g, (_, template) => {
      const [name, ...parts] = template.split("|");
      return name.toLowerCase() === "color" ? parts.slice(1).join("|") : parts.at(-1) || name;
    });
  }
  return text.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1")
    .replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]*>/g, "")
    .replace(/'{2,3}/g, "").replace(/\s+/g, " ").trim();
}
