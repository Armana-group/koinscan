import assert from "node:assert/strict";
import { test } from "node:test";
import { rankStakers } from "./pool-stakers";

test("ranks stakers by koin plus vhp and works out shares", () => {
  const result = rankStakers(
    [
      { address: "1small", koin: "0", vhp: "100000000" },
      { address: "1big", koin: "300000000", vhp: "100000000" },
      { address: "1empty", koin: "0", vhp: "0" },
      { address: "1mid", koin: "0", vhp: "200000000" },
    ],
    123,
  );
  assert.equal(result.total, 3);
  assert.equal(result.totalStake, "700000000");
  assert.equal(result.updatedAt, 123);
  assert.deepEqual(
    result.stakers.map((s) => [s.address, s.stake, s.share]),
    [
      ["1big", "400000000", 57.14],
      ["1mid", "200000000", 28.57],
      ["1small", "100000000", 14.28],
    ],
  );
});

test("ties fall back to address order and an empty pool has no shares", () => {
  const tied = rankStakers([
    { address: "1b", koin: "5", vhp: "0" },
    { address: "1a", koin: "0", vhp: "5" },
  ]);
  assert.deepEqual(
    tied.stakers.map((s) => s.address),
    ["1a", "1b"],
  );
  const empty = rankStakers([{ address: "1x", koin: "0", vhp: "0" }]);
  assert.equal(empty.total, 0);
  assert.equal(empty.totalStake, "0");
});
