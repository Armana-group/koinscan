import assert from "node:assert/strict";

const baseUrl = process.env.DAPPS_UI_BASE_URL || "http://localhost:3002";

async function page(path) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.status, 200, `${path} is reachable`);
  return response.text();
}

const pools = await page("/dapps");
assert.match(pools, />Mining pools</, "/dapps is the pools list");
assert.doesNotMatch(pools, /Discover dApps|Fogata 2 empowers/, "/dapps has no hero copy");
assert.doesNotMatch(pools, /Create a mining pool/, "the operator CTA block is gone");
assert.match(pools, /Start a pool/, "operators still have a link");

const redirect = await fetch(`${baseUrl}/dapps/fogata`, { redirect: "manual" });
assert.ok([307, 308].includes(redirect.status), "/dapps/fogata redirects");
assert.match(redirect.headers.get("location") ?? "", /\/dapps$/, "…to /dapps");

const dex = await page("/dapps/dex");
assert.match(dex, />Trade</, "trade page has the short title");
assert.doesNotMatch(dex, /order book decentralized exchange/i, "trade page has no hero title");
assert.doesNotMatch(dex, /tiers? \d/i, "the word tier is not in trade copy");
assert.match(dex, /Waits for a taker/, "the order-placement sentence is present");

for (const html of [pools, dex]) {
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1]);
  assert.ok(h1s.length > 0, "page has a title");
  for (const h1 of h1s) assert.doesNotMatch(h1, /beta/i, "no beta tag inside page titles");
}

console.log("dapps ui regression passed");
