import type { InventoryV2Row } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';
import { createEntityStore } from './createEntityStore';

type FlatUpdateBody = { version: string; expectedListHash?: string } & Record<string, unknown>;

type FlatCreateBody = { expectedListHash?: string } & Record<string, unknown>;

export type InventoryV2Store = ReturnType<typeof createInventoryV2Store>;

export type InventoryV2Wire = {
  getAll: (params?: { hash: string }) => Promise<{
    changed: boolean;
    items?: unknown[] | undefined;
    hash?: string | undefined;
  }>;
  set: (args: {
    itemId: string;
    onHand: number;
    note?: string | undefined;
    version?: string | undefined;
    expectedListHash?: string | undefined;
  }) => Promise<{ item: unknown; listHash?: string | undefined }>;
};

const writeArgsOf = (body: Record<string, unknown>) => ({
  itemId: String(body['itemId'] ?? ''),
  onHand: Number(body['onHand'] ?? 0),
  ...(typeof body['note'] === 'string' ? { note: body['note'] } : {}),
});

export function createInventoryV2Store(config: { cacheKey: string; wire: InventoryV2Wire }) {
  const { cacheKey, wire } = config;

  return createEntityStore<InventoryV2Row, FlatUpdateBody, FlatCreateBody>({
    cacheKey,

    cacheTTL: ONE_MINUTE,

    fetchAll: (hash) =>
      wire.getAll(hash !== undefined ? { hash } : undefined).then((r) =>
        r.changed
          ? {
              items: (r.items ?? []) as InventoryV2Row[],
              ...(r.hash !== undefined && { hash: r.hash }),
            }
          : null,
      ),

    create: (body) =>
      wire.set({ ...writeArgsOf(body), expectedListHash: body.expectedListHash }).then((r) => ({
        item: r.item as InventoryV2Row,
        ...(r.listHash !== undefined && { listHash: r.listHash }),
      })),

    update: (_id, body) =>
      wire
        .set({
          ...writeArgsOf(body),
          version: body.version,
          expectedListHash: body.expectedListHash,
        })
        .then((r) => ({
          item: r.item as InventoryV2Row,
          ...(r.listHash !== undefined && { listHash: r.listHash }),
        })),
  });
}
