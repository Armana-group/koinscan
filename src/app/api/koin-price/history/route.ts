import { NextResponse, type NextRequest } from "next/server";
import { armanaHistoryUrl, isPriceRange, parseArmanaHistory } from "@/lib/armana-price";

// KOIN price history from Armana's price service, relayed so the browser stays on KoinScan's own origin.
export async function GET(request: NextRequest) {
  const range = request.nextUrl.searchParams.get("range") ?? "24h";
  if (!isPriceRange(range)) {
    return NextResponse.json({ error: "range must be 24h, 7d or 30d" }, { status: 400 });
  }
  try {
    const response = await fetch(armanaHistoryUrl(range), {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "KOIN price history is unavailable" }, { status: 502 });
    }
    const points = parseArmanaHistory(await response.json());
    if (!points) {
      return NextResponse.json({ error: "Invalid KOIN price history response" }, { status: 502 });
    }
    return NextResponse.json(
      { range, points },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400" } },
    );
  } catch {
    return NextResponse.json({ error: "KOIN price history is unavailable" }, { status: 502 });
  }
}
