import { IconPackageExport, IconPackageImport, type Icon } from '@tabler/icons-react';
import { CallApiError } from '@credo/connectors/connector';
import { ROUTES } from '@/constants/routes';
import { appConfig } from '@/config';
import { perms } from '@/utils/permission';
import { warehouseDocBundles, type WarehouseDocEntity } from '@/stores/useWarehouseDocStores';
import type { WarehouseDocLine } from '@/types';

type ModulePerms = {
  canView: () => boolean;
  canCreate: () => boolean;
  canEdit: () => boolean;
  canDelete: () => boolean;
};
type Routes = { LIST: string; NEW: string; DETAIL: string; EDIT: string };

export type WarehouseDocKind = {
  entity: WarehouseDocEntity;
  routes: Routes;

  i18nPrefix: 'warehouseReceipt' | 'warehouseDeliveryNote';
  perms: ModulePerms;

  code: () => { codePrefix: string; codePadLength: number };

  direction: 'in' | 'out';

  postInventoryEnabled: () => boolean;
  icon: Icon;
};

export const WAREHOUSE_RECEIPT_KIND: WarehouseDocKind = {
  entity: 'warehouse-receipts',
  routes: ROUTES.WAREHOUSE_RECEIPTS,
  i18nPrefix: 'warehouseReceipt',
  perms: perms.warehouseReceipt,
  code: () => appConfig.features.warehouseReceipts,
  direction: 'in',
  postInventoryEnabled: () => appConfig.features.warehouseReceipts.postInventory,
  icon: IconPackageImport,
};

export const WAREHOUSE_DELIVERY_NOTE_KIND: WarehouseDocKind = {
  entity: 'warehouse-delivery-notes',
  routes: ROUTES.WAREHOUSE_DELIVERY_NOTES,
  i18nPrefix: 'warehouseDeliveryNote',
  perms: perms.warehouseDeliveryNote,
  code: () => appConfig.features.warehouseDeliveryNotes,
  direction: 'out',
  postInventoryEnabled: () => appConfig.features.warehouseDeliveryNotes.postInventory,
  icon: IconPackageExport,
};

export function bundleFor(kind: WarehouseDocKind) {
  return warehouseDocBundles[kind.entity];
}

export type UnitTotal = { unit: string; total: number };

export function totalsByUnit(lines: WarehouseDocLine[] | undefined): UnitTotal[] {
  const map = new Map<string, number>();
  for (const l of lines ?? []) {
    const unit = l.unit ?? '';
    map.set(unit, (map.get(unit) ?? 0) + (Number(l.quantity) || 0));
  }
  return [...map.entries()].map(([unit, total]) => ({ unit, total }));
}

export function formatUnitTotals(
  totals: UnitTotal[],
  labelOf: (unit: string) => string = (u) => u,
): string {
  if (totals.length === 0) return '0';
  return totals
    .map(({ unit, total }) =>
      unit ? `${total.toLocaleString()} ${labelOf(unit)}` : total.toLocaleString(),
    )
    .join(' · ');
}

export function buildDocCode(
  kind: WarehouseDocKind,
  recordDate: string,
  docsOnDay: number,
): string {
  const { codePrefix, codePadLength } = kind.code();
  const ymd = recordDate.replaceAll('-', '').slice(2);
  const seq = (docsOnDay + 1).toString().padStart(Math.max(0, codePadLength), '0');
  return `${codePrefix}${ymd}-${seq}`;
}

export const MAX_DOC_CODE_RETRIES = 50;

export function isDuplicateDocCodeError(err: unknown): boolean {
  if (!(err instanceof CallApiError) || err.status !== 400) return false;
  const payload = err.payload;
  if (typeof payload !== 'object' || payload === null || !('fields' in payload)) return false;
  const fields = (payload as { fields?: unknown }).fields;
  return typeof fields === 'object' && fields !== null && 'extra.code' in fields;
}
