import { NextResponse } from "next/server";
import { Provider } from "koilib";
import { DEFAULT_JSON_RPC_NODE, KNOWN_RPC_ORIGINS, normalizeRpcOrigin } from "@/koinos/known-nodes";
import { BusyBlockIndex, type BlockItem } from "@/lib/busy-blocks";
import { retry } from "@/lib/retry";

// Recent blocks that carry transactions. About one Koinos block in fifty does,
// so a page of fifty means reading a few thousand blocks. The index is kept
// here per node: each request reads only the blocks since the last one, plus
// older ones when a caller pages back. Like the other proxies, this only
// relays to the trusted node list.
const PAGE_LIMIT = 100;
// About two hours of blocks, read three chunks at a time: enough for a page
// at usual activity, and short enough that a cold start answers in seconds.
const MAX_SCAN_PER_REQUEST = 2500;
const indexes = new Map<string, BusyBlockIndex>();

function readInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = value === null ? NaN : Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rpcOrigin = normalizeRpcOrigin(url.searchParams.get("rpcNode") || DEFAULT_JSON_RPC_NODE);
  if (!rpcOrigin || !KNOWN_RPC_ORIGINS.has(rpcOrigin)) return NextResponse.json({ error: "Unsupported Koinos RPC node" }, { status: 400 });

  const limit = readInt(url.searchParams.get("limit"), 50, 1, PAGE_LIMIT);
  const beforeParam = url.searchParams.get("before");
  const before = beforeParam === null ? Infinity : readInt(beforeParam, 0, 1, Number.MAX_SAFE_INTEGER);
  if (before === 0) return NextResponse.json({ error: "Invalid before height" }, { status: 400 });

  try {
    const provider = new Provider([rpcOrigin]);
    const headInfo = await provider.getHeadInfo();
    const head = Number(headInfo.head_topology.height);
    const headId = headInfo.head_topology.id;
    // Public nodes throttle a burst of reads; waiting a moment and asking again usually works.
    const getBlocks = (from: number, count: number) => retry(() => provider.getBlocks(from, count, headId, { returnBlock: true, returnReceipt: false }) as Promise<BlockItem[]>, 3, 1500);

    let index = indexes.get(rpcOrigin);
    if (!index) {
      index = new BusyBlockIndex();
      indexes.set(rpcOrigin, index);
    }
    await index.extendUp(head, getBlocks);
    const page = await index.page(before, limit, MAX_SCAN_PER_REQUEST, getBlocks);

    return NextResponse.json(page, {
      headers: {
        // The newest page changes every few blocks; older pages settle quickly.
        "Cache-Control": before === Infinity ? "public, s-maxage=10, stale-while-revalidate=30" : "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("[busy-blocks]", error);
    return NextResponse.json({ error: "Failed to read blocks" }, { status: 502 });
  }
}
