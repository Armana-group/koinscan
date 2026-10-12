import { NextResponse } from "next/server";
import { poolNamesFor, trustedOrigin } from "@/koinos/chain-cache";

// Names from the Fogata pool registry, which every page uses to label addresses.
// They rarely change, so one read serves everyone for ten minutes.
export async function GET(request: Request) {
  const origin = trustedOrigin(request);
  if (!origin) return NextResponse.json({ error: "Unsupported Koinos RPC node" }, { status: 400 });
  try {
    return NextResponse.json(await poolNamesFor(origin), { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
  } catch (error) {
    console.error("[chain/pool-names]", error);
    return NextResponse.json({ error: "Failed to read pool names" }, { status: 502 });
  }
}
