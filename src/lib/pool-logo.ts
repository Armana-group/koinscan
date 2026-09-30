export interface PoolLogoResult {
  status: number;
  body: Buffer | null;
}

interface LogoDependencies {
  readRegistry: () => Promise<Set<string>>;
  readLogoUrl: (poolId: string) => Promise<string>;
  fetchThumbnail: (url: string) => Promise<Buffer>;
  now?: () => number;
}

const ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{20,60}$/;
const SUCCESS_TTL = 300_000;
const FAILURE_TTL = 30_000;
const CACHE_LIMIT = 256;
const MAX_ACTIVE = 4;
const MAX_PENDING = 32;
const MAX_FETCHES_PER_MINUTE = 40;

/** Bounded, per-process cache and work budget; CDN caching covers repeated reads. */
export function createPoolLogoService({ readRegistry, readLogoUrl, fetchThumbnail, now = Date.now }: LogoDependencies) {
  const cache = new Map<string, { result: PoolLogoResult; expires: number }>();
  const pending = new Map<string, Promise<PoolLogoResult>>();
  let registry: Set<string> | undefined;
  let registryExpires = 0;
  let registryPending: Promise<Set<string>> | undefined;
  let registryRetryAt = 0;
  let budgetStart = now();
  let fetches = 0;
  let active = 0;
  const waiting: (() => void)[] = [];

  function acquireSlot(): Promise<boolean> {
    if (active < MAX_ACTIVE) { active++; return Promise.resolve(true); }
    return new Promise((resolve) => {
      const ready = () => { clearTimeout(timer); resolve(true); };
      const timer = setTimeout(() => {
        waiting.splice(waiting.indexOf(ready), 1);
        resolve(false);
      }, 5_000);
      waiting.push(ready);
    });
  }

  function releaseSlot() {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }

  async function registeredPools(): Promise<Set<string>> {
    if (registry && now() < registryExpires) return registry;
    if (registryPending) return registryPending;
    if (now() < registryRetryAt) throw new Error("Registry unavailable");
    registryPending = readRegistry().then((value) => {
      registry = value;
      registryExpires = now() + 60_000;
      return value;
    }).catch((error) => {
      registryRetryAt = now() + 10_000;
      throw error;
    }).finally(() => { registryPending = undefined; });
    return registryPending;
  }

  async function get(poolId: string): Promise<PoolLogoResult> {
    if (!ADDRESS_PATTERN.test(poolId)) return { status: 400, body: null };
    const cached = cache.get(poolId);
    if (cached && now() < cached.expires) return cached.result;
    let pools: Set<string>;
    try { pools = await registeredPools(); }
    catch { return { status: 503, body: null }; }
    if (!pools.has(poolId)) return { status: 404, body: null };
    const existing = pending.get(poolId);
    if (existing) return existing;
    if (now() - budgetStart >= 60_000) { budgetStart = now(); fetches = 0; }
    if (pending.size >= MAX_PENDING || fetches >= MAX_FETCHES_PER_MINUTE) return { status: 429, body: null };
    fetches++;
    const work = (async (): Promise<PoolLogoResult> => {
      if (!await acquireSlot()) return { status: 429, body: null };
      let result: PoolLogoResult;
      try {
        const url = (await readLogoUrl(poolId)).trim();
        result = url ? { status: 200, body: await fetchThumbnail(url) } : { status: 404, body: null };
      } catch {
        result = { status: 502, body: null };
      } finally {
        releaseSlot();
      }
      cache.delete(poolId);
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
      cache.set(poolId, { result, expires: now() + (result.status === 200 ? SUCCESS_TTL : FAILURE_TTL) });
      return result;
    })();
    pending.set(poolId, work);
    try { return await work; }
    finally { pending.delete(poolId); }
  }
  return { get };
}
