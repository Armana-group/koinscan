// A single, short reachability check before reading many balances from a node.
// Without it a dead or mistyped node costs a full connection timeout per token
// read, and the balances card sits in its loading state for over a minute.
//
// Two kinds of failure are told apart. A node that cannot be reached at all
// (connection refused, timeout) is "unreachable". A node that answers but is
// throttling us (429, a 5xx, or an HTML error page where JSON should be) is
// "busy": that gets one more try after a short pause, and callers can word
// the message accordingly. A node that answered recently is not probed again.

export class RpcNodeUnreachableError extends Error {
  readonly rpcNode: string;
  /** True when the node answered but refused or throttled the request. */
  readonly busy: boolean;

  constructor(rpcNode: string, cause?: unknown, busy = false) {
    super(`RPC node ${busy ? "busy" : "unreachable"}: ${rpcNode}`, cause === undefined ? undefined : { cause });
    this.name = "RpcNodeUnreachableError";
    this.rpcNode = rpcNode;
    this.busy = busy;
  }
}

export const DEFAULT_PROBE_TIMEOUT_MS = 5000;
/** A node that answered this recently is trusted without asking again. */
export const PROBE_FRESH_MS = 30_000;
const BUSY_RETRY_DELAY_MS = 1000;

const lastOk = new Map<string, number>();

/** Forget remembered probes; for tests. */
export function forgetProbes(): void {
  lastOk.clear();
}

class BusySignal extends Error {}

async function probeOnce(rpcNode: string, timeoutMs: number): Promise<void> {
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

  if (!response.ok) throw new BusySignal(`HTTP ${response.status}`);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new BusySignal("not JSON");
  }

  const isJsonRpc = !!body && typeof body === "object" && "jsonrpc" in body;
  if (!isJsonRpc) throw new BusySignal("not a JSON-RPC response");
}

export async function probeRpcNode(rpcNode: string, timeoutMs = DEFAULT_PROBE_TIMEOUT_MS, now = Date.now()): Promise<void> {
  const okAt = lastOk.get(rpcNode);
  if (okAt !== undefined && now - okAt < PROBE_FRESH_MS) return;

  let lastBusy: BusySignal | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, BUSY_RETRY_DELAY_MS));
    try {
      await probeOnce(rpcNode, timeoutMs);
      lastOk.set(rpcNode, Date.now());
      return;
    } catch (error) {
      if (error instanceof BusySignal) {
        lastBusy = error;
        continue;
      }
      throw error;
    }
  }
  throw new RpcNodeUnreachableError(rpcNode, lastBusy, true);
}
