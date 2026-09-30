import assert from "node:assert/strict";
import { test } from "node:test";
import { Contract, Provider, utils } from "koilib";
import tokenAbi from "@/koinos/abi";
import { KOIN_CONTRACT_ID } from "@/koinos/constants";
import { formatKoinBalance, readKoinBalance } from "./koin-balance";

test("KOIN balances use eight decimals and retain exact zero", () => {
  assert.equal(formatKoinBalance("0"), "0");
  assert.equal(formatKoinBalance("123456789000"), "1,234.5679");
  assert.equal(formatKoinBalance("100000000"), "1");
});

test("small positive balances remain distinct from zero", () => {
  assert.equal(formatKoinBalance("1"), "<0.0001");
  assert.equal(formatKoinBalance("10000"), "0.0001");
  assert.equal(formatKoinBalance("99999999"), "1");
});

test("large KOIN balances retain integer precision", () => {
  assert.equal(formatKoinBalance("18446744073709551615"), "184,467,440,737.0955");
});

test("invalid balances fail instead of displaying zero", () => {
  for (const raw of ["", "-1", "oops", "1.5"]) {
    assert.throws(() => formatKoinBalance(raw));
  }
});

test("balance lookup reads only KOIN for the requested account", async () => {
  const provider = new Provider(["https://unused.invalid"]);
  const contract = new Contract({ id: KOIN_CONTRACT_ID, abi: tokenAbi });
  const owner = "1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk";
  const encoded = utils.encodeBase64url(await contract.serializer.serialize({ value: "250000000" }, "balance_of_result"));
  provider.readContract = async (operation) => {
    assert.equal(operation.contract_id, KOIN_CONTRACT_ID);
    assert.deepEqual(await contract.serializer.deserialize(operation.args!, "balance_of_arguments"), { owner });
    return { result: encoded };
  };
  assert.equal(await readKoinBalance(provider, owner), "2.5");
});

test("RPC errors propagate so the row can display Unavailable", async () => {
  const provider = new Provider(["https://unused.invalid"]);
  provider.readContract = async () => { throw new Error("RPC offline"); };
  await assert.rejects(readKoinBalance(provider, "1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk"), /RPC offline/);
});
