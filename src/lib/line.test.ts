import assert from "node:assert/strict";
import { test } from "node:test";
import { nearest, scaleLine } from "./line";

test("points span the full width, highest value at the top", () => {
  const { at, line } = scaleLine(
    [
      { x: 0, y: 1 },
      { x: 5, y: 3 },
      { x: 10, y: 2 },
    ],
    100,
    50,
    5,
  );
  assert.deepEqual(
    at.map((p) => p.x),
    [0, 50, 100],
  );
  assert.equal(at[1].y, 5);
  assert.equal(at[0].y, 45);
  assert.match(line, /^M 0\.00 45\.00 L 50\.00 5\.00 L 100\.00 25\.00$/);
});

test("a flat series sits in the middle, not on an edge", () => {
  const { at } = scaleLine(
    [
      { x: 0, y: 3 },
      { x: 1, y: 3 },
    ],
    100,
    50,
    0,
  );
  assert.equal(at[0].y, 25);
});

test("included values widen the range, so a target line stays on the chart", () => {
  const { yOf } = scaleLine(
    [
      { x: 0, y: 4 },
      { x: 1, y: 5 },
    ],
    100,
    50,
    0,
    [3],
  );
  assert.equal(yOf(3), 50);
});

test("no points draw nothing", () => {
  assert.equal(scaleLine([], 100, 50).line, "");
});

test("nearest picks the closest point by x", () => {
  assert.equal(nearest([{ x: 0 }, { x: 40 }, { x: 100 }], 65), 1);
  assert.equal(nearest([{ x: 0 }, { x: 40 }, { x: 100 }], 75), 2);
});
