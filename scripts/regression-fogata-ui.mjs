import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const baseUrl = process.env.FOGATA_UI_BASE_URL || "http://localhost:3002";

async function page(path) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.status, 200, `${path} is reachable`);
  return response.text();
}

async function redirectsTo(from, to) {
  const response = await fetch(`${baseUrl}${from}`, { redirect: "manual" });
  assert.ok([307, 308].includes(response.status), `${from} redirects`);
  assert.match(response.headers.get("location") ?? "", new RegExp(`${to.replace(/[/[\]]/g, "\\$&")}$`), `${from} → ${to}`);
}

const visible = (html) => html.replace(/<[^>]+>/g, " ");

const pools = await page("/fogata");
assert.match(pools, />Fogata</, "/fogata is the pools page titled Fogata");
assert.doesNotMatch(pools, /Discover dApps|Fogata 2 empowers|Mining pools</, "/fogata has no hero copy and no old title");
assert.doesNotMatch(pools, /Create a mining pool/, "the operator CTA block is gone");
assert.match(pools, /Start a pool/, "operators still have a link");
assert.match(pools, /How it works/, "pools page has the how-it-works disclosure");
assert.match(pools, /href="\/fogata\/trade"/, "pools page has the Trade row");
assert.match(pools, /Sell VHP for KOIN, or buy VHP/, "the Trade row is labelled");
assert.ok(
  pools.indexOf('href="/fogata/trade"') < pools.search(/No pools are listed yet|\/fogata\/1[1-9A-HJ-NP-Za-km-z]{25,}/),
  "the Trade row comes before the pools"
);
assert.doesNotMatch(pools, /aria-current="page"/, "no tab-style sub-nav on the pools page");

const trade = await page("/fogata/trade");
assert.match(trade, />Trade</, "trade page has the short title");
assert.doesNotMatch(trade, /order book decentralized exchange/i, "trade page has no hero title");
assert.doesNotMatch(visible(trade), /\btiers?\b/i, "the word tier is not in trade copy");
assert.match(trade, /Waits for a taker/, "the order-placement sentence is present");
assert.match(trade, /How it works/, "trade page has the how-it-works disclosure");
assert.match(trade, /href="\/fogata"[^>]*>[^<]*Fogata/, "trade page has a back link to Fogata");

const guideHtml = await page("/fogata/help");
const guideDocument = new JSDOM(guideHtml).window.document;
assert.equal(guideDocument.querySelectorAll("h1").length, 1, "guide has one page title");
const article = guideDocument.querySelector("article");
assert.ok(article, "guide is rendered as an article");
const headings = [...article.querySelectorAll("h2, h3")];
const headingIds = headings.map((heading) => heading.id);
assert.ok(headingIds.every(Boolean), "each guide section has an anchor");
assert.equal(new Set(headingIds).size, headingIds.length, "guide section anchors are distinct");
for (const link of article.querySelectorAll('a[href^="#"]')) {
  assert.ok(guideDocument.getElementById(link.getAttribute("href").slice(1)), "contents link resolves to a section");
}
const downloadLink = guideDocument.querySelector('a[download="fogata-guide.md"]');
assert.equal(downloadLink?.getAttribute("href"), "/fogata-guide.md", "download points to the canonical file");
const download = await fetch(`${baseUrl}/fogata-guide.md`);
assert.equal(download.status, 200, "Markdown download is reachable");
assert.equal(await download.text(), await readFile(new URL("../public/fogata-guide.md", import.meta.url), "utf8"), "download preserves the entire canonical source");
for (const html of [pools, trade]) {
  assert.match(html, /href="\/fogata\/help/, "Fogata and Trade expose the full guide");
}

await redirectsTo("/dapps", "/fogata");
await redirectsTo("/dapps/fogata", "/fogata");
await redirectsTo("/dapps/dex", "/fogata/trade");
await redirectsTo("/dapps/fogata/1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk", "/fogata/1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk");

for (const html of [pools, trade]) {
  assert.doesNotMatch(html, /type="number"/, "no native number inputs (spinners, exponent notation)");
  assert.doesNotMatch(html, /max-w-\[640px\]|max-w-\[440px\]/, "one 520px column, no nested narrower column");
  assert.match(html, /max-w-\[520px\]/, "the page uses the shared Fogata column");
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1]);
  assert.ok(h1s.length > 0, "page has a title");
  for (const h1 of h1s) assert.doesNotMatch(h1, /beta/i, "no beta tag inside page titles");
  assert.doesNotMatch(visible(html), /\bdApps\b/, "the section is not called dApps anywhere");
}

console.log("fogata ui regression passed");
