import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const endpoints = [
  {
    name: "items",
    url: "https://riskofrain2.wiki.gg/api.php?action=parse&page=Module%3AItems%2FData&prop=wikitext&format=json&formatversion=2",
    output: resolve("data/source/wiki-items-data.json")
  },
  {
    name: "equipment",
    url: "https://riskofrain2.wiki.gg/api.php?action=parse&page=Module%3AEquipment%2FData&prop=wikitext&format=json&formatversion=2",
    output: resolve("data/source/wiki-equipment-data.json")
  }
];

await mkdir(resolve("data/source"), { recursive: true });

for (const endpoint of endpoints) {
  const response = await fetch(endpoint.url, {
    headers: { "User-Agent": "PetrichorIndex/1.0 (static reference data refresh)" }
  });
  if (!response.ok) throw new Error(`Could not fetch ${endpoint.name} data (${response.status}).`);
  const body = await response.text();
  JSON.parse(body);
  await writeFile(endpoint.output, `${body.trim()}\n`);
  console.log(`Fetched ${endpoint.name} source data.`);
}
