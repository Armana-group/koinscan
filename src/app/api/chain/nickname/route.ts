import { NextResponse } from "next/server";
import { nicknameFor, trustedOrigin } from "@/koinos/chain-cache";

const ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{20,60}$/;

// An address's @nickname for its page title. Owners rarely change it, so one
// read serves everyone for ten minutes.
export async function GET(request: Request) {
  const origin = trustedOrigin(request);
  if (!origin) return NextResponse.json({ error: "Unsupported Koinos RPC node" }, { status: 400 });
  const address = new URL(request.url).searchParams.get("address") ?? "";
  if (!ADDRESS.test(address)) return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  try {
    return NextResponse.json({ nickname: await nicknameFor(origin, address) }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
  } catch (error) {
    console.error("[chain/nickname]", error);
    return NextResponse.json({ error: "Failed to read the nickname" }, { status: 502 });
  }
}
