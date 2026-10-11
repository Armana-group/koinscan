import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeTokenAmountEventData, formatDetailedTransactions, type DetailedTransaction } from "./api";

const PRODUCER = "1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk";
const KOIN = "19GYjDBVXU7keLbYvMLazsGQn3GTWHjHkK";
const VHP = "12Y5vW6gk8GceH53YfRkRre2Rrcsgw7Naq";

// Shape returned by rest.koinos.io /v1/account/{addr}/history for a block the
// account produced. Encoded data = mint/burn event payloads for PRODUCER.
const blockEntry = {
  seq_num: "7791",
  block: {
    header: {
      previous: "0x1220b4c7df45bb9fd769f19a7cdbc7dca73276ab005e880f9ccca4c774f0674a654d",
      height: "40040058",
      timestamp: "1791485448120",
      signer: PRODUCER,
    },
    receipt: {
      id: "0x1220dbf0ab96da74d6ce0ea2c230eb237c9356a1581e2fec95afd683b821a186b050",
      height: "40040058",
      events: [
        { source: VHP, name: "koinos.contracts.token.burn_event", data: "ChkAp45krx62ZFBcCZ_p8ZQurWAYm2mj3fGBEOWOpMIB", impacted: [PRODUCER] },
        { sequence: 1, source: KOIN, name: "koinos.contracts.token.mint_event", data: "ChkAp45krx62ZFBcCZ_p8ZQurWAYm2mj3fGBENnC8ckB", impacted: [PRODUCER] },
        // Fund share minted to the Koinos fund, not to the producer.
        { sequence: 2, source: KOIN, name: "koinos.contracts.token.mint_event", data: "ChkAY4PIK6GLlepslYHfS0_gFgRaYIfqarbOEPWzzQc=", impacted: ["1A5BmMqV5jN5zBrdkhQumAfDZBzXLPBeN9"] },
      ],
    },
  },
} as unknown as DetailedTransaction;

const transactionEntry = {
  seq_num: "7790",
  trx: {
    transaction: {
      id: "0x1220aaaa",
      header: { payer: PRODUCER, rc_limit: "1", nonce: "KAE=", operation_merkle_root: "", chain_id: "" },
      operations: [{ call_contract: { contract_id: KOIN, entry_point: 670398154, args: "" } }],
      signatures: [],
    },
    receipt: { id: "0x1220aaaa", payer: PRODUCER, rc_used: "123", events: [] },
  },
} as unknown as DetailedTransaction;

test("block production entries format without throwing and keep their place in the list", () => {
  const rows = formatDetailedTransactions([blockEntry, transactionEntry], PRODUCER);

  assert.equal(rows.length, 2);
  const [block, tx] = rows;

  assert.equal(block.id, blockEntry.block!.receipt.id);
  assert.equal(block.blockHeight, "40040058");
  assert.equal(block.timestamp, "1791485448120");
  assert.equal(block.payer, PRODUCER);
  assert.ok(block.tags.includes("block_production"));
  const action = block.actions?.[0];
  assert.ok(action, "the block row carries an action");
  assert.equal(action.type, "block_production");
  assert.match(action.description, /40,040,058|40040058/);
  assert.equal(block.userFriendlyInfo?.isPositive, true);

  // The block receipt's mint event is the producer reward; the burn is the VHP spent.
  const transfers = action.tokenTransfers ?? [];
  assert.equal(transfers.length, 2, "only the producer's own reward and burn are listed");
  assert.equal(transfers[0].isPositive, true, "the reward leads the list");
  const reward = transfers.find((transfer: { isPositive?: boolean }) => transfer.isPositive);
  const burned = transfers.find((transfer: { isPositive?: boolean }) => !transfer.isPositive);
  assert.equal(reward?.amount, "423387481");
  assert.equal(reward?.to, PRODUCER);
  assert.equal(burned?.amount, "407439205");
  assert.equal(burned?.from, PRODUCER);
  assert.equal(block.userFriendlyInfo?.amount, reward?.formattedAmount);

  assert.equal(tx.id, "0x1220aaaa");
  assert.equal(tx.rc_used, "123");
});

test("entries that are neither a transaction nor a block are skipped, not fatal", () => {
  const rows = formatDetailedTransactions([{ seq_num: "1" } as DetailedTransaction, transactionEntry], PRODUCER);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "0x1220aaaa");
});

test("mint and burn event payloads decode to an address and an amount", () => {
  assert.deepEqual(decodeTokenAmountEventData("ChkAp45krx62ZFBcCZ_p8ZQurWAYm2mj3fGBENnC8ckB"), {
    address: PRODUCER,
    value: "423387481",
  });
  assert.equal(decodeTokenAmountEventData(""), null);
  assert.equal(decodeTokenAmountEventData({ to: PRODUCER }), null);
  assert.equal(decodeTokenAmountEventData("not-base64url!!"), null);
});
