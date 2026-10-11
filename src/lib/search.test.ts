import assert from "node:assert/strict";
import { test } from "node:test";
import { classifySearch } from "./search";

test("transaction ids with or without 0x", () => {
  const id = "12203a9da0b204eee3ff5c0b1b2d6fd96e5d9c7a6b45c7b7d1e3b2c8f0a9d4e6f1";
  assert.deepEqual(classifySearch(id), { kind: "tx", value: `0x${id}` });
  assert.deepEqual(classifySearch(`0x${id}`), { kind: "tx", value: `0x${id}` });
});

test("nicknames with @, and bare words", () => {
  assert.deepEqual(classifySearch("@Julian"), { kind: "nickname", value: "julian" });
  assert.deepEqual(classifySearch("julian"), { kind: "nickname", value: "julian" });
  assert.equal(classifySearch("@").kind, "empty");
});

test("block heights in any of the ways people write them", () => {
  assert.deepEqual(classifySearch("40041420"), { kind: "block", value: "40041420" });
  assert.deepEqual(classifySearch("Block 40,041,420"), { kind: "block", value: "40041420" });
  assert.deepEqual(classifySearch("#40041420"), { kind: "block", value: "40041420" });
});

test("native token symbols and addresses", () => {
  assert.deepEqual(classifySearch("KOIN"), { kind: "symbol", value: "koin" });
  assert.deepEqual(classifySearch("1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk"), {
    kind: "address",
    value: "1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk",
  });
});

test("empty and unknown input", () => {
  assert.equal(classifySearch("   ").kind, "empty");
  assert.equal(classifySearch("hello world!").kind, "unknown");
});
