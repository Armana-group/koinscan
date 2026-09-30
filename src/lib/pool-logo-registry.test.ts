import assert from "node:assert/strict";
import { test } from "node:test";
import { Contract, utils } from "koilib";
import { abiFogata2ListPools } from "@/koinos/abis/fogata2ListPools";
import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";
import { FOGATA2_LIST_POOLS_CONTRACT_ID } from "@/koinos/constants";
import { readPoolRegistry, readPoolLogoUrl } from "./pool-logo-registry";

const registry = new Contract({ id: FOGATA2_LIST_POOLS_CONTRACT_ID, abi: abiFogata2ListPools });
const pool = "1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk";

test("registry pagination advances using the server ABI and fixed RPC", async (t) => {
  const first = Array.from({ length: 100 }, (_, i) => ({ account: utils.bitcoinEncode(Uint8Array.from([...Array(19).fill(0), i]), "public") }));
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.equal(url, "https://api.koinos.io");
    assert.equal(options.redirect, "error");
    assert.ok(options.signal);
    const body = JSON.parse(String(options.body));
    assert.equal(body.method, "chain.read_contract");
    assert.equal(body.params.contract_id, FOGATA2_LIST_POOLS_CONTRACT_ID);
    const args = await registry.serializer!.deserialize(body.params.args, "common.list_args");
    assert.equal(args.start ?? "", calls === 0 ? "" : first[99].account);
    assert.equal(args.limit, 100);
    const result = await registry.serializer!.serialize({ value: calls++ === 0 ? first : [{ account: pool }] }, "pools.pools");
    return Response.json({ result: { result: utils.encodeBase64url(result) } });
  });
  const pools = await readPoolRegistry();
  assert.equal(pools.size, 101);
  assert.ok(pools.has(pool));
  assert.equal(calls, 2);
});

test("pool logo URL comes from contract parameters, never the request URL", async (t) => {
  const contract = new Contract({ id: pool, abi: abiFogata2Pool });
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    assert.equal(body.params.contract_id, pool);
    const result = await contract.serializer!.serialize({ image: "https://images.example/logo.png" }, "fogata.pool_params");
    return Response.json({ result: { result: utils.encodeBase64url(result) } });
  });
  assert.equal(await readPoolLogoUrl(pool), "https://images.example/logo.png");
});

test("oversized or failed RPC responses fail closed", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response("x".repeat(2 * 1024 * 1024 + 1)));
  await assert.rejects(readPoolRegistry(), /exceeds limits/);
  fetchMock.mock.mockImplementation(async () => Response.json({ error: { message: "offline" } }));
  await assert.rejects(readPoolRegistry(), /failed/);
});
