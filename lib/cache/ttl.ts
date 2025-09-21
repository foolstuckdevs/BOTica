type Entry<V> = { value: V; expiresAt: number };

export class TTLCache<K, V> {
  private store = new Map<string, Entry<V>>();
  constructor(private ttlMs: number) {}

  private keyToString(key: K): string {
    return typeof key === 'string' ? key : JSON.stringify(key);
  }

  get(key: K): V | undefined {
    const k = this.keyToString(key);
    const entry = this.store.get(k);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(k);
      return undefined;
    }
    return entry.value;
  }

  set(key: K, value: V): void {
    const k = this.keyToString(key);
    this.store.set(k, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

export function memoizeAsync<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  ttlMs: number,
  keyFn?: (...args: A) => string,
): (...args: A) => Promise<R> {
  const cache = new TTLCache<string, Promise<R>>(ttlMs);
  return async (...args: A) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    const hit = cache.get(key);
    if (hit) return hit;
    const p = fn(...args);
    cache.set(key, p);
    try {
      await p; // ensure settled state retained
    } catch {
      // On failure, let it expire naturally by TTL; keeping Promise avoids dogpile
    }
    return p;
  };
}
