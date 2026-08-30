import { NextResponse } from "next/server";
import { Contract, Provider } from "koilib";
import tokenAbi from "@/koinos/abi";
import { getAllTokens } from "@/lib/tokens";
import { loadWalletBalances } from "@/lib/wallet-balances";

const DEFAULT_RPC_ORIGIN = "https://api.koinos.io";
const ALLOWED_RPC_ORIGINS = new Set([
  DEFAULT_RPC_ORIGIN,
  "https://api.koinosblocks.com",
]);
const KOINOS_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{20,60}$/;

function normalizeRpcOrigin(rpcNode: string | null): string | null {
  try {
    const url = new URL(rpcNode || DEFAULT_RPC_ORIGIN);
    if (url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function createBalanceReader(provider: Provider) {
  return async (contractAddress: string, owner: string) => {
    const contract = new Contract({
      id: contractAddress,
      provider,
      abi: tokenAbi,
    });

    const { result } = await contract.functions.balanceOf({ owner });
    return result?.value ?? "0";
  };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const address = requestUrl.searchParams.get("address") || "";
  const rpcOrigin = normalizeRpcOrigin(requestUrl.searchParams.get("rpcNode"));

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
      createBalanceReader(provider),
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
          createBalanceReader(retryProvider),
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
