import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { probeRpcNode, RpcNodeUnreachableError } from "./rpc-probe";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

const headInfo = JSON.stringify({ jsonrpc: "2.0", id: 1, result: { head_topology: { height: "1" } } });

test("a node that answers chain.get_head_info is reachable", async () => {
  let calledWith: string | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calledWith = String(input);
    assert.equal(init?.method, "POST");
    assert.match(String(init?.body), /chain\.get_head_info/);
    return new Response(headInfo, { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  await probeRpcNode("https://node.example", 1000);
  assert.equal(calledWith, "https://node.example");
});

test("a node that cannot be reached fails fast with a clear error", async () => {
  globalThis.fetch = (async () => { throw new TypeError("Failed to fetch"); }) as typeof fetch;
  await assert.rejects(probeRpcNode("https://dead.example", 1000), RpcNodeUnreachableError);
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
    await assert.rejects(probeRpcNode("https://slow.example", 50), RpcNodeUnreachableError);
    assert.ok(Date.now() - started < 1000, "probe must give up at the timeout");
  } finally {
    clearTimeout(keepAlive);
  }
});

test("an HTTP error or a non-JSON-RPC body is treated as unreachable", async () => {
  globalThis.fetch = (async () => new Response("<html>nope</html>", { status: 200 })) as typeof fetch;
  await assert.rejects(probeRpcNode("https://web.example", 1000), RpcNodeUnreachableError);

  globalThis.fetch = (async () => new Response("", { status: 503 })) as typeof fetch;
  await assert.rejects(probeRpcNode("https://down.example", 1000), RpcNodeUnreachableError);
});
