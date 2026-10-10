import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTxStory, type TokenLookup } from "./tx-story";

const KOIN = "19GYjDBVXU7keLbYvMLazsGQn3GTWHjHkK";
const DEX = "1KZVMtRxdfsHp4yXU7CZh9s7CodGvRPGhx";
const ALICE = "1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk";
const BOB = "1JVrBsKt8zkiUGBDY1Tk4DPiE9AkzKmhz2";

const lookup: TokenLookup = (id) => (id === KOIN ? { symbol: "KOIN", decimals: 8 } : null);

function transferPayload(extra: Record<string, unknown> = {}) {
  return {
    transaction: {
      id: "0x1220aa",
      header: { payer: ALICE },
      timestamp: "1791596902740",
      operations: [{ call_contract: { contract_id: KOIN, entry_point: "transfer", args: { from: ALICE, to: BOB, value: "177094340882" } as Record<string, unknown> } }],
    },
    receipt: {
      rc_used: "408000000",
      events: [{ name: "koinos.contracts.token.transfer_event", source: KOIN, data: { from: ALICE, to: BOB, value: "177094340882" } }],
      ...extra,
    },
    containing_blocks: ["0x1220bb"],
  };
}

test("a plain transfer leads with the amount", () => {
  const story = buildTxStory(transferPayload(), lookup)!;
  assert.equal(story.headline, "1,770.9434 KOIN");
  assert.deepEqual(story.lede, ["Sent by ", { address: ALICE }, " to ", { address: BOB }, "."]);
  assert.equal(story.failed, false);
  assert.deepEqual(story.parties, [
    { role: "From", address: ALICE },
    { role: "To", address: BOB },
  ]);
  assert.equal(story.manaUsed, "408000000");
  assert.equal(story.timestamp, 1791596902740);
  assert.deepEqual(story.blockIds, ["0x1220bb"]);
});

test("a transfer inside a contract call names the contract and the method", () => {
  const payload = transferPayload();
  payload.transaction.operations = [{ call_contract: { contract_id: DEX, entry_point: "fill_order", args: { id: "113" } } }];
  const story = buildTxStory(payload, lookup)!;
  assert.equal(story.headline, "1,770.9434 KOIN");
  assert.deepEqual(story.lede, ["Sent by ", { address: ALICE }, " to ", { address: BOB }, " through ", { address: DEX }, ", fill order."]);
  assert.ok(story.parties.some((p) => p.role === "Contract" && p.address === DEX));
});

test("a contract call without transfers reads as a sentence", () => {
  const story = buildTxStory(
    {
      transaction: { header: { payer: ALICE }, operations: [{ call_contract: { contract_id: DEX, entry_point: "set_reward_preference", args: {} } }] },
      receipt: { events: [] },
    },
    lookup,
  )!;
  assert.equal(story.headline, "Set reward preference");
  assert.deepEqual(story.lede, ["On ", { address: DEX }, ", by ", { address: ALICE }, "."]);
  assert.deepEqual(story.parties, [
    { role: "By", address: ALICE },
    { role: "Contract", address: DEX },
  ]);
});

test("a reverted transaction says what was tried and why it failed", () => {
  const payload = transferPayload({ reverted: true, logs: ["transaction reverted: insufficient balance"], events: [] });
  payload.transaction.operations = [{ call_contract: { contract_id: KOIN, entry_point: "transfer", args: { from: ALICE, to: BOB, value: "2500000000" } } }];
  const story = buildTxStory(payload, lookup)!;
  assert.equal(story.failed, true);
  assert.equal(story.headline, "Transfer did not go through");
  assert.deepEqual(story.lede[0], { address: ALICE });
  assert.match(story.lede.join(""), /tried to send 25 KOIN to/);
  assert.match(story.lede.join(""), /insufficient balance/);
  assert.equal(story.transfers.length, 1);
});

test("pending transactions have no receipt", () => {
  const story = buildTxStory({ transaction: { header: { payer: ALICE }, operations: [] } }, lookup)!;
  assert.equal(story.pending, true);
  assert.equal(story.headline, "Transaction");
});

test("unknown payloads return null", () => {
  assert.equal(buildTxStory(null, lookup), null);
  assert.equal(buildTxStory({}, lookup), null);
});
