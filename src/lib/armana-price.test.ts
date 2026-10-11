import assert from "node:assert/strict";
import { test } from "node:test";
import { armanaHistoryUrl, isPriceRange, parseArmanaHistory, parseArmanaPrice } from "./armana-price";

const answer = {
  asset: "KOIN",
  usd: 0.01863525804921282,
  change_24h: 1.7631112,
  updated: 1791684835,
  sources: [{ name: "coinmarketcap", usd: 0.0186, age_s: 40, used: true }],
};

test("the service's answer keeps the route's response shape", () => {
  assert.deepEqual(parseArmanaPrice(answer), {
    usd: 0.01863525804921282,
    change: 1.7631112,
    timestamp: 1791684835000,
    source: "armana",
  });
});

test("a missing 24-hour change is null, not a failure", () => {
  assert.equal(parseArmanaPrice({ ...answer, change_24h: null })?.change, null);
});

test("unusable answers are rejected", () => {
  assert.equal(parseArmanaPrice(null), null);
  assert.equal(parseArmanaPrice({ error: "no fresh price" }), null);
  assert.equal(parseArmanaPrice({ ...answer, asset: "VHP" }), null);
  assert.equal(parseArmanaPrice({ ...answer, usd: 0 }), null);
  assert.equal(parseArmanaPrice({ ...answer, usd: "0.0186" }), null);
  assert.equal(parseArmanaPrice({ ...answer, updated: undefined }), null);
});

test("reads the price history as millisecond points, oldest first", () => {
  const history = parseArmanaHistory({
    asset: "KOIN",
    range: "24h",
    interval_s: 900,
    points: [
      { t: 1791720900, usd: 0.0187 },
      { t: 1791720000, usd: 0.0186 },
    ],
  });
  assert.deepEqual(history, [
    { t: 1791720000000, usd: 0.0186 },
    { t: 1791720900000, usd: 0.0187 },
  ]);
});

test("drops unusable history points and rejects unusable answers", () => {
  assert.deepEqual(parseArmanaHistory({ asset: "KOIN", points: [{ t: 1, usd: 0 }, { t: "x", usd: 1 }, null, { t: 2, usd: 0.02 }] }), [{ t: 2000, usd: 0.02 }]);
  assert.equal(parseArmanaHistory({ asset: "VHP", points: [] }), null);
  assert.equal(parseArmanaHistory({ asset: "KOIN" }), null);
  assert.equal(parseArmanaHistory(null), null);
});

test("only the three ranges the service offers are accepted", () => {
  assert.equal(isPriceRange("7d"), true);
  assert.equal(isPriceRange("1y"), false);
  assert.equal(armanaHistoryUrl("30d"), "https://koinos.armana.io/v1/price/koin/history?range=30d");
});
