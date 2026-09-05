import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseReturnsModule } from "./returns-source.mjs";
import { setTimeout as pause } from "node:timers/promises";

const source = JSON.parse(await readFile(new URL("../data/source/returns-wiki-items-data.json", import.meta.url), "utf8"));
const metadata = JSON.parse(await readFile(new URL("../data/source/returns-wiki-images.json", import.meta.url), "utf8"));
const records = parseReturnsModule(source.parse.wikitext);
const directory = new URL("../public/assets/returns/", import.meta.url);
await mkdir(directory, { recursive: true });

for (const record of records) {
  const destination = new URL(encodeURIComponent(record.Icon), directory);
  const existing = await readFile(destination).catch(() => null);
  if (existing?.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") continue;
  const normalized = `File:${record.Icon.replaceAll("_", " ")}`;
  const image = metadata.images.find((entry) => entry.title === normalized)?.imageinfo?.[0];
  if (!image?.url) throw new Error(`Missing sprite metadata: ${record.name}.`);
  let response;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    response = await fetch(image.url, { signal: AbortSignal.timeout(30000) });
    if (response.status !== 429) break;
    const retryAfter = Number(response.headers.get("retry-after"));
    const delay = retryAfter > 0 ? retryAfter * 1000 : 15000 * (attempt + 1);
    if (delay > 60000) throw new Error(`Wiki requested a ${retryAfter}-second pause. Run the importer again after that delay.`);
    console.log(`Wiki rate limit; pausing ${delay / 1000}s before retrying ${record.name}.`);
    await response.body?.cancel();
    await pause(delay);
  }
  if (!response.ok) throw new Error(`Sprite request failed: ${record.name} (${response.status}).`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`Not a PNG: ${record.name}.`);
  await writeFile(destination, buffer);
  if ((records.indexOf(record) + 1) % 20 === 0) console.log(`Imported ${records.indexOf(record) + 1} / ${records.length} sprites.`);
  await pause(1000);
}
console.log(`Imported ${records.length} local Returns sprites.`);
