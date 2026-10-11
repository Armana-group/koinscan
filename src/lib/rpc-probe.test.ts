import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { forgetProbes, probeRpcNode, PROBE_FRESH_MS, RpcNodeUnreachableError } from "./rpc-probe";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  forgetProbes();
});

const headInfo = JSON.stringify({ jsonrpc: "2.0", id: 1, result: { head_topology: { height: "1" } } });
const ok = () => new Response(headInfo, { status: 200, headers: { "content-type": "application/json" } });

async function rejectsBusy(promise: Promise<unknown>, busy: boolean) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof RpcNodeUnreachableError);
    assert.equal(error.busy, busy, `busy flag for ${error.message}`);
    return true;
  });
}

test("a node that answers chain.get_head_info is reachable", async () => {
  let calledWith: string | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calledWith = String(input);
    assert.equal(init?.method, "POST");
    assert.match(String(init?.body), /chain\.get_head_info/);
    return ok();
  }) as typeof fetch;

  await probeRpcNode("https://node.example", 1000);
  assert.equal(calledWith, "https://node.example");
});

test("a node that answered recently is not asked again", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return ok();
  }) as typeof fetch;

  await probeRpcNode("https://node.example", 1000);
  await probeRpcNode("https://node.example", 1000);
  assert.equal(calls, 1, "the second probe within the window is skipped");
  await probeRpcNode("https://node.example", 1000, Date.now() + PROBE_FRESH_MS + 1);
  assert.equal(calls, 2, "after the window it asks again");
});

test("a node that cannot be reached fails fast, without a retry, and is not busy", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    throw new TypeError("Failed to fetch");
  }) as typeof fetch;
  await rejectsBusy(probeRpcNode("https://dead.example", 1000), false);
  assert.equal(calls, 1);
});

test("a node that hangs is cut off by the timeout instead of waiting on the browser", async () => {
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    })) as typeof fetch;

  // AbortSignal.timeout does not keep Node's event loop alive; a browser has no such issue.
  const keepAlive = setTimeout(() => {}, 5000);
  try {
    const started = Date.now();
    await rejectsBusy(probeRpcNode("https://slow.example", 50), false);
    assert.ok(Date.now() - started < 1000, "probe must give up at the timeout");
  } finally {
    clearTimeout(keepAlive);
  }
});

test("a throttling node (HTML page, 429 or 5xx) is retried once and then reported busy", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response("<html>nope</html>", { status: 200 });
  }) as typeof fetch;
  await rejectsBusy(probeRpcNode("https://web.example", 1000), true);
  assert.equal(calls, 2, "one retry");

  calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response("", { status: calls === 1 ? 429 : 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  // 429, then an empty 200 that is not JSON-RPC either.
  await rejectsBusy(probeRpcNode("https://limited.example", 1000), true);
  assert.equal(calls, 2);
});

test("a node that recovers on the retry counts as reachable", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return calls === 1 ? new Response("", { status: 503 }) : ok();
  }) as typeof fetch;
  await probeRpcNode("https://flaky.example", 1000);
  assert.equal(calls, 2);
});
