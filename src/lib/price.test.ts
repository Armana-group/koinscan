import assert from "node:assert/strict";
import { test } from "node:test";
import { formatChange, formatKoinUsd, getKoinQuote } from "./price";

test("KOIN prices show four significant figures", () => {
  assert.equal(formatKoinUsd(0.01863525804921282), "$0.01864");
  assert.equal(formatKoinUsd(1.5), "$1.50");
});

test("changes carry a sign and one decimal", () => {
  assert.equal(formatChange(2.00275899), "+2.0%");
  assert.equal(formatChange(-1.44), "−1.4%");
  assert.equal(formatChange(0), "+0.0%");
});

test("callers asking at the same time share one price request", async () => {
  let requests = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    requests += 1;
    return new Response(JSON.stringify({ usd: 0.5, change: 1.2, timestamp: 0, source: "test" }));
  }) as typeof fetch;
  try {
    const quotes = await Promise.all([getKoinQuote(), getKoinQuote(), getKoinQuote()]);
    assert.deepEqual(quotes, [{ usd: 0.5, change: 1.2 }, { usd: 0.5, change: 1.2 }, { usd: 0.5, change: 1.2 }]);
    assert.equal(requests, 1);
    await getKoinQuote();
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = original;
  }
});
