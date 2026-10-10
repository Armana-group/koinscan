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
assert.match(pools, /<h1[^>]*>Fogata<\/h1>/, "/fogata is titled Fogata");
assert.match(pools, /Mine Koinos through a pool/, "/fogata opens with one sentence on what Fogata is");
assert.doesNotMatch(pools, /Discover dApps|Fogata 2 empowers|Mining pools</, "/fogata has no hero copy and no old title");
assert.match(pools, /Start a pool/, "operators have a Start a pool chip");
assert.match(pools, /href="\/fogata\/help#how-koinos-mining-works"[^>]*>How it works/, "How it works is a plain link into the guide");
assert.match(pools, /href="\/fogata\/help#what-changed-in-fogata-2"[^>]*>What(&#x27;|')s new in v2/, "What's new links into the guide");
assert.match(pools, /href="\/fogata\/trade"/, "pools page has the Trade row");
assert.match(pools, /Sell VHP for KOIN, or buy VHP/, "the Trade row is labelled");
assert.ok(pools.indexOf('href="/fogata/trade"') < pools.indexOf("Start a pool"), "the Trade row comes before the pools");
assert.doesNotMatch(pools, /aria-current="page"/, "no tab-style sub-nav on the pools page");

const trade = await page("/fogata/trade");
assert.match(trade, /<h1[^>]*>Trade<\/h1>/, "trade page has the short title");
assert.doesNotMatch(trade, /order book decentralized exchange/i, "trade page has no hero title");
assert.doesNotMatch(visible(trade), /\btiers?\b/i, "the word tier is not in trade copy");
assert.match(trade, /Waits for a taker/, "the order-placement sentence is present");
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
for (const anchor of ["how-koinos-mining-works", "what-changed-in-fogata-2", "deposit-koin-or-vhp", "withdraw-or-leave-a-pool", "choose-your-reward-settings", "trade-koin-and-vhp", "choose-a-pool-and-read-its-page"]) {
  assert.ok(guideDocument.getElementById(anchor), `the guide has the ${anchor} section the pages link to`);
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
  assert.match(html, /class="ks-main/, "the page uses the shared column");
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1]);
  assert.ok(h1s.length > 0, "page has a title");
  for (const h1 of h1s) assert.doesNotMatch(h1, /beta/i, "no beta tag inside page titles");
  assert.doesNotMatch(visible(html), /\bdApps\b/, "the section is not called dApps anywhere");
}

console.log("fogata ui regression passed");
