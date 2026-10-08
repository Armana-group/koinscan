// A single, short reachability check before reading many balances from a node.
// Without it a dead or mistyped node costs a full connection timeout per token
// read, and the balances card sits in its loading state for over a minute.

export class RpcNodeUnreachableError extends Error {
  readonly rpcNode: string;

  constructor(rpcNode: string, cause?: unknown) {
    super(`RPC node unreachable: ${rpcNode}`, cause === undefined ? undefined : { cause });
    this.name = "RpcNodeUnreachableError";
    this.rpcNode = rpcNode;
  }
}

export const DEFAULT_PROBE_TIMEOUT_MS = 5000;

export async function probeRpcNode(rpcNode: string, timeoutMs = DEFAULT_PROBE_TIMEOUT_MS): Promise<void> {
  let response: Response;
  try {
    response = await fetch(rpcNode, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "chain.get_head_info", params: {} }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new RpcNodeUnreachableError(rpcNode, error);
  }

  if (!response.ok) {
    throw new RpcNodeUnreachableError(rpcNode, new Error(`HTTP ${response.status}`));
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new RpcNodeUnreachableError(rpcNode, error);
  }

  const isJsonRpc = !!body && typeof body === "object" && "jsonrpc" in body;
  if (!isJsonRpc) {
    throw new RpcNodeUnreachableError(rpcNode, new Error("not a JSON-RPC response"));
  }
}
