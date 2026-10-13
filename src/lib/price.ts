/**
 * KOIN Price Service
 * Fetches and caches the KOIN price from KoinScan's /api/koin-price (Armana's price service)
 */

interface KoinPriceResponse {
  usd: number;
  change: number | null;
  timestamp: number;
  source: string;
}

interface CachedPrice {
  price: number;
  change: number | null;
  fetchedAt: number;
}

export interface KoinQuote {
  usd: number;
  /** Percent change over 24 hours, or null when unknown. */
  change: number | null;
}

let cachedPrice: CachedPrice | null = null;
// Several parts of a page ask for the price as it loads; they share one request.
let pending: Promise<KoinQuote | null> | null = null;
const CACHE_TTL = 60000; // 60 seconds

const PRICE_API_URL = '/api/koin-price';

/**
 * Fetches the current KOIN price in USD
 * Returns cached price if available and fresh (< 60 seconds old)
 * Returns null if price cannot be fetched
 */
export async function getKoinPrice(): Promise<number | null> {
  return (await getKoinQuote())?.usd ?? null;
}

const quoteOf = (cached: CachedPrice | null): KoinQuote | null => (cached ? { usd: cached.price, change: cached.change } : null);

/** The KOIN price with its 24 hour change, cached like getKoinPrice. */
export async function getKoinQuote(): Promise<KoinQuote | null> {
  // Return cached price if fresh
  if (cachedPrice && Date.now() - cachedPrice.fetchedAt < CACHE_TTL) {
    return quoteOf(cachedPrice);
  }

  pending ??= fetchQuote().finally(() => {
    pending = null;
  });
  return pending;
}

async function fetchQuote(): Promise<KoinQuote | null> {
  try {
    const response = await fetch(PRICE_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Don't cache at the fetch level, we handle caching ourselves
      cache: 'no-store',
    });

    if (!response.ok) {
      // Return stale cache if available
      return quoteOf(cachedPrice);
    }

    const data: KoinPriceResponse = await response.json();

    // Update cache
    cachedPrice = {
      price: data.usd,
      change: typeof data.change === "number" ? data.change : null,
      fetchedAt: Date.now(),
    };

    return quoteOf(cachedPrice);
  } catch {
    // Return stale cache if available
    return quoteOf(cachedPrice);
  }
}

/**
 * Formats a USD value for display
 * @param value - The USD value to format
 * @returns Formatted string like "$1.23" or "< $0.01"
 */
export function formatUsdValue(value: number): string {
  if (value < 0.01) {
    return '< $0.01';
  }
  if (value < 1) {
    return `$${value.toFixed(4)}`;
  }
  if (value < 1000) {
    return `$${value.toFixed(2)}`;
  }
  if (value < 1000000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${(value / 1000000).toFixed(2)}M`;
}

/** A KOIN price to four significant figures: "$0.01864". */
export function formatKoinUsd(value: number): string {
  return `$${value < 1 ? value.toPrecision(4) : value.toFixed(2)}`;
}

/** A signed percent change: "+2.0%", "−1.4%". */
export function formatChange(value: number): string {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}%`;
}
