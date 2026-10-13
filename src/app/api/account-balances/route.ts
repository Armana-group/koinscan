import { NextResponse } from "next/server";
import { Provider } from "koilib";
import {
  DEFAULT_JSON_RPC_NODE,
  KNOWN_RPC_ORIGINS,
  normalizeRpcOrigin,
} from "@/koinos/known-nodes";
import { createBundledBalanceReader, createKoilibBalanceReader, createMulticallBundleReader } from "@/lib/balance-reader";
import { freshCache } from "@/lib/fresh-cache";
import { probeRpcNode, RpcNodeUnreachableError } from "@/lib/rpc-probe";
import { getAllTokens } from "@/lib/tokens";
import { loadWalletBalances, type WalletBalanceLoadResult } from "@/lib/wallet-balances";

// This proxy only relays to the trusted node list. Custom nodes are read directly
// from the browser instead (see WalletBalances), so the server never fetches
// arbitrary user-supplied URLs.
const ALLOWED_RPC_ORIGINS = KNOWN_RPC_ORIGINS;
const KOINOS_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{20,60}$/;
// Balances move with every transfer, but a block only comes every three
// seconds: visitors asking about the same address within five share one read.
// `fresh=1` (the wallet card, right after its owner sends something) skips it.
const recent = freshCache<WalletBalanceLoadResult>(5_000, 60_000, Date.now, 2000);

async function readBalances(rpcOrigin: string, address: string): Promise<WalletBalanceLoadResult> {
  await probeRpcNode(rpcOrigin);
  const provider = new Provider([rpcOrigin]);
  const tokens = await getAllTokens();
  // Every token asked at once, so the reader can bundle them into a few node requests.
  const initialResult = await loadWalletBalances(
    tokens,
    address,
    createBundledBalanceReader(createMulticallBundleReader(provider), createKoilibBalanceReader(provider)),
    tokens.length,
  );

  if (initialResult.failures.length === 0) return initialResult;
  const alternateRpcOrigin = [...ALLOWED_RPC_ORIGINS].find(
    (allowedOrigin) => allowedOrigin !== rpcOrigin,
  );
  if (!alternateRpcOrigin) return initialResult;

  const retryProvider = new Provider([alternateRpcOrigin]);
  const retryResult = await loadWalletBalances(
    initialResult.failures.map(({ token }) => token),
    address,
    createKoilibBalanceReader(retryProvider),
    1,
  );

  return {
    balances: [...initialResult.balances, ...retryResult.balances].sort(
      (left, right) => right.numericValue - left.numericValue,
    ),
    failures: retryResult.failures,
  };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const address = requestUrl.searchParams.get("address") || "";
  const rpcOrigin = normalizeRpcOrigin(
    requestUrl.searchParams.get("rpcNode") || DEFAULT_JSON_RPC_NODE,
  );

  if (!KOINOS_ADDRESS_PATTERN.test(address)) {
    return NextResponse.json({ error: "Invalid Koinos address" }, { status: 400 });
  }

  if (!rpcOrigin || !ALLOWED_RPC_ORIGINS.has(rpcOrigin)) {
    return NextResponse.json({ error: "Unsupported Koinos RPC node" }, { status: 400 });
  }

  const fresh = requestUrl.searchParams.get("fresh") === "1";

  try {
    const result = fresh ? await readBalances(rpcOrigin, address) : await recent(`${rpcOrigin}|${address}`, () => readBalances(rpcOrigin, address));
    return NextResponse.json(result, {
      headers: { "Cache-Control": fresh || result.failures.length ? "no-store" : "public, s-maxage=5, stale-while-revalidate=5" },
    });
  } catch (error) {
    if (error instanceof RpcNodeUnreachableError) {
      console.warn(error.message);
      return NextResponse.json({ error: error.message, unreachable: true, busy: error.busy }, { status: 502 });
    }
    console.error("Error loading account balances:", error);
    return NextResponse.json({ error: "Failed to load account balances" }, { status: 502 });
  }
}
