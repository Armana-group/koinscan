import assert from "node:assert/strict";
import { test } from "node:test";
import { slide, summarise, type SampledBlock } from "./block-window";

const block = (height: number, signer: string, seconds = height * 3): SampledBlock => ({ height, timestamp: seconds * 1000, signer });

test("new blocks slide in and the oldest drop off", () => {
  const window = [block(1, "a"), block(2, "b"), block(3, "a")];
  const next = slide(window, [block(4, "c"), block(5, "c")], 3);
  assert.deepEqual(
    next.map((b) => b.height),
    [3, 4, 5],
  );
});

test("a block already in the window is not counted twice", () => {
  const next = slide([block(1, "a"), block(2, "b")], [block(2, "b"), block(3, "c")], 10);
  assert.deepEqual(
    next.map((b) => b.height),
    [1, 2, 3],
  );
});

test("blocks arriving out of order end up in height order", () => {
  const next = slide([], [block(3, "a"), block(1, "b"), block(2, "c")], 10);
  assert.deepEqual(
    next.map((b) => b.height),
    [1, 2, 3],
  );
});

test("shares, average gap and per-block gaps come from the window", () => {
  const summary = summarise([block(1, "a", 0), block(2, "b", 2), block(3, "a", 6), block(4, "a", 9)]);
  assert.deepEqual(summary.producers, [
    { address: "a", blocks: 3, share: 75 },
    { address: "b", blocks: 1, share: 25 },
  ]);
  assert.equal(summary.averageBlockTime, 3);
  assert.deepEqual(summary.blockTimes, [
    { height: 2, seconds: 2 },
    { height: 3, seconds: 4 },
    { height: 4, seconds: 3 },
  ]);
});

test("producers with equal shares keep a stable order", () => {
  const one = summarise([block(1, "b"), block(2, "a")]).producers.map((p) => p.address);
  const two = summarise([block(1, "a"), block(2, "b")]).producers.map((p) => p.address);
  assert.deepEqual(one, ["a", "b"]);
  assert.deepEqual(two, ["a", "b"]);
});

test("an empty or single-block window has no gaps", () => {
  assert.equal(summarise([]).averageBlockTime, 0);
  assert.deepEqual(summarise([block(1, "a")]).blockTimes, []);
});
