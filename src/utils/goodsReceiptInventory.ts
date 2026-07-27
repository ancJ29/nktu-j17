

import { cMngtConnector } from '@credo/connectors/connector';
import { useAuthStore } from '@/stores/useAuthStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { useProductStore } from '@/stores/useProductStore';
import type {
  GoodsReceipt,
  GoodsReceiptItem,
  Product,
  ProductInventoryExtra,
  ProductInventoryRow,
} from '@/types';
import { isDefaultLocation } from '@/types/location';
import { applyDelta, readRowBreakdown } from './inventoryMath';
import { logActivity } from './activityLogger';
import { getItemBaseUnit } from './unitConversion';
import { isNoInventoryProduct } from './productSet';
import { aggregateByCode, pruneZeros, positiveOnly } from './goodsReceiptInventoryHelpers';
import { getCurrentEmployeeId } from '@/hooks';

export type InventoryEffectDirection = 'increment' | 'decrement';

function dropExpectedForReceipt(
  current: Record<string, { receiptNumber: string; byUnit: Record<string, number> }> | undefined,
  receiptId: string,
): Record<string, { receiptNumber: string; byUnit: Record<string, number> }> | undefined {
  if (!current) return undefined;
  if (!(receiptId in current)) return current;
  const next = { ...current };
  delete next[receiptId];
  return Object.keys(next).length > 0 ? next : undefined;
}

function nextReceivedByGoodsReceipt(
  current: Record<string, { receiptNumber: string; byUnit: Record<string, number> }> | undefined,
  receipt: GoodsReceipt,
  sign: 1 | -1,
  positiveDeltas: Record<string, number>,
): Record<string, { receiptNumber: string; byUnit: Record<string, number> }> | undefined {
  const next = { ...(current ?? {}) };
  if (sign > 0) {
    next[receipt.id] = {
      receiptNumber: receipt.receiptNumber,
      byUnit: { ...positiveDeltas },
    };
  } else {
    delete next[receipt.id];
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export type InventoryEffectResult = {
  attempted: number;
  succeeded: number;
  failed: number;
  
  alreadyPosted: number;
  errors: string[];
};

function sameLocation(a: string | undefined | null, b: string | undefined | null): boolean {
  if (a === b) return true;
  return isDefaultLocation(a) && isDefaultLocation(b);
}

function isPostedOnRow(row: ProductInventoryRow, receiptId: string): boolean {
  return !!row.extra?.receivedByGoodsReceipt?.[receiptId];
}

export async function clearGoodsReceiptMarkers(
  receipt: GoodsReceipt,
): Promise<InventoryEffectResult> {
  const result: InventoryEffectResult = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    alreadyPosted: 0,
    errors: [],
  };
  const productItems = receipt.items.filter((i) => i.itemType === 'product');
  if (productItems.length === 0) return result;

  const snap = await cMngtConnector.getAllProductInventory<ProductInventoryExtra>();
  const rows = snap.changed ? snap.productInventory : useProductInventoryStore.getState().items;

  let touched = false;
  for (const itemCode of aggregateByCode(productItems, 1).keys()) {
    const row = rows.find(
      (r) => r.itemCode === itemCode && sameLocation(r.locationCode, receipt.locationCode),
    );
    if (!row || !isPostedOnRow(row, receipt.id)) continue;
    result.attempted += 1;
    try {
      const next = { ...row.extra?.receivedByGoodsReceipt };
      delete next[receipt.id];
      
      
      
      
      await useProductInventoryStore.getState().updateSafely({
        id: row.id,
        version: row.version,
        patch: {
          extra: {
            ...row.extra,
            receivedByGoodsReceipt: Object.keys(next).length > 0 ? next : undefined,
          } as ProductInventoryExtra,
        },
      });
      touched = true;
      result.succeeded += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push(
        `product:${itemCode} — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (touched) await useProductInventoryStore.getState().forceRefresh();
  return result;
}

async function ensureLoaded<T>(
  initialized: boolean,
  loadAll: () => Promise<T> | void,
): Promise<void> {
  if (initialized) return;
  await Promise.resolve(loadAll());
}

async function applyForKind(
  kind: 'product' | 'material',
  items: GoodsReceiptItem[],
  sign: 1 | -1,
  receipt: GoodsReceipt,
  result: InventoryEffectResult,
): Promise<void> {
  if (items.length === 0) return;

  const totals = aggregateByCode(items, sign);

  
  
  
  
  let entityPool: readonly Product[];
  if (kind === 'product') {
    const s = useProductStore.getState();
    await ensureLoaded(s.initialized, s.loadAll);
    entityPool = useProductStore.getState().items;
  } else {
    entityPool = [];
  }
  const findEntity = (code: string): Product | undefined => entityPool.find((e) => e.code === code);

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  let rows: ProductInventoryRow[];
  if (kind === 'product') {
    const snap = await cMngtConnector.getAllProductInventory<ProductInventoryExtra>();
    rows = snap.changed ? snap.productInventory : useProductInventoryStore.getState().items;
  } else {
    
    rows = [];
  }

  
  
  
  
  const lastUpdatedBy =
    getCurrentEmployeeId() ?? useAuthStore.getState().user?.email ?? 'goods-receipt';
  
  
  
  
  
  
  
  
  
  const activitySource = {
    kind: 'GR' as const,
    id: receipt.id,
    label: receipt.receiptNumber,
    ...(sign < 0 ? { suffix: '(cancelled)' } : {}),
  };
  const locationCode = receipt.locationCode;

  for (const [itemCode, rawDeltas] of totals) {
    const deltas = pruneZeros(rawDeltas);
    if (Object.keys(deltas).length === 0) continue;
    result.attempted += 1;

    const entity = findEntity(itemCode);
    if (!entity) {
      result.failed += 1;
      result.errors.push(`${kind}:${itemCode} — master-data record not found`);
      continue;
    }
    
    
    
    if (kind === 'product' && isNoInventoryProduct(entity as Product)) {
      result.attempted -= 1;
      continue;
    }
    const baseUnit = getItemBaseUnit(entity);

    const existing = rows.find(
      (r) => r.itemCode === itemCode && sameLocation(r.locationCode, locationCode),
    );

    
    
    
    
    
    
    if (sign > 0 && existing && isPostedOnRow(existing, receipt.id)) {
      result.attempted -= 1;
      result.alreadyPosted += 1;
      continue;
    }

    try {
      if (existing) {
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        const breakdown = readRowBreakdown(existing, baseUnit);
        const applied = applyDelta(entity, breakdown, deltas, { allowNegative: true });
        if (!applied.ok) {
          result.failed += 1;
          result.errors.push(
            applied.reason === 'negative'
              ? `${kind}:${itemCode} — insufficient stock (would be ${applied.wouldBe} ${applied.unit})`
              : `${kind}:${itemCode} — unknown unit ${applied.unit} on item`,
          );
          continue;
        }

        
        
        
        
        
        
        
        
        
        
        const nextExpected =
          sign > 0
            ? dropExpectedForReceipt(existing.extra?.expectedFromGoodsReceipt, receipt.id)
            : existing.extra?.expectedFromGoodsReceipt;
        const updatedExtra = {
          ...existing.extra,
          unit: baseUnit,
          onHandByUnit: applied.onHandByUnit,
          receivedByGoodsReceipt: nextReceivedByGoodsReceipt(
            existing.extra?.receivedByGoodsReceipt,
            receipt,
            sign,
            sign > 0 ? deltas : {},
          ),
          expectedFromGoodsReceipt: nextExpected,
          lastUpdatedBy,
        };

        if (kind === 'product') {
          await useProductInventoryStore.getState().updateSafely({
            id: existing.id,
            version: existing.version,
            patch: { onHand: applied.onHand, extra: updatedExtra as ProductInventoryExtra },
          });
        } else {
          // skip material inventory
        }
        
        
        
        
        
        logActivity(
          kind === 'product' ? 'productInventory.adjust' : 'materialInventory.adjust',
          entity.id,
          {
            locationCode,
            prevOnHand: existing.onHand,
            nextOnHand: applied.onHand,
            delta: applied.onHand - existing.onHand,
            source: activitySource,
          },
        );
      } else {
        
        
        
        if (sign < 0) {
          result.failed += 1;
          result.errors.push(
            `${kind}:${itemCode} — no inventory row at ${locationCode} to reverse`,
          );
          continue;
        }

        
        
        const seed = positiveOnly(deltas);
        if (Object.keys(seed).length === 0) {
          
          result.failed += 1;
          result.errors.push(`${kind}:${itemCode} — no positive quantity to seed inventory`);
          continue;
        }
        const applied = applyDelta(entity, {}, seed);
        if (!applied.ok) {
          result.failed += 1;
          result.errors.push(
            `${kind}:${itemCode} — ${applied.reason === 'unknown-unit' ? `unknown unit ${applied.unit}` : 'invalid seed'}`,
          );
          continue;
        }

        
        
        
        const newExtra = {
          unit: baseUnit,
          onHandByUnit: applied.onHandByUnit,
          receivedByGoodsReceipt: {
            [receipt.id]: {
              receiptNumber: receipt.receiptNumber,
              byUnit: { ...seed },
            },
          },
          lastUpdatedBy,
        };

        if (kind === 'product') {
          await useProductInventoryStore.getState().createSafely({
            patch: {
              itemCode,
              locationCode,
              onHand: applied.onHand,
              extra: newExtra as ProductInventoryExtra,
            },
          });
          logActivity('productInventory.create', entity.id, {
            locationCode,
            onHand: applied.onHand,
            source: activitySource,
          });
        } else {
          // skip material inventory
        }
      }
      result.succeeded += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push(
        `${kind}:${itemCode} — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  
  
  
  
  
  if (kind === 'product') {
    await useProductInventoryStore.getState().forceRefresh();
  } else {
    // skip material inventory
  }
}

export async function applyGoodsReceiptInventoryEffect(
  receipt: GoodsReceipt,
  direction: InventoryEffectDirection,
): Promise<InventoryEffectResult> {
  const result: InventoryEffectResult = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    alreadyPosted: 0,
    errors: [],
  };
  const sign: 1 | -1 = direction === 'increment' ? 1 : -1;

  const productItems = receipt.items.filter((i) => i.itemType === 'product');

  await applyForKind('product', productItems, sign, receipt, result);
  return result;
}

export type LinePostingState = 'posted' | 'missing' | 'skipped' | 'orphaned';

export type GoodsReceiptPostingStatus = {
  
  byItemCode: Map<string, LinePostingState>;
  
  missingCount: number;
};

export async function getGoodsReceiptPostingStatus(
  receipt: GoodsReceipt,
): Promise<GoodsReceiptPostingStatus> {
  const byItemCode = new Map<string, LinePostingState>();
  const productItems = receipt.items.filter((i) => i.itemType === 'product');
  if (productItems.length === 0) return { byItemCode, missingCount: 0 };

  const productStore = useProductStore.getState();
  await ensureLoaded(productStore.initialized, productStore.loadAll);
  const products = useProductStore.getState().items;

  
  
  
  
  
  
  
  const flagged = receipt.extra?.inventoryPosted === true;
  const rows = flagged
    ? []
    : await (async () => {
        const snap = await cMngtConnector.getAllProductInventory<ProductInventoryExtra>();
        return snap.changed ? snap.productInventory : useProductInventoryStore.getState().items;
      })();

  let missingCount = 0;
  for (const itemCode of aggregateByCode(productItems, 1).keys()) {
    const product = products.find((p) => p.code === itemCode);
    if (!product) {
      byItemCode.set(itemCode, 'orphaned');
      continue;
    }
    if (isNoInventoryProduct(product)) {
      byItemCode.set(itemCode, 'skipped');
      continue;
    }
    if (flagged) {
      byItemCode.set(itemCode, 'posted');
      continue;
    }
    const row = rows.find(
      (r) => r.itemCode === itemCode && sameLocation(r.locationCode, receipt.locationCode),
    );
    if (row && isPostedOnRow(row, receipt.id)) {
      byItemCode.set(itemCode, 'posted');
    } else {
      byItemCode.set(itemCode, 'missing');
      missingCount += 1;
    }
  }

  return { byItemCode, missingCount };
}

type GoodsReceiptKind = 'product' | 'material';

type RowContribution = {
  kind: GoodsReceiptKind;
  itemCode: string;
  locationCode: string;
  
  byUnit: Record<string, number>;
};

function buildContributionsByRow(receipt: GoodsReceipt): Map<string, RowContribution> {
  const out = new Map<string, RowContribution>();
  for (const line of receipt.items) {
    if (!line.itemCode || line.quantity === 0) continue;
    const key = `${line.itemType}|${line.itemCode}|${receipt.locationCode}`;
    const cur = out.get(key);
    if (cur) {
      cur.byUnit[line.unit] = (cur.byUnit[line.unit] ?? 0) + line.quantity;
    } else {
      out.set(key, {
        kind: line.itemType,
        itemCode: line.itemCode,
        locationCode: receipt.locationCode,
        byUnit: { [line.unit]: line.quantity },
      });
    }
  }
  
  for (const [k, v] of out) {
    for (const u of Object.keys(v.byUnit)) {
      if (v.byUnit[u] === 0) delete v.byUnit[u];
    }
    if (Object.keys(v.byUnit).length === 0) out.delete(k);
  }
  return out;
}

export async function syncDraftIncomingToInventory(
  prev: GoodsReceipt | null,
  curr: GoodsReceipt | null,
): Promise<InventoryEffectResult> {
  const result: InventoryEffectResult = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    alreadyPosted: 0,
    errors: [],
  };
  if (!prev && !curr) return result;

  const ref = (curr ?? prev) as GoodsReceipt;
  const receiptId = ref.id;
  const receiptNumber = ref.receiptNumber;

  const prevMap = prev ? buildContributionsByRow(prev) : new Map<string, RowContribution>();
  const currMap = curr ? buildContributionsByRow(curr) : new Map<string, RowContribution>();
  const allKeys = new Set<string>([...prevMap.keys(), ...currMap.keys()]);
  if (allKeys.size === 0) return result;

  
  
  const touchedKinds = new Set<GoodsReceiptKind>();
  for (const k of allKeys) touchedKinds.add(k.split('|')[0] as GoodsReceiptKind);

  let productRows: ProductInventoryRow[] = [];
  if (touchedKinds.has('product')) {
    const snap = await cMngtConnector.getAllProductInventory<ProductInventoryExtra>();
    productRows = snap.changed ? snap.productInventory : useProductInventoryStore.getState().items;
  }
  if (touchedKinds.has('material')) {
    // skip material inventory
  }

  for (const key of allKeys) {
    const target = (currMap.get(key) ?? prevMap.get(key)) as RowContribution;
    const currC = currMap.get(key);
    result.attempted += 1;

    const rows = target.kind === 'product' ? productRows : [];
    const row = rows.find(
      (r) => r.itemCode === target.itemCode && sameLocation(r.locationCode, target.locationCode),
    );

    try {
      if (!row) {
        
        
        
        
        
        
        if (!currC) {
          result.succeeded += 1;
          continue;
        }
        const newExtra = {
          expectedFromGoodsReceipt: {
            [receiptId]: { receiptNumber, byUnit: { ...currC.byUnit } },
          },
        };
        if (target.kind === 'product') {
          await useProductInventoryStore.getState().createSafely({
            patch: {
              itemCode: target.itemCode,
              locationCode: target.locationCode,
              onHand: 0,
              extra: newExtra as ProductInventoryExtra,
            },
          });
        } else {
          // skip material inventory
        }
        result.succeeded += 1;
        continue;
      }

      const prior = row.extra?.expectedFromGoodsReceipt;
      let next: Record<string, { receiptNumber: string; byUnit: Record<string, number> }>;
      if (currC) {
        next = { ...(prior ?? {}), [receiptId]: { receiptNumber, byUnit: { ...currC.byUnit } } };
      } else {
        if (!prior || !(receiptId in prior)) {
          
          result.succeeded += 1;
          continue;
        }
        next = { ...prior };
        delete next[receiptId];
      }
      const cleaned = Object.keys(next).length > 0 ? next : undefined;

      const updatedExtra = { ...row.extra, expectedFromGoodsReceipt: cleaned };
      if (target.kind === 'product') {
        await useProductInventoryStore.getState().updateSafely({
          id: row.id,
          version: row.version,
          patch: { extra: updatedExtra as ProductInventoryExtra },
        });
      } else {
        // skip material inventory
      }
      result.succeeded += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push(
        `${target.kind}:${target.itemCode} — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  
  
  if (touchedKinds.has('product')) {
    await useProductInventoryStore.getState().forceRefresh();
  }
  if (touchedKinds.has('material')) {
    // skip material inventory
  }

  return result;
}
