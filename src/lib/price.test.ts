import assert from "node:assert/strict";
import { test } from "node:test";
import { formatChange, formatKoinUsd } from "./price";

test("KOIN prices show four significant figures", () => {
  assert.equal(formatKoinUsd(0.01863525804921282), "$0.01864");
  assert.equal(formatKoinUsd(1.5), "$1.50");
});

test("changes carry a sign and one decimal", () => {
  assert.equal(formatChange(2.00275899), "+2.0%");
  assert.equal(formatChange(-1.44), "−1.4%");
  assert.equal(formatChange(0), "+0.0%");
});
