// A small in-memory cache for server routes that relay to a Koinos node. Every
// visitor asking within `maxAgeMs` shares one node read, requests that arrive
// while a read is under way wait for it instead of starting their own, and a
// failed read falls back to the last answer for up to `staleMs`.

interface Entry<T> {
  value?: T;
  at: number;
  pending?: Promise<T>;
}

export type FreshCache<T> = (key: string, load: () => Promise<T>) => Promise<T>;

export function freshCache<T>(maxAgeMs: number, staleMs = 5 * 60_000, now: () => number = Date.now): FreshCache<T> {
  const entries = new Map<string, Entry<T>>();
  return (key, load) => {
    let entry = entries.get(key);
    if (!entry) {
      entry = { at: 0 };
      entries.set(key, entry);
    }
    const current = entry;
    if (current.value !== undefined && now() - current.at < maxAgeMs) return Promise.resolve(current.value);
    if (!current.pending) {
      current.pending = load()
        .then((value) => {
          current.value = value;
          current.at = now();
          return value;
        })
        .catch((error: unknown) => {
          if (current.value !== undefined && now() - current.at < staleMs) return current.value;
          throw error;
        })
        .finally(() => {
          current.pending = undefined;
        });
    }
    return current.pending;
  };
}
