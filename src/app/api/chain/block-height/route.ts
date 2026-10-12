import { NextResponse } from "next/server";
import { blockHeightFor, trustedOrigin } from "@/koinos/chain-cache";

const BLOCK_ID = /^0x[0-9a-fA-F]{64,80}$/;

// Which height a block id is at, for the transaction page's "in block 123".
// It never changes, so one read serves everyone for a day.
export async function GET(request: Request) {
  const origin = trustedOrigin(request);
  if (!origin) return NextResponse.json({ error: "Unsupported Koinos RPC node" }, { status: 400 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!BLOCK_ID.test(id)) return NextResponse.json({ error: "Invalid block id" }, { status: 400 });
  try {
    return NextResponse.json({ height: await blockHeightFor(origin, id) }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch (error) {
    console.error("[chain/block-height]", error);
    return NextResponse.json({ error: "Failed to read the block" }, { status: 502 });
  }
}
