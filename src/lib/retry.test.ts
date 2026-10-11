import assert from "node:assert/strict";
import { test } from "node:test";
import { retry } from "./retry";

test("returns the first success", async () => {
  let calls = 0;
  const value = await retry(async () => {
    calls += 1;
    return "ok";
  }, 2, 0);
  assert.equal(value, "ok");
  assert.equal(calls, 1);
});

test("tries again after a failure", async () => {
  let calls = 0;
  const value = await retry(async () => {
    calls += 1;
    if (calls === 1) throw new Error("flaky");
    return "ok";
  }, 2, 0);
  assert.equal(value, "ok");
  assert.equal(calls, 2);
});

test("gives up with the last error", async () => {
  let calls = 0;
  await assert.rejects(
    retry(async () => {
      calls += 1;
      throw new Error(`fail ${calls}`);
    }, 3, 0),
    /fail 3/,
  );
  assert.equal(calls, 3);
});
