import { NextResponse } from "next/server";

const PRICE_API_URL = "https://kondor-price-service.armana.workers.dev/price/koin";

interface KoinPriceResponse {
  usd: number;
  change: number;
  timestamp: number;
  source: string;
}

function isKoinPriceResponse(value: unknown): value is KoinPriceResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<KoinPriceResponse>;
  return (
    typeof candidate.usd === "number" &&
    Number.isFinite(candidate.usd) &&
    typeof candidate.change === "number" &&
    typeof candidate.timestamp === "number" &&
    typeof candidate.source === "string"
  );
}

export async function GET() {
  try {
    const response = await fetch(PRICE_API_URL, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "KOIN price is unavailable" }, { status: 502 });
    }

    const data: unknown = await response.json();
    if (!isKoinPriceResponse(data)) {
      return NextResponse.json({ error: "Invalid KOIN price response" }, { status: 502 });
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=60" },
    });
  } catch {
    return NextResponse.json({ error: "KOIN price is unavailable" }, { status: 502 });
  }
}
