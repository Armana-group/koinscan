import assert from "node:assert/strict";
import { test } from "node:test";
import { extremes, spikeHeights, spikeLayout } from "./spikes";

test("spikes sit evenly across the width and touch at the centre line", () => {
  const { shapes, mid } = spikeLayout([10, -10, 10, -10], 400, 200, 0);
  assert.equal(mid, 100);
  assert.deepEqual(
    shapes.map((s) => s.x),
    [50, 150, 250, 350],
  );
  assert.equal(shapes[0].half, 50);
  assert.match(shapes[0].path, /^M 0\.00 100\.00 L 50\.00 0\.00 L 100\.00 100\.00 Z$/);
});

test("money in rises above the centre line, money out drops below it", () => {
  const { shapes, mid } = spikeLayout([5, -5], 200, 200, 0);
  assert.ok(shapes[0].y < mid);
  assert.ok(shapes[1].y > mid);
  assert.equal(mid - shapes[0].y, shapes[1].y - mid);
});

test("the centre line moves so the bigger side gets the room, keeping proportions", () => {
  // 43,000 out and 13,000 in: the line sits about a quarter of the way down.
  const { shapes, mid } = spikeLayout([13000, -43000], 200, 200, 0);
  assert.ok(Math.abs(mid - (200 * 13000) / 56000) < 1e-9);
  assert.ok(Math.abs(shapes[0].y) < 1e-9);
  assert.ok(Math.abs(shapes[1].y - 200) < 1e-9);
});

test("only money in puts the centre line at the bottom", () => {
  assert.equal(spikeLayout([1, 2, 3], 300, 100, 0).mid, 100);
});

test("heights are in true proportion to the amount, with a small floor", () => {
  const [small, middle, big] = spikeHeights([100, 12500, 25000], 100);
  assert.equal(big, 100);
  assert.equal(middle, 50);
  assert.equal(small, 4);
});

test("each token group scales to its own largest amount", () => {
  const heights = spikeHeights([25000, -12500, 150000, 75000], 100, ["KOIN", "KOIN", "KAT", "KAT"]);
  assert.deepEqual(heights, [100, 50, 100, 50]);
});

test("the largest spike each way gets the standing label", () => {
  assert.deepEqual(extremes([3, -1, 9, -7, 2]), { up: 2, down: 3 });
  assert.deepEqual(extremes([1, 2]), { up: 1, down: null });
  assert.deepEqual(extremes([]), { up: null, down: null });
});

test("no entries draw nothing", () => {
  assert.deepEqual(spikeLayout([], 100, 100).shapes, []);
});
