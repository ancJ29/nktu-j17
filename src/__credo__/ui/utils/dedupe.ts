type QueuedPromise<T> = {
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

export interface AsyncDeduplicator {
  call<T>(key: string, fn: () => Promise<T>): Promise<T>;

  clear(key: string): void;

  clearAll(): void;
}

export function createAsyncDeduplicator(): AsyncDeduplicator {
  const queue = new Map<string, QueuedPromise<unknown>[]>();
  const pending = new Map<string, Promise<unknown>>();

  return Object.freeze({
    async call<T>(key: string, fn: () => Promise<T>): Promise<T> {
      const existing = pending.get(key);
      if (existing) {
        return new Promise<T>((resolve, reject) => {
          const queued = queue.get(key) ?? [];
          queued.push({ resolve, reject } as QueuedPromise<unknown>);
          queue.set(key, queued);
        });
      }

      const promise = (async () => {
        try {
          const result = await fn();

          const queued = queue.get(key) ?? [];
          queued.forEach(({ resolve }) => resolve(result));

          return result;
        } catch (error) {
          const queued = queue.get(key) ?? [];
          queued.forEach(({ reject }) => reject(error));

          throw error;
        } finally {
          queue.delete(key);
          pending.delete(key);
        }
      })();

      pending.set(key, promise);
      queue.set(key, []);

      return promise as Promise<T>;
    },

    clear(key: string): void {
      queue.delete(key);
      pending.delete(key);
    },

    clearAll(): void {
      queue.clear();
      pending.clear();
    },
  });
}

let singletonInstance: AsyncDeduplicator | null = null;

export const asyncDeduplicator = {
  call: <T>(key: string, fn: () => Promise<T>) => {
    if (!singletonInstance) singletonInstance = createAsyncDeduplicator();
    return singletonInstance.call(key, fn);
  },
  clear: (key: string) => {
    if (!singletonInstance) singletonInstance = createAsyncDeduplicator();
    return singletonInstance.clear(key);
  },
  clearAll: () => {
    if (!singletonInstance) singletonInstance = createAsyncDeduplicator();
    return singletonInstance.clearAll();
  },
} as const;
