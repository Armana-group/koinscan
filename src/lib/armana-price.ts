/** The KOIN price from Armana's price service on its public node (koinos.armana.io/v1/price/koin). */
export const ARMANA_PRICE_URL = "https://koinos.armana.io/v1/price/koin";

export interface KoinPrice {
  usd: number;
  /** Percent change over 24 hours, or null when the service has none. */
  change: number | null;
  /** Milliseconds since the epoch of the newest reading used. */
  timestamp: number;
  source: string;
}

interface ArmanaPriceResponse {
  asset?: unknown;
  usd?: unknown;
  change_24h?: unknown;
  updated?: unknown;
}

/** Maps the service's answer to the shape /api/koin-price has always returned; null when it is not usable. */
export function parseArmanaPrice(value: unknown): KoinPrice | null {
  if (!value || typeof value !== "object") return null;
  const response = value as ArmanaPriceResponse;
  if (response.asset !== "KOIN") return null;
  const { usd, change_24h: change, updated } = response;
  if (typeof usd !== "number" || !Number.isFinite(usd) || usd <= 0) return null;
  if (typeof updated !== "number" || !Number.isFinite(updated)) return null;
  return {
    usd,
    change: typeof change === "number" && Number.isFinite(change) ? change : null,
    timestamp: updated * 1000,
    source: "armana",
  };
}

export const PRICE_RANGES = ["24h", "7d", "30d"] as const;
export type PriceRange = (typeof PRICE_RANGES)[number];

export function isPriceRange(value: unknown): value is PriceRange {
  return typeof value === "string" && (PRICE_RANGES as readonly string[]).includes(value);
}

export function armanaHistoryUrl(range: PriceRange): string {
  return `${ARMANA_PRICE_URL}/history?range=${range}`;
}

export interface PricePoint {
  /** Milliseconds since the epoch at the start of the interval. */
  t: number;
  usd: number;
}

/** The service's history answer as points in milliseconds, oldest first; null when it is not usable. */
export function parseArmanaHistory(value: unknown): PricePoint[] | null {
  if (!value || typeof value !== "object") return null;
  const { asset, points } = value as { asset?: unknown; points?: unknown };
  if (asset !== "KOIN" || !Array.isArray(points)) return null;
  const out: PricePoint[] = [];
  for (const point of points) {
    const { t, usd } = (point ?? {}) as { t?: unknown; usd?: unknown };
    if (typeof t !== "number" || !Number.isFinite(t)) continue;
    if (typeof usd !== "number" || !Number.isFinite(usd) || usd <= 0) continue;
    out.push({ t: t * 1000, usd });
  }
  return out.sort((a, b) => a.t - b.t);
}
