import assert from "node:assert/strict";
import { test } from "node:test";
import config from "../../next.config.mjs";

async function getDirective(name: string): Promise<string[]> {
  assert.ok(config.headers, "headers() must be configured");
  const [route] = await config.headers();
  const csp = route.headers.find((header) => header.key === "Content-Security-Policy");
  assert.ok(csp, "CSP header must be configured");
  const directive = csp.value
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `));
  assert.ok(directive, `${name} directive must exist`);
  return directive.split(/\s+/).slice(1);
}

test("connect-src lets the browser reach any https node so custom RPC nodes work", async () => {
  const sources = await getDirective("connect-src");
  assert.ok(sources.includes("'self'"));
  assert.ok(sources.includes("https:"), "custom https nodes must be reachable");
  assert.ok(sources.includes("http://localhost:*"), "local test nodes must be reachable");
});

test("connect-src does not open plain http or wildcard hosts, and pins websockets to WalletConnect", async () => {
  const sources = await getDirective("connect-src");
  assert.ok(!sources.includes("*"));
  assert.ok(!sources.includes("http:"));
  assert.ok(!sources.includes("ws:"));
  assert.ok(!sources.includes("wss:"));
  const websockets = sources.filter((source) => source.startsWith("wss://"));
  assert.deepEqual(websockets, ["wss://relay.walletconnect.com"]);
});

test("other directives stay locked down", async () => {
  assert.deepEqual(await getDirective("default-src"), ["'self'"]);
  assert.deepEqual(await getDirective("object-src"), ["'none'"]);
  assert.deepEqual(await getDirective("frame-ancestors"), ["'none'"]);
});
