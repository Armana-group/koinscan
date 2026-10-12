import { NextResponse } from "next/server";
import { latestBlocksFor, trustedOrigin } from "@/koinos/chain-cache";
import { NETWORK_SAMPLE } from "@/koinos/chain-reads";

// The newest blocks, newest first, for the Blocks page's live list. They come
// from the same shared window as the Network page, so this costs the node nothing extra.
export async function GET(request: Request) {
  const origin = trustedOrigin(request);
  if (!origin) return NextResponse.json({ error: "Unsupported Koinos RPC node" }, { status: 400 });
  const count = Number(new URL(request.url).searchParams.get("count") ?? 12);
  if (!Number.isInteger(count) || count < 1 || count > NETWORK_SAMPLE) return NextResponse.json({ error: "Invalid count" }, { status: 400 });
  try {
    return NextResponse.json(await latestBlocksFor(origin, count), { headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=5" } });
  } catch (error) {
    console.error("[chain/blocks]", error);
    return NextResponse.json({ error: "Failed to read blocks" }, { status: 502 });
  }
}
