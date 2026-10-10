import assert from "node:assert/strict";
import { test } from "node:test";
import { ago, dayLabel, fmt, fmtRaw, humanize, initials, short, toMillis } from "./format";

test("short keeps the head and tail of an address", () => {
  assert.equal(short("1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk"), "1GGxRh…xtvk");
  assert.equal(short("koin"), "koin");
  assert.equal(short(null), "");
});

test("fmt groups thousands", () => {
  assert.equal(fmt(40076180), "40,076,180");
  assert.equal(fmt("12"), "12");
  assert.equal(fmt(undefined), "—");
});

test("fmtRaw converts raw token amounts exactly", () => {
  assert.equal(fmtRaw("177094340882"), "1,770.9434");
  assert.equal(fmtRaw("177094340882", 8, 2), "1,770.94");
  assert.equal(fmtRaw("2500000000"), "25");
  assert.equal(fmtRaw("1"), "0.00000001");
  assert.equal(fmtRaw("0"), "0");
  assert.equal(fmtRaw("abc"), "abc");
});

test("ago reads like a sentence", () => {
  const now = Date.UTC(2026, 9, 9, 17, 30, 0);
  assert.equal(ago(now - 2000, now), "just now");
  assert.equal(ago(now + 3000, now), "just now");
  assert.equal(ago(now - 120_000, now), "2 minutes ago");
  assert.equal(ago(now - 3 * 3_600_000, now), "3 hours ago");
  assert.equal(ago(now - 26 * 3_600_000, now), "yesterday");
});

test("timestamps in seconds are promoted to milliseconds", () => {
  assert.equal(toMillis(1791596902), 1791596902000);
  assert.equal(toMillis("1791596902740"), 1791596902740);
  assert.equal(toMillis(""), null);
});

test("day labels group history rows", () => {
  const now = new Date(2026, 9, 9, 17, 30).getTime();
  assert.equal(dayLabel(now - 60_000, now), "today");
  assert.equal(dayLabel(now - 24 * 3_600_000, now), "yesterday");
});

test("initials and humanized method names", () => {
  assert.equal(initials("JGA Pool #3"), "JP");
  assert.equal(initials(null, "1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk"), "GG");
  assert.equal(humanize("set_reward_preference"), "Set reward preference");
  assert.equal(humanize("deposit_koin"), "Deposit KOIN");
});
