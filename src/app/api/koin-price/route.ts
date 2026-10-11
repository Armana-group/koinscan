import { NextResponse } from "next/server";
import { ARMANA_PRICE_URL, parseArmanaPrice } from "@/lib/armana-price";

// The price comes from Armana's price service (the median of CoinMarketCap, CoinGecko and the KoinDX pools),
// so KoinScan needs no CoinMarketCap key of its own. The route keeps its response shape for the browser.
export async function GET() {
  try {
    const response = await fetch(ARMANA_PRICE_URL, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "KOIN price is unavailable" },
        { status: 502 },
      );
    }

    const price = parseArmanaPrice(await response.json());
    if (!price) {
      return NextResponse.json(
        { error: "Invalid KOIN price response" },
        { status: 502 },
      );
    }

    return NextResponse.json(price, {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=60, stale-while-revalidate=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "KOIN price is unavailable" },
      { status: 502 },
    );
  }
}
