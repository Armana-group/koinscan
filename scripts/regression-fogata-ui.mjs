import assert from "node:assert/strict";

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
assert.match(pools, /href="\/fogata\/trade"/, "pools page links to trade");

const trade = await page("/fogata/trade");
assert.match(trade, />Trade</, "trade page has the short title");
assert.doesNotMatch(trade, /order book decentralized exchange/i, "trade page has no hero title");
assert.doesNotMatch(visible(trade), /\btiers?\b/i, "the word tier is not in trade copy");
assert.match(trade, /Waits for a taker/, "the order-placement sentence is present");
assert.match(trade, /How it works/, "trade page has the how-it-works disclosure");
assert.match(trade, /href="\/fogata"/, "trade page links back to pools");

await redirectsTo("/dapps", "/fogata");
await redirectsTo("/dapps/fogata", "/fogata");
await redirectsTo("/dapps/dex", "/fogata/trade");
await redirectsTo("/dapps/fogata/1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk", "/fogata/1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk");

for (const html of [pools, trade]) {
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1]);
  assert.ok(h1s.length > 0, "page has a title");
  for (const h1 of h1s) assert.doesNotMatch(h1, /beta/i, "no beta tag inside page titles");
  assert.doesNotMatch(visible(html), /\bdApps\b/, "the section is not called dApps anywhere");
}

console.log("fogata ui regression passed");
