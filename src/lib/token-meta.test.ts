import assert from "node:assert/strict";
import { test } from "node:test";
import { applyTokenMeta, cleanLabel, unknownTokenAddresses, type TokenMeta } from "./token-meta";

type Transfer = { token: { symbol: string; address: string; decimals: number; name?: string }; amount: string; from: string; to: string };
type Row = { id: string; actions: { type: string; tokenTransfers?: Transfer[] }[] };

const rle: TokenMeta = { address: "1Ee4", name: "RL-ENERGY", symbol: "RLE", decimals: 8, listed: false };

const rows: Row[] = [
  {
    id: "a",
    actions: [
      {
        type: "swap",
        tokenTransfers: [
          { token: { symbol: "KOIN", address: "19GY", decimals: 8 }, amount: "1", from: "x", to: "y" },
          { token: { symbol: "Unknown", address: "1Ee4", decimals: 8 }, amount: "2", from: "y", to: "x" },
        ],
      },
    ],
  },
  { id: "b", actions: [{ type: "call" }] },
  { id: "c", actions: [{ type: "transfer", tokenTransfers: [{ token: { symbol: "Unknown", address: "1Zzz", decimals: 8 }, amount: "3", from: "x", to: "y" }] }] },
];

test("collects each unknown token contract once", () => {
  assert.deepEqual(unknownTokenAddresses([...rows, ...rows]), ["1Ee4", "1Zzz"]);
});

test("patches resolved tokens and leaves the rest untouched", () => {
  const meta = new Map<string, TokenMeta | null>([
    ["1Ee4", rle],
    ["1Zzz", null],
  ]);
  const patched = applyTokenMeta(rows, meta);
  assert.equal(patched[0].actions?.[0].tokenTransfers?.[1].token.symbol, "RLE");
  assert.equal(patched[0].actions?.[0].tokenTransfers?.[1].token.name, "RL-ENERGY");
  assert.equal(patched[0].actions?.[0].tokenTransfers?.[0].token.symbol, "KOIN");
  assert.equal(patched[1], rows[1]);
  assert.equal(patched[2], rows[2]);
  assert.equal(applyTokenMeta(rows, new Map()), rows);
});

test("contract names are kept printable, short and non-empty", () => {
  assert.equal(cleanLabel("RL-ENERGY", "x"), "RL-ENERGY");
  assert.equal(cleanLabel("```````", "1Ee4…J7yJ"), "1Ee4…J7yJ");
  assert.equal(cleanLabel("  Fizzy\u0000  Bubbles\n", "x"), "Fizzy Bubbles");
  assert.equal(cleanLabel("A".repeat(40), "x", 12), "A".repeat(12));
  assert.equal(cleanLabel(undefined, "fallback"), "fallback");
});
