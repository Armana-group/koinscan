import { NextResponse } from "next/server";

const COINMARKETCAP_QUOTES_URL =
  "https://pro-api.coinmarketcap.com/v3/cryptocurrency/quotes/latest?id=8282&convert=USD";

interface CoinMarketCapQuote {
  symbol: string;
  price: number;
  percent_change_24h: number;
  last_updated: string;
}

interface CoinMarketCapResponse {
  status?: {
    error_code?: string | number;
  };
  data?: Array<{
    id?: number;
    quote?: CoinMarketCapQuote[];
  }>;
}

function parseKoinQuote(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const response = value as CoinMarketCapResponse;
  if (Number(response.status?.error_code) !== 0) return null;

  const koin = response.data?.find(({ id }) => id === 8282);
  const usd = koin?.quote?.find(({ symbol }) => symbol === "USD");
  const timestamp = Date.parse(usd?.last_updated ?? "");

  if (
    !usd ||
    !Number.isFinite(usd.price) ||
    !Number.isFinite(usd.percent_change_24h) ||
    !Number.isFinite(timestamp)
  ) {
    return null;
  }

  return {
    usd: usd.price,
    change: usd.percent_change_24h,
    timestamp,
    source: "coinmarketcap",
  };
}

export async function GET() {
  const apiKey = process.env.COINMARKETCAP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KOIN price is not configured" },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(COINMARKETCAP_QUOTES_URL, {
      headers: {
        Accept: "application/json",
        "X-CMC_PRO_API_KEY": apiKey,
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "KOIN price is unavailable" },
        { status: 502 },
      );
    }

    const price = parseKoinQuote(await response.json());
    if (!price) {
      return NextResponse.json(
        { error: "Invalid KOIN price response" },
        { status: 502 },
      );
    }

    return NextResponse.json(price, {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "KOIN price is unavailable" },
      { status: 502 },
    );
  }
}
