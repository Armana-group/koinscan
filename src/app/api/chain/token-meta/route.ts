import { NextResponse } from "next/server";
import { tokenMetaFor, trustedOrigin } from "@/koinos/chain-cache";

const ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{20,60}$/;
const MAX_TOKENS = 40;

// Name, symbol and decimals of tokens that are not on the KoinDX list, for
// history rows that would otherwise say "Unknown". Set at deployment, so kept long.
export async function GET(request: Request) {
  const origin = trustedOrigin(request);
  if (!origin) return NextResponse.json({ error: "Unsupported Koinos RPC node" }, { status: 400 });
  const tokens = [...new Set((new URL(request.url).searchParams.get("tokens") ?? "").split(",").filter(Boolean))].sort();
  if (!tokens.length || tokens.length > MAX_TOKENS || !tokens.every((token) => ADDRESS.test(token))) return NextResponse.json({ error: "Invalid tokens" }, { status: 400 });
  try {
    return NextResponse.json(await tokenMetaFor(origin, tokens), { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (error) {
    console.error("[chain/token-meta]", error);
    return NextResponse.json({ error: "Failed to read tokens" }, { status: 502 });
  }
}
