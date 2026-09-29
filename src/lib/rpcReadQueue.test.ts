import assert from "node:assert/strict";
import { test } from "node:test";

import { createRpcReadQueue } from "./rpcReadQueue";

test("a stalled read times out so the next read can finish", async () => {
  const queue = createRpcReadQueue({
    intervalMs: 0,
    retries: 0,
    retryDelayMs: 0,
    timeoutMs: 20,
  });
  const stalled = queue(() => new Promise<string>(() => {}));
  const rejection = assert.rejects(stalled, /timed out/i);
  const next = queue(async () => "ready");

  const outcome = await Promise.race([
    next,
    new Promise<string>((resolve) => setTimeout(() => resolve("blocked"), 100)),
  ]);

  assert.equal(outcome, "ready");
  await rejection;
});

test("a failed read yields the queue while waiting to retry", async () => {
  const queue = createRpcReadQueue({
    intervalMs: 0,
    retries: 1,
    retryDelayMs: 10,
    timeoutMs: 100,
  });
  const events: string[] = [];
  let attempts = 0;

  const retried = queue(async () => {
    attempts += 1;
    events.push(`attempt ${attempts}`);
    if (attempts === 1) throw new Error("temporary failure");
    return "recovered";
  });
  const next = queue(async () => {
    events.push("next read");
    return "ready";
  });

  assert.deepEqual(await Promise.all([retried, next]), ["recovered", "ready"]);
  assert.deepEqual(events, ["attempt 1", "next read", "attempt 2"]);
});
