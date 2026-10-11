// A small in-memory cache for REST answers that never change (transactions,
// blocks). Fresh entries skip the node; stale ones are kept so a rate-limited
// node can still be answered from memory.

export interface CachedBody {
  body: string;
  contentType: string;
  at: number;
}

export class RestCache {
  private entries = new Map<string, CachedBody>();

  constructor(
    private readonly maxEntries = 2000,
    private readonly freshMs = 10 * 60_000,
  ) {}

  get size(): number {
    return this.entries.size;
  }

  /** The entry if it is younger than freshMs. */
  fresh(key: string, now = Date.now()): CachedBody | undefined {
    const entry = this.entries.get(key);
    return entry && now - entry.at < this.freshMs ? entry : undefined;
  }

  /** The entry whatever its age. */
  any(key: string): CachedBody | undefined {
    return this.entries.get(key);
  }

  set(key: string, body: string, contentType: string, now = Date.now()): void {
    this.entries.delete(key);
    this.entries.set(key, { body, contentType, at: now });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}

const IMMUTABLE_PATHS = [/^\/v1\/transaction\//, /^\/v1\/block\//, /^\/v1\/chain\/blocks\//];

/** Paths whose answer never changes once the node has one. */
export function isImmutablePath(path: string): boolean {
  return IMMUTABLE_PATHS.some((pattern) => pattern.test(path));
}

/** The other trusted hosts to try when one is rate limited or down. */
export function alternates(origin: string, allowed: Iterable<string>): string[] {
  return [...allowed].filter((candidate) => candidate !== origin);
}
