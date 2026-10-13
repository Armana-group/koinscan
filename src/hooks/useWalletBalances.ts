"use client";

// Token balances for an address. Trusted nodes go through the server proxy;
// a custom node is read directly from the browser so the server never relays
// to arbitrary user-supplied URLs. The server shares an address's balances
// for a few seconds; `fresh` skips that for the wallet card, where the owner
// expects to see a transfer they just sent.
import { Provider } from "koilib";
import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { isKnownRpcNode } from "@/koinos/known-nodes";
import { createBundledBalanceReader, createKoilibBalanceReader, createMulticallBundleReader } from "@/lib/balance-reader";
import { probeRpcNode, RpcNodeUnreachableError } from "@/lib/rpc-probe";
import { getAllTokens } from "@/lib/tokens";
import { loadWalletBalances, type TokenBalance, type TokenBalanceFailure, type WalletBalanceLoadResult } from "@/lib/wallet-balances";

async function loadFromProxy(address: string, rpcNode: string, fresh: boolean, signal: AbortSignal): Promise<WalletBalanceLoadResult> {
  const searchParams = new URLSearchParams({ address, rpcNode });
  if (fresh) searchParams.set("fresh", "1");
  const response = await fetch(`/api/account-balances?${searchParams.toString()}`, { signal });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { unreachable?: boolean; busy?: boolean } | null;
    if (body?.unreachable) throw new RpcNodeUnreachableError(rpcNode, undefined, Boolean(body.busy));
    throw new Error(`Balance request failed with status ${response.status}`);
  }
  return (await response.json()) as WalletBalanceLoadResult;
}

async function loadFromCustomNode(address: string, rpcNode: string): Promise<WalletBalanceLoadResult> {
  await probeRpcNode(rpcNode);
  const tokens = await getAllTokens();
  const provider = new Provider([rpcNode]);
  return loadWalletBalances(tokens, address, createBundledBalanceReader(createMulticallBundleReader(provider), createKoilibBalanceReader(provider)), tokens.length);
}

export interface WalletBalancesState {
  balances: TokenBalance[];
  failures: TokenBalanceFailure[];
  loading: boolean;
  error: string | null;
}

interface Loaded {
  key: string;
  balances: TokenBalance[];
  failures: TokenBalanceFailure[];
  error: string | null;
}

export function useWalletBalances(address: string | null | undefined, { fresh = false }: { fresh?: boolean } = {}): WalletBalancesState {
  const { jsonRpcNode } = useWallet();
  const key = `${address ?? ""}|${jsonRpcNode}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!address || !jsonRpcNode) return;
    const controller = new AbortController();
    (async () => {
      try {
        const result = isKnownRpcNode(jsonRpcNode) ? await loadFromProxy(address, jsonRpcNode, fresh, controller.signal) : await loadFromCustomNode(address, jsonRpcNode);
        if (controller.signal.aborted) return;
        setLoaded({ key, balances: result.balances, failures: result.failures, error: null });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[balances]", error);
        setLoaded({
          key,
          balances: [],
          failures: [],
          error:
            error instanceof RpcNodeUnreachableError
              ? error.busy
                ? `The node at ${error.rpcNode} is busy right now. Try again in a moment, or pick another node in the menu.`
                : `Could not reach the node at ${error.rpcNode}. Pick another one in the menu.`
              : "Balances could not be loaded.",
        });
      }
    })();
    return () => controller.abort();
  }, [address, jsonRpcNode, fresh, key]);

  const current = loaded?.key === key ? loaded : null;
  return current ? { ...current, loading: false } : { balances: [], failures: [], loading: true, error: null };
}
