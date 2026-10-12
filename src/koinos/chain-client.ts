// The browser's way into /api/chain: shared, cached reads for a trusted node.
// Callers check isKnownRpcNode first and ask a custom node directly instead.
export async function fetchChain<T>(path: "head" | "network" | "blocks" | "pool-names", rpcNode: string, params: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`/api/chain/${path}?${new URLSearchParams({ ...params, rpcNode })}`);
  if (!response.ok) throw new Error(`chain ${path} ${response.status}`);
  return (await response.json()) as T;
}
