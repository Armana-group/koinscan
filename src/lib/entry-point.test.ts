import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeEntryPoint } from "./api";

test("a method the node already named is kept as it is", () => {
  assert.equal(decodeEntryPoint("transfer"), "transfer");
  assert.equal(decodeEntryPoint("submit_pool"), "submit_pool");
});

test("numeric entry points are looked up, and unknown ones say so", () => {
  assert.equal(decodeEntryPoint(0x27f576ca), "transfer");
  assert.equal(decodeEntryPoint("0x27F576CA"), "transfer");
  assert.equal(decodeEntryPoint("12345"), "method(12345)");
});
