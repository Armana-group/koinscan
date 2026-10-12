import assert from "node:assert/strict";
import { test } from "node:test";
import { freshCache } from "./fresh-cache";

test("callers within the max age share one read", async () => {
  let t = 0;
  let reads = 0;
  const cache = freshCache<number>(1000, 5000, () => t);
  const load = async () => ++reads;
  assert.equal(await cache("a", load), 1);
  t = 999;
  assert.equal(await cache("a", load), 1);
  t = 1000;
  assert.equal(await cache("a", load), 2);
  assert.equal(reads, 2);
});

test("requests during a read wait for it instead of starting another", async () => {
  let reads = 0;
  let finish: (value: number) => void = () => {};
  const cache = freshCache<number>(1000);
  const load = () => {
    reads += 1;
    return new Promise<number>((resolve) => (finish = resolve));
  };
  const first = cache("a", load);
  const second = cache("a", load);
  finish(7);
  assert.deepEqual(await Promise.all([first, second]), [7, 7]);
  assert.equal(reads, 1);
});

test("a failed read serves the last answer while it is not too old", async () => {
  let t = 0;
  const cache = freshCache<string>(1000, 5000, () => t);
  await cache("a", async () => "old");
  t = 2000;
  assert.equal(await cache("a", async () => Promise.reject(new Error("busy"))), "old");
  t = 6000;
  await assert.rejects(cache("a", async () => Promise.reject(new Error("busy"))), /busy/);
});

test("keys are separate", async () => {
  const cache = freshCache<string>(1000);
  assert.equal(await cache("a", async () => "a"), "a");
  assert.equal(await cache("b", async () => "b"), "b");
});
