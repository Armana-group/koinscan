import { NextResponse } from "next/server";
import { Provider } from "koilib";
import { DEFAULT_JSON_RPC_NODE, KNOWN_RPC_ORIGINS, normalizeRpcOrigin } from "@/koinos/known-nodes";
import { sweepPoolStakers, type PoolStakers } from "@/lib/pool-stakers";
import { probeRpcNode, RpcNodeUnreachableError } from "@/lib/rpc-probe";

// Who has staked in a Fogata pool. Reading every staker costs about one node
// request per four accounts, so the sweep runs here, once per pool every few
// minutes, and every visitor reads the cached answer. Like the other proxies,
// this only relays to the trusted node list.
const KOINOS_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{20,60}$/;
const FRESH_MS = 5 * 60_000;

interface CacheEntry {
  value?: PoolStakers;
  pending?: Promise<PoolStakers>;
}
const cache = new Map<string, CacheEntry>();

async function load(poolId: string, rpcOrigin: string): Promise<PoolStakers> {
  const key = `${rpcOrigin}|${poolId}`;
  const entry = cache.get(key) ?? {};
  if (entry.value && Date.now() - entry.value.updatedAt < FRESH_MS) return entry.value;
  if (!entry.pending) {
    entry.pending = (async () => {
      try {
        await probeRpcNode(rpcOrigin);
        const value = await sweepPoolStakers(new Provider([rpcOrigin]), poolId);
        entry.value = value;
        return value;
      } finally {
        entry.pending = undefined;
      }
    })();
    cache.set(key, entry);
  }
  // A stale answer beats waiting for the sweep.
  if (entry.value) return entry.value;
  return entry.pending;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const poolId = url.searchParams.get("poolId") || "";
  const rpcOrigin = normalizeRpcOrigin(url.searchParams.get("rpcNode") || DEFAULT_JSON_RPC_NODE);

  if (!KOINOS_ADDRESS_PATTERN.test(poolId)) return NextResponse.json({ error: "Invalid pool address" }, { status: 400 });
  if (!rpcOrigin || !KNOWN_RPC_ORIGINS.has(rpcOrigin)) return NextResponse.json({ error: "Unsupported Koinos RPC node" }, { status: 400 });

  try {
    const value = await load(poolId, rpcOrigin);
    return NextResponse.json(value, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" },
    });
  } catch (error) {
    if (error instanceof RpcNodeUnreachableError) return NextResponse.json({ error: error.message, unreachable: true }, { status: 502 });
    console.error("[pool-stakers]", error);
    return NextResponse.json({ error: "Failed to load pool stakers" }, { status: 502 });
  }
}
