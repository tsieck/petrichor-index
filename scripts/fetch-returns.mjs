import { mkdir, writeFile } from "node:fs/promises";
import { parseReturnsModule } from "./returns-source.mjs";

const api = "https://riskofrainreturns.wiki.gg/api.php";
const directory = new URL("../data/source/", import.meta.url);
const retrievedAt = new Date().toISOString();
await mkdir(directory, { recursive: true });

async function request(parameters) {
  const response = await fetch(`${api}?${new URLSearchParams({ format: "json", formatversion: "2", ...parameters })}`, {
    headers: { "User-Agent": "PetrichorIndex/1.0 (unofficial game reference; public wiki data refresh)" },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`Returns wiki request failed (${response.status}).`);
  const result = await response.json();
  if (result.error) throw new Error(JSON.stringify(result.error));
  return result;
}

async function save(name, data) {
  await writeFile(new URL(name, directory), `${JSON.stringify({ retrievedAt, ...data }, null, 2)}\n`);
}

const catalog = await request({ action: "parse", page: "Module:Items/Data", prop: "wikitext" });
const records = parseReturnsModule(catalog.parse.wikitext);
if (records.length < 140) throw new Error(`Unexpected catalog size: ${records.length}. Review the source schema.`);
await save("returns-wiki-items-data.json", catalog);
console.log(`Fetched ${records.length} Returns catalog entries.`);

const titles = [...new Set(records.map((record) => (record.Link || record.name).split("#")[0]))];
const pages = [];
for (let start = 0; start < titles.length; start += 40) {
  const result = await request({ action: "query", prop: "revisions", rvprop: "ids|timestamp|content", rvslots: "main", redirects: "1", titles: titles.slice(start, start + 40).join("|") });
  pages.push(...result.query.pages);
}
await save("returns-wiki-pages.json", { pages });
console.log(`Fetched ${pages.length} item pages for stacking notes and provenance.`);

const images = [];
for (let start = 0; start < records.length; start += 40) {
  const result = await request({ action: "query", prop: "imageinfo", iiprop: "url|extmetadata", titles: records.slice(start, start + 40).map((record) => `File:${record.Icon}`).join("|") });
  images.push(...result.query.pages);
}
await save("returns-wiki-images.json", { images });
console.log(`Resolved ${images.length} sprite sources.`);

const rights = await request({ action: "query", meta: "siteinfo", siprop: "rightsinfo" });
await save("returns-wiki-rights.json", rights.query);
