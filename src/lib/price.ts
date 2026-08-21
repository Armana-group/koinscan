/**
 * KOIN Price Service
 * Fetches and caches KOIN price from the Kondor price service
 */

interface KoinPriceResponse {
  usd: number;
  change: number;
  timestamp: number;
  source: string;
}

interface CachedPrice {
  price: number;
  fetchedAt: number;
}

let cachedPrice: CachedPrice | null = null;
const CACHE_TTL = 60000; // 60 seconds

const PRICE_API_URL = 'https://kondor-price-service.armana.workers.dev/price/koin';

/**
 * Fetches the current KOIN price in USD
 * Returns cached price if available and fresh (< 60 seconds old)
 * Returns null if price cannot be fetched
 */
export async function getKoinPrice(): Promise<number | null> {
  // Return cached price if fresh
  if (cachedPrice && Date.now() - cachedPrice.fetchedAt < CACHE_TTL) {
    return cachedPrice.price;
  }

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
      console.error('Failed to fetch KOIN price:', response.status, response.statusText);
      // Return stale cache if available
      return cachedPrice?.price ?? null;
    }

    const data: KoinPriceResponse = await response.json();

    // Update cache
    cachedPrice = {
      price: data.usd,
      fetchedAt: Date.now(),
    };

    return data.usd;
  } catch (error) {
    console.error('Error fetching KOIN price:', error);
    // Return stale cache if available
    return cachedPrice?.price ?? null;
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
