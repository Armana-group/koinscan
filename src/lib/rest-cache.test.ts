import assert from "node:assert/strict";
import { test } from "node:test";
import { alternates, isImmutablePath, RestCache } from "./rest-cache";

test("fresh entries expire but stay available as stale", () => {
  const cache = new RestCache(10, 1000);
  cache.set("a", "{}", "application/json", 0);
  assert.equal(cache.fresh("a", 500)?.body, "{}");
  assert.equal(cache.fresh("a", 1500), undefined);
  assert.equal(cache.any("a")?.body, "{}");
});

test("the oldest entry is dropped past the limit", () => {
  const cache = new RestCache(2, 1000);
  cache.set("a", "1", "t", 0);
  cache.set("b", "2", "t", 1);
  cache.set("c", "3", "t", 2);
  assert.equal(cache.size, 2);
  assert.equal(cache.any("a"), undefined);
  assert.equal(cache.any("c")?.body, "3");
});

test("re-setting a key makes it newest again", () => {
  const cache = new RestCache(2, 1000);
  cache.set("a", "1", "t", 0);
  cache.set("b", "2", "t", 1);
  cache.set("a", "1b", "t", 2);
  cache.set("c", "3", "t", 3);
  assert.equal(cache.any("b"), undefined);
  assert.equal(cache.any("a")?.body, "1b");
});

test("only transactions and blocks are immutable", () => {
  assert.equal(isImmutablePath("/v1/transaction/0x1220ab"), true);
  assert.equal(isImmutablePath("/v1/block/123"), true);
  assert.equal(isImmutablePath("/v1/chain/blocks/0x1220ab"), true);
  assert.equal(isImmutablePath("/v1/chain/head_info"), false);
  assert.equal(isImmutablePath("/v1/account/1abc/history"), false);
});

test("alternates leave out the host that failed", () => {
  assert.deepEqual(alternates("b", ["a", "b", "c"]), ["a", "c"]);
});
