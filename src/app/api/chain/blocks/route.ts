import { NextResponse } from "next/server";
import { latestBlocksFor, rangeFor, trustedOrigin } from "@/koinos/chain-cache";
import { NETWORK_SAMPLE } from "@/koinos/chain-reads";

// Blocks for the Blocks page, newest first. Without `from`, the newest ones,
// from the same shared window as the Network page. With `from`, an older
// stretch: final blocks never change, so those are kept for a day.
export async function GET(request: Request) {
  const origin = trustedOrigin(request);
  if (!origin) return NextResponse.json({ error: "Unsupported Koinos RPC node" }, { status: 400 });
  const params = new URL(request.url).searchParams;
  const count = Number(params.get("count") ?? 12);
  if (!Number.isInteger(count) || count < 1 || count > NETWORK_SAMPLE) return NextResponse.json({ error: "Invalid count" }, { status: 400 });
  const from = params.has("from") ? Number(params.get("from")) : null;
  if (from !== null && (!Number.isSafeInteger(from) || from < 1)) return NextResponse.json({ error: "Invalid from height" }, { status: 400 });
  try {
    if (from === null) return NextResponse.json(await latestBlocksFor(origin, count), { headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=5" } });
    const { blocks, final } = await rangeFor(origin, from, count);
    return NextResponse.json(blocks, {
      headers: { "Cache-Control": final ? "public, s-maxage=86400, stale-while-revalidate=604800" : "public, s-maxage=2, stale-while-revalidate=5" },
    });
  } catch (error) {
    console.error("[chain/blocks]", error);
    return NextResponse.json({ error: "Failed to read blocks" }, { status: 502 });
  }
}
