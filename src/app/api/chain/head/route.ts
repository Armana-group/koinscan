import { NextResponse } from "next/server";
import { headFor, trustedOrigin } from "@/koinos/chain-cache";

// The head of the chain. Every open Home, Blocks and Network page asks every
// few seconds, so the answer is shared: one node read per node every couple of seconds.
export async function GET(request: Request) {
  const origin = trustedOrigin(request);
  if (!origin) return NextResponse.json({ error: "Unsupported Koinos RPC node" }, { status: 400 });
  try {
    return NextResponse.json(await headFor(origin), { headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=5" } });
  } catch (error) {
    console.error("[chain/head]", error);
    return NextResponse.json({ error: "Failed to read the head" }, { status: 502 });
  }
}
