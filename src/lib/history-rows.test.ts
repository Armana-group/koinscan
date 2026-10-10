import assert from "node:assert/strict";
import { test } from "node:test";
import { buildHistoryItems, summarizeActivity } from "./history-rows";

const ME = "1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk";
const YOU = "1JVrBsKt8zkiUGBDY1Tk4DPiE9AkzKmhz2";
const KOIN = { symbol: "KOIN", address: "19GYjDBVXU7keLbYvMLazsGQn3GTWHjHkK", decimals: "8" };
const VHP = { symbol: "VHP", address: "12Y5vW6gk8GceH53YfRkRre2Rrcsgw7Naq", decimals: "8" };
const NOW = new Date(2026, 9, 9, 17, 30).getTime();

function block(id: string, height: string, minutesAgo: number) {
  return {
    id,
    seq_num: height,
    isBlockProduction: true,
    blockHeight: height,
    timestamp: String(NOW - minutesAgo * 60_000),
    actions: [
      {
        type: "block_production",
        tokenTransfers: [
          { token: KOIN, amount: "423444547", from: "", to: ME, isPositive: true },
          { token: VHP, amount: "407494121", from: ME, to: "", isPositive: false },
        ],
      },
    ],
  };
}

test("consecutive produced blocks fold into one run per day with totals", () => {
  const items = buildHistoryItems([block("a", "40044297", 2), block("b", "40044203", 12), block("c", "40041000", 26 * 60)], ME, NOW);
  assert.equal(items.length, 2);
  const today = items[0];
  assert.equal(today.kind, "run");
  if (today.kind !== "run") return;
  assert.equal(today.day, "today");
  assert.equal(today.blocks.length, 2);
  assert.ok(Math.abs(today.koinTotal - 8.4688909) < 1e-6);
  assert.ok(Math.abs(today.vhpTotal - 8.1498824) < 1e-6);
  assert.equal(items[1].kind, "run");
  if (items[1].kind === "run") assert.equal(items[1].day, "yesterday");
});

test("a received transfer leads with the token and the sender", () => {
  const [row] = buildHistoryItems(
    [
      {
        id: "tx1",
        rc_used: "42000000",
        operations: [{ type: "Contract Call", contract: KOIN.address, method: "transfer" }],
        actions: [{ type: "token_transfer", tokenTransfers: [{ token: KOIN, amount: "2500000000", from: YOU, to: ME, isPositive: true }] }],
      },
    ],
    ME,
    NOW,
  );
  assert.equal(row.kind, "tx");
  if (row.kind !== "tx") return;
  assert.equal(row.title, "From");
  assert.equal(row.counterparty, YOU);
  assert.equal(row.amount, "+25 KOIN");
  assert.equal(row.tone, "in");
  assert.equal(row.filter, "received");
  assert.equal(row.lead.type, "token");
});

test("a contract call that moves tokens keeps the method as the title", () => {
  const POOL = "1MbsVfNw6yzQqA8499d8KQj8qdLyRs8CzW";
  const [row] = buildHistoryItems(
    [
      {
        id: "tx2",
        operations: [{ type: "Contract Call", contract: POOL, method: "stake" }],
        actions: [{ type: "contract_interaction", tokenTransfers: [{ token: VHP, amount: "210000000000", from: ME, to: POOL, isPositive: false }] }],
      },
    ],
    ME,
    NOW,
  );
  assert.equal(row.kind, "tx");
  if (row.kind !== "tx") return;
  assert.equal(row.title, "Stake");
  assert.equal(row.counterparty, POOL);
  assert.equal(row.amount, "-2,100 VHP");
  assert.equal(row.filter, "contracts");
});

test("a swap shows what came in over what went out", () => {
  const DEX = "1KZVMtRxdfsHp4yXU7CZh9s7CodGvRPGhx";
  const [row] = buildHistoryItems(
    [
      {
        id: "tx3",
        operations: [{ type: "Contract Call", contract: DEX, method: "fill_order" }],
        actions: [
          {
            type: "contract_interaction",
            tokenTransfers: [
              { token: VHP, amount: "500000000000", from: ME, to: YOU, isPositive: false },
              { token: KOIN, amount: "431000000000", from: YOU, to: ME, isPositive: true },
            ],
          },
        ],
      },
    ],
    ME,
    NOW,
  );
  if (row.kind !== "tx") throw new Error("expected a tx row");
  assert.equal(row.title, "Swapped VHP for KOIN");

  assert.equal(row.amount, "+4,310 KOIN");
  assert.equal(row.amountSub, "-5,000 VHP");
});

test("summary counts what the page describes in one sentence", () => {
  const items = buildHistoryItems(
    [
      block("a", "1", 1),
      { id: "t", operations: [{ type: "Contract Call", method: "transfer" }], actions: [{ type: "token_transfer", tokenTransfers: [{ token: KOIN, amount: "1", from: ME, to: YOU }] }] },
    ],
    ME,
    NOW,
  );
  const summary = summarizeActivity(items);
  assert.equal(summary.blocks, 1);
  assert.equal(summary.sent, 1);
  assert.equal(summary.received, 0);
});


test("a swap names the exchange, not the token it approved first", () => {
  const [row] = buildHistoryItems(
    [
      {
        id: "0xswap2",
        timestamp: String(NOW - 60_000),
        operations: [
          { type: "Contract Call", contract: "1KOINcontract", method: "approve" },
          { type: "Contract Call", contract: "1DEXrouter", method: "swap_tokens_in" },
        ],
        actions: [
          {
            type: "contract_interaction",
            tokenTransfers: [
              { token: KOIN, amount: "20000000", from: ME, to: "1pair", isPositive: false },
              { token: VHP, amount: "213267344232", from: "1pair", to: ME, isPositive: true },
            ],
          },
        ],
      },
    ],
    ME,
    NOW,
  );
  if (row.kind !== "tx") throw new Error("expected a tx row");
  assert.equal(row.title, "Swapped KOIN for VHP");
  assert.equal(row.counterparty, "1DEXrouter");
});
