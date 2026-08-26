import { entityCacheGet, entityCacheSet, entityCacheClear } from '@/utils/entityCache';
import { asyncDeduplicator, logger } from '@credo/base-ui/utils';
import { hashString } from '@credo/kits/crypt';
import { CallApiError } from '@credo/connectors/connector';
import { create } from 'zustand';

const DEFAULT_CACHE_TTL = 10 * 60 * 1000;

const DEFAULT_STALE_TIME = 60 * 60 * 1000;

export const MAX_LIST_CONFLICT_RETRIES = 3;

type CacheEntry<T> = { d: T[]; t: number; h?: string };

export type FetchAllResult<T> = { items: T[]; hash?: string } | null;

export class EntityConflictError<T> extends Error {
  readonly latest: T | undefined;
  readonly serverMessage: string | undefined;
  constructor(latest: T | undefined, serverMessage?: string) {
    super(serverMessage ?? 'Entity was modified by another writer');
    this.name = 'EntityConflictError';
    this.latest = latest;
    this.serverMessage = serverMessage;
  }
}

type VersionConflictPayload<T> = {
  success: false;
  code: 'VERSION_CONFLICT';
  message?: string;
  latest?: T;
};

function isVersionConflict(err: unknown): err is CallApiError & {
  payload: VersionConflictPayload<unknown>;
} {
  if (!(err instanceof CallApiError) || err.status !== 409) return false;
  const p = err.payload;
  return (
    typeof p === 'object' && p !== null && (p as { code?: unknown }).code === 'VERSION_CONFLICT'
  );
}

export function isListVersionConflict(err: unknown): boolean {
  if (!(err instanceof CallApiError) || err.status !== 409) return false;
  const p = err.payload;
  return (
    typeof p === 'object' &&
    p !== null &&
    (p as { code?: unknown }).code === 'LIST_VERSION_CONFLICT'
  );
}

export function validationFieldsOf(err: unknown): Record<string, string> | undefined {
  if (!(err instanceof CallApiError) || err.status !== 400) return undefined;
  const fields = (err.payload as { fields?: unknown } | null)?.fields;
  if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string') out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function toEntityConflictError<T>(err: unknown): EntityConflictError<T> | never {
  if (isVersionConflict(err)) {
    const payload = err.payload as VersionConflictPayload<T>;
    return new EntityConflictError<T>(payload.latest, payload.message);
  }
  throw err;
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',')}}`;
}

export function recordHash(item: unknown): string {
  return hashString(stableStringify(item));
}

export type BulkUpsertResult<T> = {
  created: T[];
  updated: T[];
  errors: ReadonlyArray<{ index: number; message: string }>;
  summary: { total: number; created: number; updated: number; errors: number };
};

export type EntityStore<T, TUpdate = Partial<T>, TCreate = Partial<T>, TMeta = never> = {
  mapById: Map<string, T>;

  mapByCode: Map<string, T>;

  items: T[];

  loading: boolean;

  initialized: boolean;

  error: Error | null;

  cachedAt: number | null;

  hash: string | null;

  loadAll: () => Promise<void>;

  forceRefresh: () => Promise<void>;

  revalidate: () => Promise<void>;

  revalidateIfStale: (maxAgeMs?: number) => Promise<void>;

  invalidate: () => void;

  setItems: (items: T[], cachedAt?: number) => void;

  setListHash: (hash: string) => void;

  upsertItem: (item: T) => void;

  removeItem: (id: string) => void;

  getById: (id: string) => T | undefined;

  getByCode: (code: string) => T | undefined;

  getRecordHash: (item: T) => string;

  updateSafely: (args: {
    id: string;
    version: string;
    patch: Omit<TUpdate, 'version'>;
  }) => Promise<T>;

  updateSafelyWithMeta: (args: {
    id: string;
    version: string;
    patch: Omit<TUpdate, 'version'>;
  }) => Promise<{ item: T; meta?: TMeta }>;

  deleteSafely: (args: { id: string; version: string }) => Promise<void>;

  createSafely: (args: { patch: Omit<TCreate, 'expectedListHash'> }) => Promise<T>;

  bulkUpsertSafely: (args: {
    items: ReadonlyArray<Omit<TCreate, 'expectedListHash'>>;
  }) => Promise<BulkUpsertResult<T>>;

  hydrateFromCache: () => Promise<void>;
};

type EntityStoreConfig<T, TUpdate, TCreate, TMeta> = {
  cacheKey: string;

  fetchAll: (hash?: string) => Promise<FetchAllResult<T>>;

  fetchOne?: (id: string) => Promise<T>;

  update?: (id: string, patch: TUpdate) => Promise<{ item: T; listHash?: string; meta?: TMeta }>;

  delete?: (
    id: string,
    version: string,
    expectedListHash?: string,
  ) => Promise<{ listHash?: string }>;

  create?: (patch: TCreate) => Promise<{ item: T; listHash?: string }>;

  bulkUpsert?: (
    items: TCreate[],
    expectedListHash: string | undefined,
  ) => Promise<{
    created: T[];
    updated: T[];
    errors: ReadonlyArray<{ index: number; message: string }>;
    summary: { total: number; created: number; updated: number; errors: number };
    listHash?: string;
  }>;

  cacheTTL?: number;

  staleTime?: number;
};

export function createEntityStore<
  T extends { id: string },
  TUpdate = Partial<T>,
  TCreate = Partial<T>,
  TMeta = never,
>(config: EntityStoreConfig<T, TUpdate, TCreate, TMeta>) {
  const {
    cacheKey,
    fetchAll,
    update,
    delete: deleteFn,
    create: createFn,
    bulkUpsert: bulkUpsertFn,
    cacheTTL = DEFAULT_CACHE_TTL,
    staleTime = DEFAULT_STALE_TIME,
  } = config;

  const loadAllKey = `entity:${cacheKey}:loadAll`;
  const refreshKey = `entity:${cacheKey}:refresh`;
  const revalidateKey = `entity:${cacheKey}:revalidate`;

  async function loadCache(
    respectTTL = true,
  ): Promise<{ items: T[]; cachedAt: number; hash?: string } | null> {
    const entry = await entityCacheGet<CacheEntry<T>>(cacheKey);
    if (!entry) return null;
    const { d, t, h } = entry;
    if (respectTTL && Date.now() - t > cacheTTL) return null;
    return { items: d, cachedAt: t, hash: h };
  }

  function saveCache(items: T[], hash?: string): void {
    void entityCacheSet<CacheEntry<T>>(cacheKey, {
      d: items,
      t: Date.now(),
      ...(hash && { h: hash }),
    });
  }

  function buildMaps(items: T[]): { mapById: Map<string, T>; mapByCode: Map<string, T> } {
    const mapById = new Map<string, T>();
    const mapByCode = new Map<string, T>();
    for (const item of items) {
      mapById.set(item.id, item);
      const code = (item as unknown as { code?: string })?.code;
      if (code) mapByCode.set(code, item);
    }
    return { mapById, mapByCode };
  }

  return create<EntityStore<T, TUpdate, TCreate, TMeta>>((set, get) => {
    async function revalidateInBackground(): Promise<void> {
      try {
        const currentHash = get().hash ?? undefined;
        const result = await asyncDeduplicator.call(revalidateKey, () => fetchAll(currentHash));
        if (!result) {
          const { items, hash } = get();
          set({ cachedAt: Date.now() });
          saveCache(items, hash ?? undefined);
          return;
        }
        set({
          ...buildMaps(result.items),
          items: result.items,
          hash: result.hash ?? null,
          cachedAt: Date.now(),
        });
        saveCache(result.items, result.hash);
      } catch (e) {
        logger.warn(`[entity:${cacheKey}] background revalidation failed`, e);
      }
    }

    return {
      mapById: new Map<string, T>(),
      mapByCode: new Map<string, T>(),
      items: [],
      loading: false,
      initialized: false,
      error: null,
      cachedAt: null,
      hash: null,

      loadAll: async () => {
        if (get().loading || get().error) return;

        if (get().initialized) {
          void get().revalidateIfStale();
          return;
        }

        set({ loading: true });
        try {
          const cached = await loadCache();
          if (cached) {
            set({
              ...buildMaps(cached.items),
              items: cached.items,
              cachedAt: cached.cachedAt,
              hash: cached.hash ?? null,
              loading: false,
              initialized: true,
              error: null,
            });

            void revalidateInBackground();
            return;
          }

          const result = await asyncDeduplicator.call(loadAllKey, () => fetchAll());
          if (result) {
            set({
              ...buildMaps(result.items),
              items: result.items,
              hash: result.hash ?? null,
              cachedAt: Date.now(),
              initialized: true,
              error: null,
            });
            saveCache(result.items, result.hash);
          }
        } catch (e) {
          set({ error: e instanceof Error ? e : new Error(String(e)) });
        } finally {
          set({ loading: false });
        }
      },

      revalidate: async () => {
        const state = get();

        if (state.loading) return;

        if (!state.initialized) {
          await get().loadAll();
          return;
        }
        await revalidateInBackground();
      },

      revalidateIfStale: async (maxAgeMs = staleTime) => {
        const state = get();

        if (state.loading) return;

        if (!state.initialized) {
          await get().loadAll();
          return;
        }

        const age = state.cachedAt == null ? Infinity : Date.now() - state.cachedAt;
        if (age < maxAgeMs) return;
        await revalidateInBackground();
      },

      forceRefresh: async () => {
        void entityCacheClear(cacheKey);
        set({ loading: true, error: null });
        try {
          const { hash: currentHash } = get();
          const result = await asyncDeduplicator.call(refreshKey, () =>
            fetchAll(currentHash ?? undefined),
          );
          if (result) {
            set({
              ...buildMaps(result.items),
              items: result.items,
              hash: result.hash ?? null,
              cachedAt: Date.now(),
              initialized: true,
              error: null,
            });
            saveCache(result.items, result.hash);
          } else {
            const { items, hash } = get();
            set({ cachedAt: Date.now(), initialized: true });
            saveCache(items, hash ?? undefined);
          }
        } catch (e) {
          set({ error: e instanceof Error ? e : new Error(String(e)) });
        } finally {
          set({ loading: false });
        }
      },

      invalidate: () => {
        void entityCacheClear(cacheKey);
        set({ initialized: false, cachedAt: null, hash: null, error: null });
      },

      setItems: (items: T[], cachedAt?: number) => {
        const now = cachedAt ?? Date.now();
        set({
          ...buildMaps(items),
          items,
          cachedAt: now,
          hash: null,
          initialized: true,
          loading: false,
          error: null,
        });
        saveCache(items);
      },

      setListHash: (hash: string) => {
        set({ hash });

        saveCache(get().items, hash);
      },

      upsertItem: (item: T) => {
        const { items } = get();
        const next = items.some((i) => i.id === item.id)
          ? items.map((i) => (i.id === item.id ? item : i))
          : [...items, item];

        set({
          ...buildMaps(next),
          items: next,
          hash: null,
          cachedAt: Date.now(),
        });
        saveCache(next);
      },

      removeItem: (id: string) => {
        const { items } = get();
        const next = items.filter((i) => i.id !== id);
        if (next.length === items.length) return;
        set({
          ...buildMaps(next),
          items: next,
          hash: null,
          cachedAt: Date.now(),
        });
        saveCache(next);
      },

      getById: (id: string) => {
        if (!get().initialized) return undefined;
        return get().mapById.get(id);
      },

      getByCode: (code: string) => {
        if (!get().initialized) return undefined;
        return get().mapByCode.get(code);
      },

      getRecordHash: (item: T) => recordHash(item),

      updateSafely: async (args) => (await get().updateSafelyWithMeta(args)).item,

      updateSafelyWithMeta: async ({ id, version, patch }) => {
        if (!update) {
          throw new Error(
            `[entity:${cacheKey}] updateSafely called but store was created without update`,
          );
        }

        let updated: T;
        let newListHash: string | undefined;
        let meta: TMeta | undefined;
        let attempt = 0;
        while (true) {
          attempt++;
          const expectedListHash = get().hash ?? undefined;
          const body = { ...(patch as object), version, expectedListHash } as TUpdate;
          try {
            const result = await update(id, body);
            updated = result.item;
            newListHash = result.listHash;
            meta = result.meta;
            break;
          } catch (err) {
            if (isListVersionConflict(err) && attempt < MAX_LIST_CONFLICT_RETRIES) {
              set({ hash: null });
              await revalidateInBackground();
              continue;
            }

            if (isVersionConflict(err) || isListVersionConflict(err)) {
              set({ hash: null });
              await revalidateInBackground();
            }
            throw toEntityConflictError<T>(err);
          }
        }
        const { items } = get();
        const next = items.some((i) => i.id === updated.id)
          ? items.map((i) => (i.id === updated.id ? updated : i))
          : [...items, updated];

        set({
          ...buildMaps(next),
          items: next,
          hash: newListHash ?? null,
          cachedAt: Date.now(),
        });
        saveCache(next, newListHash);
        return { item: updated, ...(meta !== undefined && { meta }) };
      },

      deleteSafely: async ({ id, version }) => {
        if (!deleteFn) {
          throw new Error(
            `[entity:${cacheKey}] deleteSafely called but store was created without delete`,
          );
        }
        let newListHash: string | undefined;
        let attempt = 0;
        while (true) {
          attempt++;
          const expectedListHash = get().hash ?? undefined;
          try {
            const result = await deleteFn(id, version, expectedListHash);
            newListHash = result.listHash;
            break;
          } catch (err) {
            if (isListVersionConflict(err) && attempt < MAX_LIST_CONFLICT_RETRIES) {
              set({ hash: null });
              await revalidateInBackground();
              continue;
            }
            if (isVersionConflict(err) || isListVersionConflict(err)) {
              set({ hash: null });
              await revalidateInBackground();
            }
            throw toEntityConflictError<T>(err);
          }
        }
        const { items } = get();
        const next = items.filter((i) => i.id !== id);
        set({
          ...buildMaps(next),
          items: next,
          hash: newListHash ?? null,
          cachedAt: Date.now(),
        });
        saveCache(next, newListHash);
      },

      createSafely: async ({ patch }) => {
        if (!createFn) {
          throw new Error(
            `[entity:${cacheKey}] createSafely called but store was created without create`,
          );
        }
        let created: T;
        let newListHash: string | undefined;
        let attempt = 0;
        while (true) {
          attempt++;
          const expectedListHash = get().hash ?? undefined;
          const body = { ...(patch as object), expectedListHash } as TCreate;
          try {
            const result = await createFn(body);
            created = result.item;
            newListHash = result.listHash;
            break;
          } catch (err) {
            if (isListVersionConflict(err) && attempt < MAX_LIST_CONFLICT_RETRIES) {
              set({ hash: null });
              await revalidateInBackground();
              continue;
            }
            if (isListVersionConflict(err)) {
              set({ hash: null });
              await revalidateInBackground();
            }
            throw toEntityConflictError<T>(err);
          }
        }
        const { items } = get();
        const next = items.some((i) => i.id === created.id)
          ? items.map((i) => (i.id === created.id ? created : i))
          : [...items, created];
        set({
          ...buildMaps(next),
          items: next,
          hash: newListHash ?? null,
          cachedAt: Date.now(),
        });
        saveCache(next, newListHash);
        return created;
      },

      bulkUpsertSafely: async ({ items }) => {
        if (!bulkUpsertFn) {
          throw new Error(
            `[entity:${cacheKey}] bulkUpsertSafely called but store was created without bulkUpsert`,
          );
        }
        let result: Awaited<ReturnType<NonNullable<typeof bulkUpsertFn>>>;
        try {
          result = await bulkUpsertFn(items as TCreate[], get().hash ?? undefined);
        } catch (err) {
          if (isListVersionConflict(err)) {
            set({ hash: null });
            await revalidateInBackground();
            throw new EntityConflictError<T>(
              undefined,
              'The list changed while the batch was being prepared',
            );
          }
          throw err;
        }
        const merged = [...result.created, ...result.updated];
        if (merged.length > 0) {
          const byId = new Map(get().items.map((i) => [i.id, i]));
          for (const item of merged) byId.set(item.id, item);
          const next = Array.from(byId.values());
          set({
            ...buildMaps(next),
            items: next,
            hash: result.listHash ?? null,
            cachedAt: Date.now(),
          });
          saveCache(next, result.listHash);
        } else if (result.listHash) {
          set({ hash: result.listHash });
        }
        return {
          created: result.created,
          updated: result.updated,
          errors: result.errors,
          summary: result.summary,
        };
      },

      hydrateFromCache: async () => {
        if (get().initialized) return;
        const cached = await loadCache(false);
        if (!cached) return;
        set({
          ...buildMaps(cached.items),
          items: cached.items,
          cachedAt: cached.cachedAt,
          hash: cached.hash ?? null,
          initialized: true,
          error: null,
        });
      },
    };
  });
}
