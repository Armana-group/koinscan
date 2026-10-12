import { NextResponse } from "next/server";
import { networkFor, trustedOrigin } from "@/koinos/chain-cache";

// The Network page's data: the last hundred blocks and the supply figures.
// Shared between visitors and refreshed about once a block.
export async function GET(request: Request) {
  const origin = trustedOrigin(request);
  if (!origin) return NextResponse.json({ error: "Unsupported Koinos RPC node" }, { status: 400 });
  try {
    return NextResponse.json(await networkFor(origin), { headers: { "Cache-Control": "public, s-maxage=3, stale-while-revalidate=10" } });
  } catch (error) {
    console.error("[chain/network]", error);
    return NextResponse.json({ error: "Failed to read the network" }, { status: 502 });
  }
}
