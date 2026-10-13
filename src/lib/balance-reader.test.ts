import assert from "node:assert/strict";
import { test } from "node:test";
import { createBundledBalanceReader, type BundleReader } from "./balance-reader";
import type { KoinosToken } from "./tokens";

const token = {} as KoinosToken;

test("reads asked for together go out in bundles", async () => {
  const bundles: string[][] = [];
  const readBundle: BundleReader = async (contracts) => {
    bundles.push(contracts);
    return contracts.map((contract) => `${contract}-balance`);
  };
  const read = createBundledBalanceReader(readBundle, async () => assert.fail("no single reads"), 2);
  const values = await Promise.all(["a", "b", "c"].map((contract) => read(contract, "owner", token)));
  assert.deepEqual(values, ["a-balance", "b-balance", "c-balance"]);
  assert.deepEqual(bundles, [["a", "b"], ["c"]]);
});

test("a failed read inside a bundle fails only that token", async () => {
  const read = createBundledBalanceReader(async () => ["1", new Error("no such method")], async () => assert.fail("no single reads"));
  const [first, second] = await Promise.allSettled([read("a", "owner", token), read("b", "owner", token)]);
  assert.deepEqual(first, { status: "fulfilled", value: "1" });
  assert.equal(second.status, "rejected");
});

test("a refused bundle is read one token at a time", async () => {
  const singles: string[] = [];
  const read = createBundledBalanceReader(
    async () => Promise.reject(new Error("compute bandwidth limit exceeded")),
    async (contract) => {
      singles.push(contract);
      return `${contract}-single`;
    },
  );
  assert.deepEqual(await Promise.all([read("a", "owner", token), read("b", "owner", token)]), ["a-single", "b-single"]);
  assert.deepEqual(singles, ["a", "b"]);
});
