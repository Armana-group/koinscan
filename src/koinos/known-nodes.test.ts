import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ARMANA_RPC_NODE,
  DEFAULT_JSON_RPC_NODE,
  KNOWN_RPC_NODES,
  KNOWN_RPC_ORIGINS,
  isKnownRpcNode,
} from "./known-nodes";

test("known nodes list the trusted operators Koinscan recommends", () => {
  const urls = KNOWN_RPC_NODES.map((node) => node.url);
  assert.ok(urls.includes("https://api.koinos.io"));
  assert.ok(urls.includes("https://api.koinosblocks.com"));
  assert.ok(urls.includes(ARMANA_RPC_NODE));
  assert.equal(ARMANA_RPC_NODE, "https://koinos.armana.io");
  assert.equal(DEFAULT_JSON_RPC_NODE, "https://api.koinos.io");

  const kcf = KNOWN_RPC_NODES.find((node) => node.url === "https://api.koinos.io");
  assert.equal(kcf?.operator, "Koinos Community Foundation");
});

test("every known node is an https origin with no path, and origins are unique", () => {
  for (const node of KNOWN_RPC_NODES) {
    const url = new URL(node.url);
    assert.equal(url.protocol, "https:", `${node.url} must use https`);
    assert.equal(url.origin, node.url, `${node.url} must be a bare origin`);
    assert.ok(node.name.length > 0);
    assert.ok(node.operator.length > 0);
  }
  assert.equal(new Set(KNOWN_RPC_NODES.map((node) => node.url)).size, KNOWN_RPC_NODES.length);
  assert.deepEqual([...KNOWN_RPC_ORIGINS].sort(), KNOWN_RPC_NODES.map((node) => node.url).sort());
});

test("isKnownRpcNode matches by origin and rejects anything else", () => {
  assert.equal(isKnownRpcNode("https://api.koinos.io"), true);
  assert.equal(isKnownRpcNode("https://api.koinos.io/"), true);
  assert.equal(isKnownRpcNode("https://koinos.armana.io"), true);
  assert.equal(isKnownRpcNode("http://api.koinos.io"), false);
  assert.equal(isKnownRpcNode("https://evil.example"), false);
  assert.equal(isKnownRpcNode("https://api.koinos.io.evil.example"), false);
  assert.equal(isKnownRpcNode("not a url"), false);
  assert.equal(isKnownRpcNode(""), false);
});
