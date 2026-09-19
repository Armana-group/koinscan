import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computePoolApy,
  findMatchingOrder,
  formatPayoutPeriod,
  poolHealth,
} from "./fogata";

describe("computePoolApy", () => {
  it("returns the network APY when there are no beneficiaries", () => {
    assert.equal(computePoolApy(25.9, []), 25.9);
  });
  it("subtracts the beneficiary share (percentage is in thousandths of a percent)", () => {
    // 5500 = 5.5%
    assert.ok(Math.abs(computePoolApy(25.9, [{ percentage: 5500 }]) - 24.4755) < 1e-9);
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
});
