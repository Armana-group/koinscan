import assert from "node:assert/strict";
import { test } from "node:test";
import { parseArmanaPrice } from "./armana-price";

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
