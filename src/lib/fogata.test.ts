import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computePoolApy,
  findMatchingOrder,
  formatPayoutPeriod,
  poolHealth,
  sanitizeDecimalInput,
  summarizeFogata,
  formatCompactVhp,
  multicallValue,
  suggestPrice,
  amountAtPrice,
} from "./fogata";

describe("computePoolApy", () => {
  it("returns the network APY when there are no beneficiaries", () => {
    assert.equal(computePoolApy(25.9, []), 25.9);
  });
  it("subtracts the beneficiary share (percentage is in thousandths of a percent)", () => {
    // 5500 = 5.5%
    assert.ok(Math.abs(computePoolApy(25.9, [{ percentage: 5500 }]) - 24.4755) < 1e-9);
  });
  it("sums multiple beneficiaries' shares", () => {
    // 3000 + 2500 = 5500 = 5.5%
    assert.ok(
      Math.abs(computePoolApy(25.9, [{ percentage: 3000 }, { percentage: 2500 }]) - 24.4755) < 1e-9
    );
  });
});

describe("poolHealth", () => {
  const now = new Date("2026-09-19T12:00:00Z");
  const tenMin = 10 * 60 * 1000;
  it("is producing when the last block is within 2x the expected time", () => {
    assert.equal(
      poolHealth({ lastBlockTime: new Date(now.getTime() - tenMin), expectedTimeToProduce: tenMin, effectiveness: 80 }, now),
      "producing"
    );
  });
  it("is still producing when the last block is between 2x and 4x the expected time", () => {
    assert.equal(
      poolHealth({ lastBlockTime: new Date(now.getTime() - 3 * tenMin), expectedTimeToProduce: tenMin, effectiveness: 80 }, now),
      "producing"
    );
  });
  it("is late when the last block is older than 4x the expected time", () => {
    assert.equal(
      poolHealth({ lastBlockTime: new Date(now.getTime() - 5 * tenMin), expectedTimeToProduce: tenMin, effectiveness: 80 }, now),
      "late"
    );
  });
  it("is late when effectiveness is under 50 even if a block is recent", () => {
    assert.equal(
      poolHealth({ lastBlockTime: new Date(now.getTime() - tenMin), expectedTimeToProduce: tenMin, effectiveness: 40 }, now),
      "late"
    );
  });
  it("is paused when there is no block in 24 hours", () => {
    assert.equal(
      poolHealth({ lastBlockTime: new Date(now.getTime() - 25 * 60 * 60 * 1000), expectedTimeToProduce: tenMin, effectiveness: 80 }, now),
      "paused"
    );
  });
  it("is paused when there is no block at all", () => {
    assert.equal(poolHealth({}, now), "paused");
  });
});

describe("formatPayoutPeriod", () => {
  it("formats whole days", () => {
    assert.equal(formatPayoutPeriod(String(4 * 86400 * 1000)), "Every 4 days");
  });
  it("formats one day without a plural", () => {
    assert.equal(formatPayoutPeriod(String(86400 * 1000)), "Every day");
  });
  it("formats fractional days with one decimal", () => {
    assert.equal(formatPayoutPeriod(String(1.5 * 86400 * 1000)), "Every 1.5 days");
  });
  it("returns a dash when unknown", () => {
    assert.equal(formatPayoutPeriod(undefined), "—");
  });
});

describe("findMatchingOrder", () => {
  const orders = [
    { id: "1", buy: true, owner: "A", vhp_amount: "50000000000", koin_amount: "48000000000" }, // buys 500 VHP at 0.96
    { id: "2", buy: true, owner: "B", vhp_amount: "10000000000", koin_amount: "9000000000" },  // buys 100 VHP at 0.90
    { id: "3", buy: false, owner: "C", vhp_amount: "20000000000", koin_amount: "19400000000" }, // sells 200 VHP at 0.97
  ];
  it("finds the best buy order that covers a sell", () => {
    // selling 400 VHP asking 380 KOIN → 0.95; order 1 pays 0.96 and has 500 VHP
    assert.equal(findMatchingOrder("sell", "400", "380", orders, null)?.id, "1");
  });
  it("ignores orders that are too small", () => {
    // selling 600 VHP; nobody buys that much
    assert.equal(findMatchingOrder("sell", "600", "570", orders, null), null);
  });
  it("ignores orders with a worse price", () => {
    // asking 0.97 per VHP; best buyer pays 0.96
    assert.equal(findMatchingOrder("sell", "100", "97", orders, null), null);
  });
  it("finds a sell order that covers a buy", () => {
    // buying 100 VHP paying 98 KOIN → 0.98; order 3 sells at 0.97
    assert.equal(findMatchingOrder("buy", "100", "98", orders, null)?.id, "3");
  });
  it("never matches your own order", () => {
    assert.equal(findMatchingOrder("sell", "400", "380", orders, "A"), null);
  });
  it("returns null for empty or invalid amounts", () => {
    assert.equal(findMatchingOrder("sell", "", "380", orders, null), null);
    assert.equal(findMatchingOrder("sell", "abc", "380", orders, null), null);
  });
  it("picks the best of two eligible buy orders", () => {
    const twoEligible = [
      { id: "4", buy: true, owner: "X", vhp_amount: "50000000000", koin_amount: "48000000000" }, // 500 VHP at 0.96
      { id: "5", buy: true, owner: "Y", vhp_amount: "50000000000", koin_amount: "47500000000" }, // 500 VHP at 0.95 (worse)
    ];
    // selling 400 VHP asking 380 KOIN → wanted price 0.95; both orders are eligible, the better price wins
    assert.equal(findMatchingOrder("sell", "400", "380", twoEligible, null)?.id, "4");
  });
});

describe("sanitizeDecimalInput", () => {
  it("keeps digits and a single dot", () => {
    assert.equal(sanitizeDecimalInput("123.45"), "123.45");
  });
  it("drops letters, signs and exponent notation", () => {
    assert.equal(sanitizeDecimalInput("1e-8"), "18");
    assert.equal(sanitizeDecimalInput("-12"), "12");
    assert.equal(sanitizeDecimalInput("abc"), "");
  });
  it("accepts a comma as the decimal separator", () => {
    assert.equal(sanitizeDecimalInput("1,5"), "1.5");
  });
  it("keeps only the first dot", () => {
    assert.equal(sanitizeDecimalInput("1.2.3"), "1.23");
  });
  it("allows a trailing dot while typing", () => {
    assert.equal(sanitizeDecimalInput("12."), "12.");
  });
  it("prefixes a bare dot with zero", () => {
    assert.equal(sanitizeDecimalInput("."), "0.");
  });
  it("limits to eight decimals", () => {
    assert.equal(sanitizeDecimalInput("1.1234567890"), "1.12345678");
  });
  it("passes empty through", () => {
    assert.equal(sanitizeDecimalInput(""), "");
  });
});

describe("summarizeFogata", () => {
  it("sums the pools' VHP and takes the share of the network's producing VHP", () => {
    const summary = summarizeFogata([35_400, 12_000, 0], 250_000);
    assert.equal(summary.totalStaked, 47_400);
    assert.ok(summary.share !== null && Math.abs(summary.share - 18.96) < 1e-9);
  });
  it("skips pools whose balance is unknown", () => {
    const summary = summarizeFogata([35_400, undefined, 12_000], 250_000);
    assert.equal(summary.totalStaked, 47_400);
  });
  it("has no share when the network figure is unavailable", () => {
    assert.equal(summarizeFogata([100], undefined).share, null);
    assert.equal(summarizeFogata([100], 0).share, null);
  });
});

describe("formatCompactVhp", () => {
  it("abbreviates thousands and millions with one decimal", () => {
    assert.equal(formatCompactVhp(35_432), "35.4K");
    assert.equal(formatCompactVhp(1_250_000), "1.3M");
  });
  it("leaves small numbers whole", () => {
    assert.equal(formatCompactVhp(812.6), "813");
  });
});

describe("multicallValue", () => {
  it("returns the value of a successful call", () => {
    assert.equal(multicallValue({ value: "100525220" }), "100525220");
  });
  it("returns undefined for a failed call rather than a zero", () => {
    assert.equal(multicallValue(new Error("user code cannot access system space")), undefined);
    assert.equal(multicallValue(undefined), undefined);
    assert.equal(multicallValue({}), undefined);
  });
});

describe("suggestPrice", () => {
  const order = (buy: boolean, koin: number, vhp: number, owner = "someone") => ({
    id: `${buy}-${koin}-${vhp}`,
    buy,
    owner,
    koin_amount: String(koin * 1e8),
    vhp_amount: String(vhp * 1e8),
  });
  const buys = [order(true, 90, 100), order(true, 95, 100)];
  const sells = [order(false, 105, 100), order(false, 100, 100)];

  it("offers a seller the best open bid", () => {
    assert.deepEqual(suggestPrice("sell", buys, sells, null), { price: 0.95, source: "bid" });
  });
  it("offers a buyer the best open ask", () => {
    assert.deepEqual(suggestPrice("buy", buys, sells, null), { price: 1, source: "ask" });
  });
  it("falls back to the other side of the book when its own side is empty", () => {
    assert.deepEqual(suggestPrice("sell", [], sells, null), { price: 1, source: "ask" });
    assert.deepEqual(suggestPrice("buy", buys, [], null), { price: 0.95, source: "bid" });
  });
  it("ignores the user's own orders", () => {
    const mine = [order(true, 200, 100, "me")];
    assert.deepEqual(suggestPrice("sell", [...buys, ...mine], sells, "me"), { price: 0.95, source: "bid" });
  });
  it("has nothing to suggest on an empty book", () => {
    assert.equal(suggestPrice("sell", [], [], null), null);
  });
});

describe("amountAtPrice", () => {
  it("multiplies a sale by the price and divides a purchase by it", () => {
    assert.equal(amountAtPrice("sell", "420", 0.96), "403.2");
    assert.equal(amountAtPrice("buy", "96", 0.96), "100");
  });
  it("keeps at most eight decimals and never uses exponent notation", () => {
    assert.equal(amountAtPrice("sell", "1", 0.333333333333), "0.33333333");
    assert.equal(amountAtPrice("sell", "0.0000001", 0.5), "0.00000005");
  });
  it("is empty for an empty or invalid amount or price", () => {
    assert.equal(amountAtPrice("sell", "", 1), "");
    assert.equal(amountAtPrice("sell", "abc", 1), "");
    assert.equal(amountAtPrice("buy", "1", 0), "");
  });
});
