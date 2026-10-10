// JSON-RPC nodes Koinscan recommends in the node picker. Each entry is a bare
// https origin. Anything else a user types is treated as an untrusted custom node:
// the browser may call it directly, but server-side proxies only relay to this list.
export interface KnownRpcNode {
  name: string;
  operator: string;
  url: string;
}

export const DEFAULT_JSON_RPC_NODE = "https://api.koinos.io";
export const ARMANA_RPC_NODE = "https://koinos.armana.io";

export const KNOWN_RPC_NODES: readonly KnownRpcNode[] = [
  {
    name: "Koinos Community Foundation",
    operator: "Koinos Community Foundation",
    url: DEFAULT_JSON_RPC_NODE,
  },
  {
    name: "Armana",
    operator: "Armana",
    url: ARMANA_RPC_NODE,
  },
  {
    name: "KoinosBlocks",
    operator: "Community",
    url: "https://api.koinosblocks.com",
  },
];

export const KNOWN_RPC_ORIGINS: ReadonlySet<string> = new Set(
  KNOWN_RPC_NODES.map((node) => node.url),
);

// Every trusted node also serves the REST API at the same origin, and the
// Koinos Community Foundation runs a REST-only host as the default.
export const DEFAULT_REST_NODE = "https://rest.koinos.io";
export const KNOWN_REST_ORIGINS: ReadonlySet<string> = new Set([DEFAULT_REST_NODE, ...KNOWN_RPC_ORIGINS]);

export function normalizeRpcOrigin(rpcNode: string | null | undefined): string | null {
  if (!rpcNode) return null;
  try {
    const url = new URL(rpcNode);
    if (url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isKnownRpcNode(rpcNode: string | null | undefined): boolean {
  const origin = normalizeRpcOrigin(rpcNode);
  return origin !== null && KNOWN_RPC_ORIGINS.has(origin);
}
