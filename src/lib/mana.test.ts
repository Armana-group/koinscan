import assert from "node:assert/strict";
import { test } from "node:test";
import { manaSummary } from "./mana";

test("full mana reads as full", () => {
  assert.deepEqual(manaSummary("100000000", "100000000"), { percent: 100, fullIn: "full" });
});

test("mana above the balance is clamped", () => {
  assert.deepEqual(manaSummary("200000000", "100000000"), { percent: 100, fullIn: "full" });
});

test("partly spent mana says when it refills", () => {
  // 92% left: 8% of five days is 9.6 hours
  assert.deepEqual(manaSummary("92000000", "100000000"), { percent: 92, fullIn: "full in 10 h" });
  // 10% left: 4.5 days
  assert.deepEqual(manaSummary("10000000", "100000000"), { percent: 10, fullIn: "full in 5 d" });
  // 99.99% left: under a minute, shown as one
  assert.equal(manaSummary("99990000", "100000000")?.fullIn, "full in 1 min");
});

test("no KOIN means no mana", () => {
  assert.deepEqual(manaSummary("0", "0"), { percent: 0, fullIn: "no KOIN" });
});

test("bad input is null", () => {
  assert.equal(manaSummary(null, "1"), null);
  assert.equal(manaSummary("x", "1"), null);
});
