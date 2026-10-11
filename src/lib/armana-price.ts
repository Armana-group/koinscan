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
