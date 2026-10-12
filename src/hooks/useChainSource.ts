import type { ProviderInterface } from "koilib";
import { useWallet } from "@/contexts/WalletContext";
import { isKnownRpcNode } from "@/koinos/known-nodes";

/**
 * Where live chain reads go: a trusted node through the shared /api/chain
 * cache (`shared`), a custom one directly through `direct`. Reads from a
 * trusted node need no provider, so they are not repeated each time the
 * wallet replaces it while settings load.
 */
export function useChainSource(): { node: string; shared: boolean; direct: ProviderInterface | null } {
  const { provider, jsonRpcNode } = useWallet();
  const shared = isKnownRpcNode(jsonRpcNode);
  return { node: jsonRpcNode, shared, direct: shared ? null : (provider ?? null) };
}
