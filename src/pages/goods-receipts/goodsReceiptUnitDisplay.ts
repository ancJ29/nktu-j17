import { lookupLabelOf, type useLookupV2Labels } from '@/hooks';
import type { GoodsReceiptItem } from '@/types';
import { convertUnit } from '@/utils/unitConversion';

export type PackagingAwareEntity = {
  readonly code: string;
  readonly extra?: {
    readonly units?: readonly string[];
    readonly unitConversions?: readonly { unit: string; quantity: number; baseUnit: string }[];
  };
};

export function resolveBaseUnitDisplay(
  item: GoodsReceiptItem,
  products: readonly PackagingAwareEntity[],
  unitLabels: ReturnType<typeof useLookupV2Labels>,
): string | null {
  const pool = products;
  const entity = pool.find((e) => e.code === item.itemCode);
  const baseUnit = entity?.extra?.units?.[0];
  if (!baseUnit || baseUnit === item.unit) return null;
  const conversions = entity?.extra?.unitConversions ?? [];
  if (conversions.length === 0) return null;
  const baseQty = convertUnit(item.quantity, item.unit, baseUnit, [...conversions]);
  if (baseQty === null) return null;
  return `≈ ${baseQty.toLocaleString()} ${lookupLabelOf(unitLabels, baseUnit)}`;
}
