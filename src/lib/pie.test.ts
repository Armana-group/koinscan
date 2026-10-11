import assert from "node:assert/strict";
import { test } from "node:test";
import { PIE_COLOURS, pieColour, ringPaths } from "./pie";

test("each share gets a slice, starting at twelve o'clock", () => {
  const paths = ringPaths([50, 25, 25], 100, 100, 100, 60);
  assert.equal(paths.length, 3);
  assert.match(paths[0], /^M 100\.000 0\.000 A 100 100 0 0 1 100\.000 200\.000 /);
  assert.match(paths[1], /^M 100\.000 200\.000 /);
});

test("a slice over half the ring takes the long way round", () => {
  const [big] = ringPaths([70, 30], 100, 100, 100, 60);
  assert.match(big, / A 100 100 0 1 1 /);
});

test("one producer with every block draws a full ring", () => {
  const [all] = ringPaths([100], 100, 100, 100, 60);
  assert.equal((all.match(/ A /g) ?? []).length, 4);
});

test("empty or zero shares draw nothing", () => {
  assert.deepEqual(ringPaths([0, 0], 100, 100, 100, 60), ["", ""]);
  assert.deepEqual(ringPaths([], 100, 100, 100, 60), []);
});

test("the largest producers get distinct colours, the rest alternate greys", () => {
  assert.equal(new Set(PIE_COLOURS.map((_, i) => pieColour(i))).size, PIE_COLOURS.length);
  assert.notEqual(pieColour(PIE_COLOURS.length), pieColour(PIE_COLOURS.length + 1));
  assert.equal(pieColour(PIE_COLOURS.length), pieColour(PIE_COLOURS.length + 2));
});
