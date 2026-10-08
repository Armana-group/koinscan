import { NextResponse } from "next/server";
import { Provider } from "koilib";
import {
  DEFAULT_JSON_RPC_NODE,
  KNOWN_RPC_ORIGINS,
  normalizeRpcOrigin,
} from "@/koinos/known-nodes";
import { createKoilibBalanceReader } from "@/lib/balance-reader";
import { getAllTokens } from "@/lib/tokens";
import { loadWalletBalances } from "@/lib/wallet-balances";

// This proxy only relays to the trusted node list. Custom nodes are read directly
// from the browser instead (see WalletBalances), so the server never fetches
// arbitrary user-supplied URLs.
const ALLOWED_RPC_ORIGINS = KNOWN_RPC_ORIGINS;
const KOINOS_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{20,60}$/;

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

  try {
    const provider = new Provider([rpcOrigin]);
    const tokens = await getAllTokens();
    const initialResult = await loadWalletBalances(
      tokens,
      address,
      createKoilibBalanceReader(provider),
    );

    let result = initialResult;
    if (initialResult.failures.length > 0) {
      const alternateRpcOrigin = [...ALLOWED_RPC_ORIGINS].find(
        (allowedOrigin) => allowedOrigin !== rpcOrigin,
      );

      if (alternateRpcOrigin) {
        const retryProvider = new Provider([alternateRpcOrigin]);
        const retryResult = await loadWalletBalances(
          initialResult.failures.map(({ token }) => token),
          address,
          createKoilibBalanceReader(retryProvider),
          1,
        );

        result = {
          balances: [...initialResult.balances, ...retryResult.balances].sort(
            (left, right) => right.numericValue - left.numericValue,
          ),
          failures: retryResult.failures,
        };
      }
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error loading account balances:", error);
    return NextResponse.json({ error: "Failed to load account balances" }, { status: 502 });
  }
}
