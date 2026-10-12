import { NextResponse } from "next/server";
import { tokenBalancesFor, trustedOrigin } from "@/koinos/chain-cache";

const ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{20,60}$/;
const MAX_TOKENS = 40;

// An address's raw balances in tokens that are not on the KoinDX list (the
// listed ones come from /api/account-balances). Kept only a few seconds.
export async function GET(request: Request) {
  const origin = trustedOrigin(request);
  if (!origin) return NextResponse.json({ error: "Unsupported Koinos RPC node" }, { status: 400 });
  const params = new URL(request.url).searchParams;
  const address = params.get("address") ?? "";
  const tokens = [...new Set((params.get("tokens") ?? "").split(",").filter(Boolean))].sort();
  if (!ADDRESS.test(address)) return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  if (!tokens.length || tokens.length > MAX_TOKENS || !tokens.every((token) => ADDRESS.test(token))) return NextResponse.json({ error: "Invalid tokens" }, { status: 400 });
  try {
    return NextResponse.json(await tokenBalancesFor(origin, address, tokens), { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10" } });
  } catch (error) {
    console.error("[chain/token-balances]", error);
    return NextResponse.json({ error: "Failed to read balances" }, { status: 502 });
  }
}
