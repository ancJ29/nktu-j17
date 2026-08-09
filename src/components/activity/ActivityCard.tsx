/**
 * Activity-log card dispatcher — picks a per-verb friendly renderer for an
 * `ActivityLoggerActivityEntity`, falling back to raw JSON for unrecognized
 * verbs. Shared across the per-module activity panels (employees: by-actor;
 * products: by-target). Adding a new friendly card means appending a row to
 * `ENTITY_VERB_CONFIG` plus (for non-entity verbs) a fresh card component +
 * a branch in `ActivityCard`. Keep the `RawActivityCard` fallback last.
 *
 * `showActor` toggles a leading `<EmployeeLink>` prefix on each card — left
 * off when the panel already implies a single actor (employee detail page),
 * turned on for by-target surfaces where each entry can come from a
 * different operator (product detail page).
 */

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Code, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import {
  IconAdjustments,
  IconArrowDown,
  IconArrowRight,
  IconArrowUp,
  IconBan,
  IconBuilding,
  IconBuildingWarehouse,
  IconCategory,
  IconCircleCheck,
  IconClipboardCheck,
  IconBucketDroplet,
  IconEdit,
  IconEyeOff,
  IconFileText,
  IconKey,
  IconLock,
  IconLockOpen,
  IconNote,
  IconNoteOff,
  IconPackage,
  IconPackageImport,
  IconPhoto,
  IconQrcode,
  IconRefresh,
  IconShield,
  IconStack3,
  IconSwitchHorizontal,
  IconTrash,
  IconTruck,
  IconUserPlus,
} from '@tabler/icons-react';
import type { ActivityLoggerActivityEntity } from '@credo/connectors/types';
import { device } from '@credo/base-ui/utils';
import { CustomerLink } from '@/components/CustomerLink';
import { DeliveryRequestLink } from '@/components/DeliveryRequestLink';
import { EmployeeLink } from '@/components/EmployeeLink';
import { MaterialLink } from '@/components/MaterialLink';
import { ProductLink } from '@/components/ProductLink';
import { GoodsReceiptLink } from '@/components/GoodsReceiptLink';
import { SalesOrderLink } from '@/components/SalesOrderLink';
import { TransportOrderLink } from '@/components/TransportOrderLink';
import { TruckLink } from '@/components/TruckLink';
import { WarehouseLink } from '@/components/WarehouseLink';
import { VendorLink } from '@/components/VendorLink';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { useLocationStore } from '@/stores/useLocationStore';
import { useMaterialStore } from '@/stores/useMaterialStore';
import { useProductStore } from '@/stores/useProductStore';
import { useGoodsReceiptStore } from '@/stores/useGoodsReceiptStore';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { useVendorStore } from '@/stores/useVendorStore';
import { isDefaultLocation } from '@/types';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { salesOrderFieldOptions } from '@/pages/sales-orders/useSalesOrderFieldOptions';
import { deliveryRequestStatusOptions } from '@/pages/delivery-requests/useDeliveryRequestStatusOptions';
import { resolveTransportOrderStatus } from '@/pages/transport-orders/transportOrderStatuses';
import type {
  SalesOrderCustomerDiff,
  SalesOrderInlineFields,
  SalesOrderItemDiff,
  SalesOrderMemoItem,
  SalesOrderReleasedRow,
} from '@/pages/sales-orders/activityMemo';
import type {
  DeliveryRequestInlineFields,
  DeliveryRequestItemDiff,
  DeliveryRequestMemoItem,
} from '@/pages/delivery-requests/activityMemo';
import type {
  GoodsReceiptInlineFields,
  GoodsReceiptItemDiff,
  GoodsReceiptMemoItem,
  GoodsReceiptVendorDiff,
} from '@/pages/goods-receipts/activityMemo';
import { findStatus as findGoodsReceiptStatus } from '@/pages/goods-receipts/goodsReceiptStatuses';
import type { GoodsReceiptStatus } from '@/types';
import { isLocationsEnabled } from '@/utils/permission';

const locationsEnabled = isLocationsEnabled();
const isMobile = device.isMobile;

/**
 * The header every activity card shares: an icon, "who did what to which
 * record", and when.
 *
 * **On desktop it is one row** with the timestamp pushed to the far right — an
 * activity list is scanned down the timestamp column, so the column has to exist.
 *
 * **On a phone that row was the bug** (2026-08-09, reported on the truck detail
 * page). Every group was `nowrap` and the one holding the text carried
 * `minWidth: 0`, which licenses flexbox to shrink its children *below their
 * min-content width* — so "Trần Nguyễn Trọng Nghĩa" collapsed to the width of
 * its longest word and broke one word per line, four lines tall. Meanwhile the
 * target chip ("HOWO") could not shrink at all, so it overflowed its slot and
 * printed *on top of* the timestamp: two labels, one set of pixels.
 *
 * Mobile therefore stacks instead of squeezing — the text wraps by phrase in a
 * `wrap` group that never pushes below min-content, and the timestamp takes its
 * own line under it. Nothing is dropped; a phone just spends height, which it
 * has, rather than width, which it doesn't.
 */
function ActivityCardHeader({
  icon,
  createdAt,
  children,
}: {
  readonly icon?: ReactNode;
  readonly createdAt: ActivityLoggerActivityEntity['createdAt'];
  readonly children: ReactNode;
}) {
  const timestamp = (
    <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
      {formatDateTime(createdAt)}
    </Text>
  );

  if (isMobile) {
    return (
      <Group gap="sm" wrap="nowrap" align="flex-start">
        {icon}
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={6} wrap="wrap" align="center">
            {children}
          </Group>
          {timestamp}
        </Stack>
      </Group>
    );
  }

  return (
    <Group gap="sm" wrap="nowrap" align="center" justify="space-between">
      <Group gap="sm" wrap="nowrap" align="center" style={{ minWidth: 0 }}>
        {icon}
        <Group gap={6} wrap="nowrap" align="center" style={{ minWidth: 0 }}>
          {children}
        </Group>
      </Group>
      {timestamp}
    </Group>
  );
}

type Props = {
  readonly entry: ActivityLoggerActivityEntity;
  /** Display name resolved by the panel for raw-fallback card target lines. */
  readonly targetLabel: string | null;
  /** Render the actor as a leading `<EmployeeLink>` (by-target panels). */
  readonly showActor?: boolean;

  readonly isRoot?: boolean;
};

export function ActivityCard({ entry, targetLabel, showActor, isRoot = false }: Props) {
  if (entry.action === 'auth.login') {
    const method = (entry.memo as { method?: unknown } | null)?.method;
    if (method === 'password' || method === 'qr') {
      return <LoginActivityCard entry={entry} method={method} />;
    }
  }
  if (entry.targetId) {
    const cfg = resolveEntityVerbConfig(entry);
    if (cfg) {
      return (
        <EntityActivityCard entry={entry} config={cfg} showActor={showActor} isRoot={isRoot} />
      );
    }
  }

  if (!isRoot) {
    return null;
  }

  return <RawActivityCard entry={entry} targetLabel={targetLabel} showActor={showActor} />;
}

// ── Verb config table ────────────────────────────────────────────────────
//
// One row per recognized `{module}.{verb}` action. The `i18nKey` is the full
// dotted path so a single shared `EntityActivityCard` renders every module —
// adding a module means appending its rows (and a `<XTargetLink>` helper if
// the module has its own detail page).

type SimpleVerbKey = 'create' | 'update' | 'delete' | 'enable' | 'disable';
/** Vendor emits `toggleStatus` (one verb for both directions) + note verbs — see the vendor detail page. */
type VendorVerbKey = 'create' | 'update' | 'delete' | 'toggleStatus' | 'addNote' | 'removeNote';
type CustomerVerbKey = 'create' | 'update' | 'delete' | 'toggleStatus' | 'addNote' | 'removeNote';
type EmployeeVerbKey =
  | SimpleVerbKey
  | 'updatePermissions'
  | 'passwordChange'
  | 'generateLoginToken'
  | 'updateProfileImage';
type ProductVerbKey =
  | SimpleVerbKey
  | 'updateDescription'
  | 'updateTechSpecs'
  | 'updateClassification'
  | 'updateImages'
  | 'toggleInventoryVisibility';
type ProductInventoryVerbKey =
  'create' | 'adjust' | 'stockTake' | 'repack' | 'import' | 'beginOfPeriod';
type MaterialInventoryVerbKey = 'create' | 'adjust' | 'stockTake' | 'repack';
type MaterialVerbKey = SimpleVerbKey | 'updateImages';
type SalesOrderVerbKey =
  | 'create'
  | 'update'
  | 'updateInline'
  | 'statusChange'
  | 'cancel'
  | 'manualRelease'
  | 'reconcileRepair'
  | 'shipRecovery'
  | 'delete';
type DeliveryRequestVerbKey = 'create' | 'update' | 'updateInline' | 'statusChange' | 'delete';
type GoodsReceiptVerbKey =
  'create' | 'update' | 'updateInline' | 'confirmReceived' | 'repostInventory' | 'cancel';

type TransportOrderVerbKey =
  'create' | 'update' | 'updateInline' | 'statusChange' | 'cancel' | 'delete';

type EntityTargetType =
  | 'employee'
  | 'product'
  | 'material'
  | 'customer'
  | 'vendor'
  | 'truck'
  | 'oilTank'
  | 'salesOrder'
  | 'deliveryRequest'
  | 'goodsReceipt'
  | 'transportOrder';
type EntityVerbI18nKey =
  | `employees.detail.activityVerbs.${EmployeeVerbKey}`
  | `products.detail.activityVerbs.${ProductVerbKey}`
  | `products.detail.activityVerbs.inventory.${ProductInventoryVerbKey}`
  | `materials.detail.activityVerbs.${MaterialVerbKey}`
  | `materials.detail.activityVerbs.inventory.${MaterialInventoryVerbKey}`
  | `customers.detail.activityVerbs.${CustomerVerbKey}`
  | `vendors.detail.activityVerbs.${VendorVerbKey}`
  | `assets.truck.detail.activityVerbs.${SimpleVerbKey}`
  | `oilTanks.detail.activityVerbs.${SimpleVerbKey}`
  | `salesOrders.detail.activityVerbs.${SalesOrderVerbKey}`
  | `deliveryRequests.detail.activityVerbs.${DeliveryRequestVerbKey}`
  | `goodsReceipts.detail.activityVerbs.${GoodsReceiptVerbKey}`
  | `transportOrders.detail.activityVerbs.${TransportOrderVerbKey}`;

type EntityVerbConfig = {
  readonly icon: ReactNode;
  readonly color: string;
  readonly i18nKey: EntityVerbI18nKey;
  readonly targetType: EntityTargetType;
  /** Render the diff list under the header (deepDiff() memos). */
  readonly showDiff?: boolean;
  /** Render the inventory memo line under the header (location + delta). */
  readonly showInventoryMemo?: boolean;
  /** Render the SO-specific memo line under the header (status arrow, reservation diff, etc). */
  readonly showSalesOrderMemo?: boolean;
  /** Render the DR-specific memo line under the header. */
  readonly showDeliveryRequestMemo?: boolean;
  /** Render the GR-specific memo line under the header (vendor + items + inventory effect). */
  readonly showGoodsReceiptMemo?: boolean;
  /** Render the TO-specific memo line under the header (route, container, fee/total deltas). */
  readonly showTransportOrderMemo?: boolean;
};

const ENTITY_VERB_CONFIG: Record<string, EntityVerbConfig> = {
  // employee
  'employee.create': {
    icon: <IconUserPlus size={16} />,
    color: 'green',
    i18nKey: 'employees.detail.activityVerbs.create',
    targetType: 'employee',
  },
  'employee.update': {
    icon: <IconEdit size={16} />,
    color: 'blue',
    i18nKey: 'employees.detail.activityVerbs.update',
    targetType: 'employee',
    showDiff: true,
  },
  'employee.updatePermissions': {
    icon: <IconShield size={16} />,
    color: 'violet',
    i18nKey: 'employees.detail.activityVerbs.updatePermissions',
    targetType: 'employee',
    showDiff: true,
  },
  'employee.delete': {
    icon: <IconTrash size={16} />,
    color: 'red',
    i18nKey: 'employees.detail.activityVerbs.delete',
    targetType: 'employee',
  },
  'employee.passwordChange': {
    icon: <IconLock size={16} />,
    color: 'gray',
    i18nKey: 'employees.detail.activityVerbs.passwordChange',
    targetType: 'employee',
  },
  'employee.generateLoginToken': {
    icon: <IconQrcode size={16} />,
    color: 'blue',
    i18nKey: 'employees.detail.activityVerbs.generateLoginToken',
    targetType: 'employee',
  },
  'employee.updateProfileImage': {
    icon: <IconPhoto size={16} />,
    color: 'blue',
    i18nKey: 'employees.detail.activityVerbs.updateProfileImage',
    targetType: 'employee',
    // No diff: image URLs are noisy and the verb itself is the audit signal
    // (matches `product.updateImages`).
  },
  // product
  'product.create': {
    icon: <IconPackage size={16} />,
    color: 'green',
    i18nKey: 'products.detail.activityVerbs.create',
    targetType: 'product',
  },
  'product.update': {
    icon: <IconEdit size={16} />,
    color: 'blue',
    i18nKey: 'products.detail.activityVerbs.update',
    targetType: 'product',
    showDiff: true,
  },
  'product.delete': {
    icon: <IconTrash size={16} />,
    color: 'red',
    i18nKey: 'products.detail.activityVerbs.delete',
    targetType: 'product',
  },
  'product.updateDescription': {
    icon: <IconFileText size={16} />,
    color: 'blue',
    i18nKey: 'products.detail.activityVerbs.updateDescription',
    targetType: 'product',
    showDiff: true,
  },
  'product.updateTechSpecs': {
    icon: <IconAdjustments size={16} />,
    color: 'blue',
    i18nKey: 'products.detail.activityVerbs.updateTechSpecs',
    targetType: 'product',
    showDiff: true,
  },
  'product.updateClassification': {
    icon: <IconCategory size={16} />,
    color: 'blue',
    i18nKey: 'products.detail.activityVerbs.updateClassification',
    targetType: 'product',
    showDiff: true,
  },
  'product.updateImages': {
    icon: <IconPhoto size={16} />,
    color: 'blue',
    i18nKey: 'products.detail.activityVerbs.updateImages',
    targetType: 'product',
    // No diff: image arrays are noisy and the verb itself is the audit signal.
  },
  'product.toggleInventoryVisibility': {
    icon: <IconEyeOff size={16} />,
    color: 'blue',
    i18nKey: 'products.detail.activityVerbs.toggleInventoryVisibility',
    targetType: 'product',
    // Diff carries `extra.hiddenFromInventoryList` on/off — a one-line change
    // the panel renders as-is, and the direction is the whole point of the
    // entry ("who hid this product from the warehouse table, and when").
    showDiff: true,
  },
  // productInventory — all four verbs target the product so the product's
  // Activity tab surfaces inventory writes alongside direct edits. The memo
  // carries `{ locationCode, prevOnHand, nextOnHand, delta, ... }` (or
  // `{ locationCode, onHand }` for create) and renders via `InventoryMemoLine`.
  'productInventory.create': {
    icon: <IconBuildingWarehouse size={16} />,
    color: 'teal',
    i18nKey: 'products.detail.activityVerbs.inventory.create',
    targetType: 'product',
    showInventoryMemo: true,
  },
  'productInventory.adjust': {
    icon: <IconAdjustments size={16} />,
    color: 'teal',
    i18nKey: 'products.detail.activityVerbs.inventory.adjust',
    targetType: 'product',
    showInventoryMemo: true,
  },
  'productInventory.stockTake': {
    icon: <IconStack3 size={16} />,
    color: 'teal',
    i18nKey: 'products.detail.activityVerbs.inventory.stockTake',
    targetType: 'product',
    showInventoryMemo: true,
  },
  'productInventory.repack': {
    icon: <IconSwitchHorizontal size={16} />,
    color: 'teal',
    i18nKey: 'products.detail.activityVerbs.inventory.repack',
    targetType: 'product',
    showInventoryMemo: true,
  },
  // NKTU begin-of-period restate — writes the opening figure + current on-hand
  // together. Memo carries the same `{ locationCode, prevOnHand, nextOnHand,
  // delta, ... }` shape so the InventoryMemoLine renders the stock change.
  'productInventory.beginOfPeriod': {
    icon: <IconBuildingWarehouse size={16} />,
    color: 'teal',
    i18nKey: 'products.detail.activityVerbs.inventory.beginOfPeriod',
    targetType: 'product',
    showInventoryMemo: true,
  },
  // Bulk Excel upsert-import — one entry per upserted row (memo `{ locationCode,
  // onHand }`, create-shape) so the InventoryMemoLine renders the final stock.
  'productInventory.import': {
    icon: <IconPackageImport size={16} />,
    color: 'teal',
    i18nKey: 'products.detail.activityVerbs.inventory.import',
    targetType: 'product',
    showInventoryMemo: true,
  },
  // materialInventory — mirrors productInventory: every verb targets the
  // material so the material's Activity tab surfaces inventory writes
  // alongside future material edits.
  'material.create': {
    icon: <IconPackage size={16} />,
    color: 'green',
    i18nKey: 'materials.detail.activityVerbs.create',
    targetType: 'material',
  },
  'material.update': {
    icon: <IconEdit size={16} />,
    color: 'blue',
    i18nKey: 'materials.detail.activityVerbs.update',
    targetType: 'material',
    showDiff: true,
  },
  'material.delete': {
    icon: <IconTrash size={16} />,
    color: 'red',
    i18nKey: 'materials.detail.activityVerbs.delete',
    targetType: 'material',
  },
  'material.enable': {
    icon: <IconLockOpen size={16} />,
    color: 'teal',
    i18nKey: 'materials.detail.activityVerbs.enable',
    targetType: 'material',
  },
  'material.disable': {
    icon: <IconLock size={16} />,
    color: 'orange',
    i18nKey: 'materials.detail.activityVerbs.disable',
    targetType: 'material',
  },
  'material.updateImages': {
    icon: <IconPhoto size={16} />,
    color: 'blue',
    i18nKey: 'materials.detail.activityVerbs.updateImages',
    targetType: 'material',
  },
  'materialInventory.create': {
    icon: <IconBuildingWarehouse size={16} />,
    color: 'teal',
    i18nKey: 'materials.detail.activityVerbs.inventory.create',
    targetType: 'material',
    showInventoryMemo: true,
  },
  'materialInventory.adjust': {
    icon: <IconAdjustments size={16} />,
    color: 'teal',
    i18nKey: 'materials.detail.activityVerbs.inventory.adjust',
    targetType: 'material',
    showInventoryMemo: true,
  },
  'materialInventory.stockTake': {
    icon: <IconStack3 size={16} />,
    color: 'teal',
    i18nKey: 'materials.detail.activityVerbs.inventory.stockTake',
    targetType: 'material',
    showInventoryMemo: true,
  },
  'materialInventory.repack': {
    icon: <IconSwitchHorizontal size={16} />,
    color: 'teal',
    i18nKey: 'materials.detail.activityVerbs.inventory.repack',
    targetType: 'material',
    showInventoryMemo: true,
  },
  // customer
  'customer.create': {
    icon: <IconBuilding size={16} />,
    color: 'green',
    i18nKey: 'customers.detail.activityVerbs.create',
    targetType: 'customer',
  },
  'customer.update': {
    icon: <IconEdit size={16} />,
    color: 'blue',
    i18nKey: 'customers.detail.activityVerbs.update',
    targetType: 'customer',
    showDiff: true,
  },
  'customer.delete': {
    icon: <IconTrash size={16} />,
    color: 'red',
    i18nKey: 'customers.detail.activityVerbs.delete',
    targetType: 'customer',
  },
  'customer.toggleStatus': {
    icon: <IconSwitchHorizontal size={16} />,
    color: 'orange',
    i18nKey: 'customers.detail.activityVerbs.toggleStatus',
    targetType: 'customer',
    showDiff: true,
  },
  'customer.addNote': {
    icon: <IconNote size={16} />,
    color: 'blue',
    i18nKey: 'customers.detail.activityVerbs.addNote',
    targetType: 'customer',
  },
  'customer.removeNote': {
    icon: <IconNoteOff size={16} />,
    color: 'gray',
    i18nKey: 'customers.detail.activityVerbs.removeNote',
    targetType: 'customer',
  },
  // vendor
  'vendor.create': {
    icon: <IconBuildingWarehouse size={16} />,
    color: 'green',
    i18nKey: 'vendors.detail.activityVerbs.create',
    targetType: 'vendor',
  },
  'vendor.update': {
    icon: <IconEdit size={16} />,
    color: 'blue',
    i18nKey: 'vendors.detail.activityVerbs.update',
    targetType: 'vendor',
    showDiff: true,
  },
  'vendor.delete': {
    icon: <IconTrash size={16} />,
    color: 'red',
    i18nKey: 'vendors.detail.activityVerbs.delete',
    targetType: 'vendor',
  },
  'vendor.toggleStatus': {
    icon: <IconSwitchHorizontal size={16} />,
    color: 'orange',
    i18nKey: 'vendors.detail.activityVerbs.toggleStatus',
    targetType: 'vendor',
    showDiff: true,
  },
  'vendor.addNote': {
    icon: <IconNote size={16} />,
    color: 'blue',
    i18nKey: 'vendors.detail.activityVerbs.addNote',
    targetType: 'vendor',
  },
  'vendor.removeNote': {
    icon: <IconNoteOff size={16} />,
    color: 'gray',
    i18nKey: 'vendors.detail.activityVerbs.removeNote',
    targetType: 'vendor',
  },
  // truck — the fleet register (client-gated). Its operation logs (refuel /
  // maintenance / trip) are NOT activity-logged: they're a domain register of
  // their own, already visible on the truck detail.
  'truck.create': {
    icon: <IconTruck size={16} />,
    color: 'green',
    i18nKey: 'assets.truck.detail.activityVerbs.create',
    targetType: 'truck',
  },
  'truck.update': {
    icon: <IconEdit size={16} />,
    color: 'blue',
    i18nKey: 'assets.truck.detail.activityVerbs.update',
    targetType: 'truck',
    showDiff: true,
  },
  'truck.delete': {
    icon: <IconTrash size={16} />,
    color: 'red',
    i18nKey: 'assets.truck.detail.activityVerbs.delete',
    targetType: 'truck',
  },
  // oil-tank — the fuel register (client-gated). Like trucks, its movement
  // logs (refill / issue) are NOT activity-logged: they are a domain register
  // of their own, already visible on the tank detail.
  'oilTank.create': {
    icon: <IconBucketDroplet size={16} />,
    color: 'green',
    i18nKey: 'oilTanks.detail.activityVerbs.create',
    targetType: 'oilTank',
  },
  'oilTank.update': {
    icon: <IconEdit size={16} />,
    color: 'blue',
    i18nKey: 'oilTanks.detail.activityVerbs.update',
    targetType: 'oilTank',
    showDiff: true,
  },
  'oilTank.delete': {
    icon: <IconTrash size={16} />,
    color: 'red',
    i18nKey: 'oilTanks.detail.activityVerbs.delete',
    targetType: 'oilTank',
  },
  // sales-order — module-specific memo shapes (not deepDiff) per the
  // transactional convention in `docs/memo/activity-logging.md`. The
  // memo line under the header is rendered by `SalesOrderMemoLine`.
  //
  // `salesOrder.update` is intentionally absent from this static table —
  // the inline-edit and form-edit paths share the verb but want
  // different wording (`updateInline` vs `update`), so the resolver
  // picks the right config based on `memo.inlineEdit`.
  'salesOrder.create': {
    icon: <IconFileText size={16} />,
    color: 'green',
    i18nKey: 'salesOrders.detail.activityVerbs.create',
    targetType: 'salesOrder',
    showSalesOrderMemo: true,
  },
  'salesOrder.statusChange': {
    icon: <IconArrowRight size={16} />,
    color: 'blue',
    i18nKey: 'salesOrders.detail.activityVerbs.statusChange',
    targetType: 'salesOrder',
    showSalesOrderMemo: true,
  },
  'salesOrder.cancel': {
    icon: <IconBan size={16} />,
    color: 'red',
    i18nKey: 'salesOrders.detail.activityVerbs.cancel',
    targetType: 'salesOrder',
    showSalesOrderMemo: true,
  },
  'salesOrder.manualRelease': {
    icon: <IconPackageImport size={16} />,
    color: 'teal',
    i18nKey: 'salesOrders.detail.activityVerbs.manualRelease',
    targetType: 'salesOrder',
    showSalesOrderMemo: true,
  },
  // System-driven repairs. Both were emitted long before they were rendered —
  // `reconcileRepair` since 2026-07-23, `shipRecovery` since 2026-07-29 — which
  // made them root-only `RawActivityCard` entries, i.e. invisible to the very
  // operators whose stock they moved.
  'salesOrder.reconcileRepair': {
    icon: <IconRefresh size={16} />,
    color: 'orange',
    i18nKey: 'salesOrders.detail.activityVerbs.reconcileRepair',
    targetType: 'salesOrder',
  },
  'salesOrder.shipRecovery': {
    icon: <IconRefresh size={16} />,
    color: 'teal',
    i18nKey: 'salesOrders.detail.activityVerbs.shipRecovery',
    targetType: 'salesOrder',
  },
  'salesOrder.delete': {
    icon: <IconTrash size={16} />,
    color: 'red',
    i18nKey: 'salesOrders.detail.activityVerbs.delete',
    targetType: 'salesOrder',
  },
  // delivery-request — mirrors the SO transactional convention but with no
  // inventory side-effects: no `cancel` / `manualRelease`, and the
  // `statusChange` memo carries from/to status without `inventoryAction`.
  // `deliveryRequest.update` is intentionally absent here — like SO, the form
  // vs inline distinction is resolved at runtime via `resolveEntityVerbConfig`.
  'deliveryRequest.create': {
    icon: <IconFileText size={16} />,
    color: 'green',
    i18nKey: 'deliveryRequests.detail.activityVerbs.create',
    targetType: 'deliveryRequest',
    showDeliveryRequestMemo: true,
  },
  'deliveryRequest.statusChange': {
    icon: <IconArrowRight size={16} />,
    color: 'blue',
    i18nKey: 'deliveryRequests.detail.activityVerbs.statusChange',
    targetType: 'deliveryRequest',
    showDeliveryRequestMemo: true,
  },
  'deliveryRequest.delete': {
    icon: <IconTrash size={16} />,
    color: 'red',
    i18nKey: 'deliveryRequests.detail.activityVerbs.delete',
    targetType: 'deliveryRequest',
  },
  // goods-receipt — module-specific memo shapes (not deepDiff). GR has no
  // inventory reservation lifecycle, so the verb set is `create` / `update`
  // (form) / `update` (inline, mobile quantity-edit) / `confirmReceived` /
  // `cancel`. `goodsReceipt.update` is resolved at runtime via
  // `resolveEntityVerbConfig` because the form-edit and inline-edit branches
  // share the verb but want different wording.
  'goodsReceipt.create': {
    icon: <IconFileText size={16} />,
    color: 'green',
    i18nKey: 'goodsReceipts.detail.activityVerbs.create',
    targetType: 'goodsReceipt',
    showGoodsReceiptMemo: true,
  },
  'goodsReceipt.confirmReceived': {
    icon: <IconClipboardCheck size={16} />,
    color: 'teal',
    i18nKey: 'goodsReceipts.detail.activityVerbs.confirmReceived',
    targetType: 'goodsReceipt',
    showGoodsReceiptMemo: true,
  },
  'goodsReceipt.cancel': {
    icon: <IconBan size={16} />,
    color: 'red',
    i18nKey: 'goodsReceipts.detail.activityVerbs.cancel',
    targetType: 'goodsReceipt',
    showGoodsReceiptMemo: true,
  },
  // Operator re-ran the confirm's inventory effect to post lines that never
  // landed the first time (best-effort loop died mid-flight). Distinct verb —
  // an audit reader must be able to tell a repair from the original confirm.
  'goodsReceipt.repostInventory': {
    icon: <IconClipboardCheck size={16} />,
    color: 'orange',
    i18nKey: 'goodsReceipts.detail.activityVerbs.repostInventory',
    targetType: 'goodsReceipt',
    showGoodsReceiptMemo: true,
  },

  // Transport orders. No inventory and no line items, so the memo is a bounded
  // field diff rather than an item diff. `transportOrder.update` is resolved at
  // runtime (form vs inline) — same split as SO / DR / GR.
  'transportOrder.create': {
    icon: <IconFileText size={16} />,
    color: 'green',
    i18nKey: 'transportOrders.detail.activityVerbs.create',
    targetType: 'transportOrder',
    showTransportOrderMemo: true,
  },
  'transportOrder.statusChange': {
    icon: <IconArrowRight size={16} />,
    color: 'indigo',
    i18nKey: 'transportOrders.detail.activityVerbs.statusChange',
    targetType: 'transportOrder',
    showTransportOrderMemo: true,
  },
  'transportOrder.cancel': {
    icon: <IconBan size={16} />,
    color: 'red',
    i18nKey: 'transportOrders.detail.activityVerbs.cancel',
    targetType: 'transportOrder',
    showTransportOrderMemo: true,
  },
  'transportOrder.delete': {
    icon: <IconTrash size={16} />,
    color: 'red',
    i18nKey: 'transportOrders.detail.activityVerbs.delete',
    targetType: 'transportOrder',
    showTransportOrderMemo: true,
  },
};

// `salesOrder.update` resolves at runtime based on memo shape — the form-edit
// path carries `lineCount` + possibly `reservationDiff`; the inline-edit path
// carries `inlineEdit: true` + `editedKeys`. Different verbs, same handler.
const SALES_ORDER_UPDATE_FORM: EntityVerbConfig = {
  icon: <IconEdit size={16} />,
  color: 'blue',
  i18nKey: 'salesOrders.detail.activityVerbs.update',
  targetType: 'salesOrder',
  showSalesOrderMemo: true,
};
const SALES_ORDER_UPDATE_INLINE: EntityVerbConfig = {
  icon: <IconCircleCheck size={16} />,
  color: 'gray',
  i18nKey: 'salesOrders.detail.activityVerbs.updateInline',
  targetType: 'salesOrder',
  showSalesOrderMemo: true,
};

// `deliveryRequest.update` mirrors the SO runtime split — form-edit vs
// inline-edit resolve to different configs based on `memo.inlineEdit`.
const DELIVERY_REQUEST_UPDATE_FORM: EntityVerbConfig = {
  icon: <IconEdit size={16} />,
  color: 'blue',
  i18nKey: 'deliveryRequests.detail.activityVerbs.update',
  targetType: 'deliveryRequest',
  showDeliveryRequestMemo: true,
};
const DELIVERY_REQUEST_UPDATE_INLINE: EntityVerbConfig = {
  icon: <IconCircleCheck size={16} />,
  color: 'gray',
  i18nKey: 'deliveryRequests.detail.activityVerbs.updateInline',
  targetType: 'deliveryRequest',
  showDeliveryRequestMemo: true,
};

// `goodsReceipt.update` — same form-vs-inline split. The inline branch is
// the mobile per-item quantity-correct drawer (NOT a detail-page meta edit,
// since GR has no inline meta fields today).
const GOODS_RECEIPT_UPDATE_FORM: EntityVerbConfig = {
  icon: <IconEdit size={16} />,
  color: 'blue',
  i18nKey: 'goodsReceipts.detail.activityVerbs.update',
  targetType: 'goodsReceipt',
  showGoodsReceiptMemo: true,
};
const GOODS_RECEIPT_UPDATE_INLINE: EntityVerbConfig = {
  icon: <IconCircleCheck size={16} />,
  color: 'gray',
  i18nKey: 'goodsReceipts.detail.activityVerbs.updateInline',
  targetType: 'goodsReceipt',
  showGoodsReceiptMemo: true,
};

// `transportOrder.update` — same form-vs-inline split. The inline branch is the
// detail-page meta edit (truck / driver / B/L / container / route / notes); both
// carry the SAME `fields` memo shape (they share `diffTransportOrder`), so only
// the wording + card weight differ.
const TRANSPORT_ORDER_UPDATE_FORM: EntityVerbConfig = {
  icon: <IconEdit size={16} />,
  color: 'blue',
  i18nKey: 'transportOrders.detail.activityVerbs.update',
  targetType: 'transportOrder',
  showTransportOrderMemo: true,
};
const TRANSPORT_ORDER_UPDATE_INLINE: EntityVerbConfig = {
  icon: <IconCircleCheck size={16} />,
  color: 'gray',
  i18nKey: 'transportOrders.detail.activityVerbs.updateInline',
  targetType: 'transportOrder',
  showTransportOrderMemo: true,
};

// `toggleStatus` is resolved separately because the verb wording depends on
// `memo.isActive.to` — Enabled vs Disabled. Module prefix → target type.
const TOGGLE_TARGET_BY_MODULE: Record<string, EntityTargetType> = {
  employee: 'employee',
  product: 'product',
  customer: 'customer',
  vendor: 'vendor',
  truck: 'truck',
  oilTank: 'oilTank',
};

function resolveEntityVerbConfig(entry: ActivityLoggerActivityEntity): EntityVerbConfig | null {
  if (entry.action.endsWith('.toggleStatus')) {
    const module = entry.action.slice(0, -'.toggleStatus'.length);
    const targetType = TOGGLE_TARGET_BY_MODULE[module];
    if (!targetType) return null;
    const isActive = (entry.memo as { isActive?: { to?: unknown } } | null)?.isActive?.to;
    if (isActive === true) {
      return {
        icon: <IconLockOpen size={16} />,
        color: 'green',
        i18nKey: `${moduleI18nNamespace(targetType)}.activityVerbs.enable` as EntityVerbI18nKey,
        targetType,
      };
    }
    if (isActive === false) {
      return {
        icon: <IconLock size={16} />,
        color: 'orange',
        i18nKey: `${moduleI18nNamespace(targetType)}.activityVerbs.disable` as EntityVerbI18nKey,
        targetType,
      };
    }
    return null;
  }
  if (entry.action === 'transportOrder.update') {
    const inlineEdit = (entry.memo as { inlineEdit?: unknown } | null)?.inlineEdit === true;
    return inlineEdit ? TRANSPORT_ORDER_UPDATE_INLINE : TRANSPORT_ORDER_UPDATE_FORM;
  }
  if (entry.action === 'salesOrder.update') {
    // Inline meta-edits (assignedStaff, deliveryMethod, notes, …) ride the
    // same verb as form-page saves but want a softer card.
    const inlineEdit = (entry.memo as { inlineEdit?: unknown } | null)?.inlineEdit === true;
    return inlineEdit ? SALES_ORDER_UPDATE_INLINE : SALES_ORDER_UPDATE_FORM;
  }
  if (entry.action === 'deliveryRequest.update') {
    const inlineEdit = (entry.memo as { inlineEdit?: unknown } | null)?.inlineEdit === true;
    return inlineEdit ? DELIVERY_REQUEST_UPDATE_INLINE : DELIVERY_REQUEST_UPDATE_FORM;
  }
  if (entry.action === 'goodsReceipt.update') {
    // Mobile quantity-edit drawer rides the same verb as form-page saves but
    // wants a softer card.
    const inlineEdit = (entry.memo as { inlineEdit?: unknown } | null)?.inlineEdit === true;
    return inlineEdit ? GOODS_RECEIPT_UPDATE_INLINE : GOODS_RECEIPT_UPDATE_FORM;
  }
  return ENTITY_VERB_CONFIG[entry.action] ?? null;
}

function moduleI18nNamespace(type: EntityTargetType): string {
  switch (type) {
    case 'employee':
      return 'employees.detail';
    case 'product':
      return 'products.detail';
    case 'material':
      return 'materials.detail';
    case 'customer':
      return 'customers.detail';
    case 'vendor':
      return 'vendors.detail';
    case 'truck':
      return 'assets.truck.detail';
    case 'oilTank':
      return 'oilTanks.detail';
    case 'salesOrder':
      return 'salesOrders.detail';
    case 'deliveryRequest':
      return 'deliveryRequests.detail';
    case 'goodsReceipt':
      return 'goodsReceipts.detail';
    case 'transportOrder':
      return 'transportOrders.detail';
  }
}

// ── Entity card ──────────────────────────────────────────────────────────

function EntityActivityCard({
  entry,
  config,
  showActor,
  isRoot = false,
}: {
  readonly entry: ActivityLoggerActivityEntity;
  readonly config: EntityVerbConfig;
  readonly showActor?: boolean;
  readonly isRoot?: boolean;
}) {
  const { t } = useTranslation();
  const memo = entry.memo as Record<string, unknown> | null;
  const hasDiff = config.showDiff && memo && Object.keys(memo).length > 0;
  // Snapshot the display number from the memo so the target chip still
  // resolves on by-actor surfaces (e.g. the employee detail page) where the
  // target module's store isn't hydrated. Mirrors how `InventorySourceContent`
  // reads `source.label` rather than depending on the SO / GR store.
  const targetLabelFromMemo = pickTargetLabelFromMemo(config.targetType, memo);
  return (
    <Card withBorder radius="md" padding="sm">
      <Stack gap={6}>
        <ActivityCardHeader
          createdAt={entry.createdAt}
          icon={
            <ThemeIcon size="md" radius="md" variant="light" color={config.color}>
              {config.icon}
            </ThemeIcon>
          }
        >
          {showActor && entry.actorId && <EmployeeLink id={entry.actorId} size="sm" />}
          <Text size="sm" fw={500}>
            {t(config.i18nKey)}
          </Text>
          <EntityTargetLink
            type={config.targetType}
            id={entry.targetId}
            fallbackLabel={targetLabelFromMemo}
          />
        </ActivityCardHeader>
        {isRoot && hasDiff && <DiffList memo={memo as Record<string, FieldDiff>} />}
        {config.showInventoryMemo && memo && <InventoryMemoLine memo={memo as InventoryMemo} />}
        {config.showSalesOrderMemo && memo && (
          <SalesOrderMemoLine action={entry.action} memo={memo as SalesOrderMemo} />
        )}
        {config.showDeliveryRequestMemo && memo && (
          <DeliveryRequestMemoLine action={entry.action} memo={memo as DeliveryRequestMemo} />
        )}
        {config.showGoodsReceiptMemo && memo && (
          <GoodsReceiptMemoLine action={entry.action} memo={memo as GoodsReceiptMemo} />
        )}
        {config.showTransportOrderMemo && memo && (
          <TransportOrderMemoLine action={entry.action} memo={memo as TransportOrderMemo} />
        )}
      </Stack>
    </Card>
  );
}

// ── Target links per module ──────────────────────────────────────────────
//
// Activity entries persist IDs; existing module Link components (except
// EmployeeLink's legacy `id` prop) accept `code`, so each helper resolves
// id → code via the module store before forwarding.

function EntityTargetLink({
  type,
  id,
  fallbackLabel,
}: {
  readonly type: EntityTargetType;
  readonly id: string | null;
  /**
   * Memo-snapshot display value for the target — used when the target
   * module's store isn't hydrated (e.g. an SO / DR entry rendered on the
   * employee detail page). Only forwarded to link types that accept a
   * fallback; master-data links (products / customers / …) keep relying on
   * their store + the universal dimmed-dash fallback.
   */
  readonly fallbackLabel?: string | null;
}) {
  if (!id) return null;
  switch (type) {
    case 'employee':
      return <EmployeeLink id={id} size="sm" />;
    case 'product':
      return <ProductTargetLink id={id} />;
    case 'material':
      return <MaterialTargetLink id={id} />;
    case 'customer':
      return <CustomerTargetLink id={id} />;
    case 'vendor':
      return <VendorTargetLink id={id} />;
    case 'truck':
      // `TruckLink` already resolves id → name off the truck store and degrades
      // to plain text when the module is off / unreadable for this user.
      return <TruckLink id={id} size="sm" />;
    case 'salesOrder':
      return <SalesOrderTargetLink id={id} fallbackLabel={fallbackLabel} />;
    case 'deliveryRequest':
      return <DeliveryRequestTargetLink id={id} fallbackLabel={fallbackLabel} />;
    case 'goodsReceipt':
      return <GoodsReceiptTargetLink id={id} fallbackLabel={fallbackLabel} />;
    case 'transportOrder':
      return <TransportOrderLink id={id} fallbackLabel={fallbackLabel} size="sm" />;
  }
}

/**
 * Read the display number for a transactional target out of the memo. Returns
 * `null` for module types whose target detail isn't carried in the memo (the
 * master-data target links already cover those via their own stores).
 */
function pickTargetLabelFromMemo(
  type: EntityTargetType,
  memo: Record<string, unknown> | null,
): string | null {
  if (!memo) return null;
  switch (type) {
    case 'salesOrder': {
      const v = (memo as { orderNumber?: unknown }).orderNumber;
      return typeof v === 'string' && v.length > 0 ? v : null;
    }
    case 'deliveryRequest': {
      const v = (memo as { requestNumber?: unknown }).requestNumber;
      return typeof v === 'string' && v.length > 0 ? v : null;
    }
    case 'goodsReceipt': {
      const v = (memo as { receiptNumber?: unknown }).receiptNumber;
      return typeof v === 'string' && v.length > 0 ? v : null;
    }
    case 'transportOrder': {
      const v = (memo as { orderNumber?: unknown }).orderNumber;
      return typeof v === 'string' && v.length > 0 ? v : null;
    }
    default:
      return null;
  }
}

function ProductTargetLink({ id }: { readonly id: string }) {
  const product = useProductStore((s) => s.getById(id));
  if (!product) return <Text size="sm">-</Text>;
  return <ProductLink code={product.code} size="sm" />;
}

function MaterialTargetLink({ id }: { readonly id: string }) {
  const material = useMaterialStore((s) => s.getById(id));
  if (!material) return <Text size="sm">-</Text>;
  return <MaterialLink code={material.code} size="sm" />;
}

function CustomerTargetLink({ id }: { readonly id: string }) {
  const customer = useCustomerStore((s) => s.getById(id));
  if (!customer) return <Text size="sm">-</Text>;
  return <CustomerLink code={customer.code} size="sm" />;
}

function VendorTargetLink({ id }: { readonly id: string }) {
  const vendor = useVendorStore((s) => s.getById(id));
  if (!vendor) return <Text size="sm">-</Text>;
  return <VendorLink code={vendor.code} size="sm" />;
}

function SalesOrderTargetLink({
  id,
  fallbackLabel,
}: {
  readonly id: string;
  readonly fallbackLabel?: string | null;
}) {
  // Prefer the live SO store (fresh orderNumber + urgency tint); fall back to
  // the memo-snapshot label when the store isn't loaded — by-actor panels
  // (e.g. the employee detail page) don't hydrate the SO store.
  const so = useSalesOrderStore((s) => s.getById(id));
  return (
    <SalesOrderLink id={id} fallbackLabel={so?.orderNumber ?? fallbackLabel ?? null} size="sm" />
  );
}

function DeliveryRequestTargetLink({
  id,
  fallbackLabel,
}: {
  readonly id: string;
  readonly fallbackLabel?: string | null;
}) {
  const dr = useDeliveryRequestStore((s) => s.getById(id));
  return (
    <DeliveryRequestLink
      id={id}
      color="orange"
      fallbackLabel={dr?.requestNumber ?? fallbackLabel ?? null}
      size="sm"
    />
  );
}

function GoodsReceiptTargetLink({
  id,
  fallbackLabel,
}: {
  readonly id: string;
  readonly fallbackLabel?: string | null;
}) {
  // Prefer the live GR store (fresh receiptNumber); fall back to the
  // memo-snapshot label when the store isn't loaded — by-actor panels
  // (e.g. employee detail) don't hydrate the GR store.
  const gr = useGoodsReceiptStore((s) => s.getById(id));
  return (
    <GoodsReceiptLink
      id={id}
      fallbackLabel={gr?.receiptNumber ?? fallbackLabel ?? null}
      size="sm"
    />
  );
}

// ── Diff renderer (entity update memos) ──────────────────────────────────

type FieldDiff = { readonly from?: unknown; readonly to?: unknown };

// Renders a `deepDiff()` memo as one row per leaf path: `<path>: <from> → <to>`.
// Absent `from` / `to` (added / removed keys) render as an em-dash so direction
// stays visible at a glance.
function DiffList({ memo }: { readonly memo: Record<string, FieldDiff> }) {
  return (
    <Stack gap={2} pl={36}>
      {Object.entries(memo).map(([path, change]) => (
        <Group key={path} gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed" ff="monospace">
            {path}
          </Text>
          <Text size="xs" c="dimmed">
            :
          </Text>
          <Text size="xs" c="dimmed">
            {formatDiffValue(change.from)}
          </Text>
          <Text size="xs" c="dimmed">
            →
          </Text>
          <Text size="xs" fw={500}>
            {formatDiffValue(change.to)}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

function formatDiffValue(v: unknown): string {
  if (v === undefined) return '—';
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? '✓' : '✗';
  if (typeof v === 'string') return v === '' ? '""' : v;
  if (typeof v === 'number') return String(v);
  return JSON.stringify(v);
}

// ── Inventory memo renderer (productInventory verbs) ─────────────────────

type InventoryMemo = {
  locationCode?: string;
  onHand?: number;
  prevOnHand?: number;
  nextOnHand?: number;
  delta?: number;
  via?: string;
  setCode?: string;
  /**
   * Set product name snapshot (paired with `setCode`) so the card can render
   * a `ProductLink` label even when the product store isn't hydrated.
   */
  setName?: string;
  /**
   * Optional attribution captured at compose time — the registered customer
   * and one of their open sales orders this compose was performed for. Purely
   * informational; rendered as a customer chip + a clickable sales-order link.
   */
  customerCode?: string;
  customerName?: string;
  salesOrderId?: string;
  salesOrderNumber?: string;
  /**
   * Operator-supplied note (or a synthetic tag like `[repack] X → Y`,
   * `[compose-set] ...`). Mirrors the row's `lastNote` extra field so the
   * audit trail shows the same context an operator entered at write time,
   * without rehydrating the row. **NOT** used for SO / GR cross-emit
   * traces — those write `source` (see below) so the renderer can build a
   * proper Link without depending on the SO / GR store being hydrated.
   * Legacy entries written before 2026-06-03 still use `note: "SO PO-..."`
   * / `note: "GR PNK-..."` and are matched by `InventoryNoteContent`'s
   * regex fallback.
   */
  note?: string;
  /**
   * Movement reason key for a manual material-inventory change (`adjust` /
   * `stockTake`) — one of `receive` | `issue` | `correction` | `damage` |
   * `other`, resolved to a label via `materialInventory.reason.*`. Absent on
   * product-inventory / cross-emit entries.
   */
  reason?: string;
  /**
   * Cross-module source pointer — set by SO / GR inventory writes. Carries
   * the source record's `id` so the renderer can build a `SalesOrderLink`
   * / `GoodsReceiptLink` directly without a store lookup; `label` is the
   * denormalized `orderNumber` / `receiptNumber` (passed as `fallbackLabel`
   * so the link still shows the number when the source store hasn't
   * hydrated). `suffix` distinguishes path variants (`(cancel)` /
   * `(manual release)` / `(edit)`).
   */
  source?: {
    /** `WR` / `WDN` = warehouse receipt / delivery note (A1 inventory posting). */
    kind: 'SO' | 'GR' | 'WR' | 'WDN';
    id: string;
    label: string;
    suffix?: string;
  };
};

/**
 * Renders the location + on-hand change for a `productInventory.*` entry.
 * `create` carries `onHand` (the seed quantity); `adjust` / `stockTake` /
 * `repack` carry `prevOnHand → nextOnHand` plus `delta`. The location name
 * is resolved via `useLocationStore`; the default-location sentinel renders
 * as a localized label instead of the literal code. `via` (compose-set /
 * decompose-set) + `setCode` and the operator note are surfaced as small
 * captions when present so the audit trail keeps the origin context.
 */
function InventoryMemoLine({ memo }: { readonly memo: InventoryMemo }) {
  const { t } = useTranslation();
  const locations = useLocationStore((s) => s.items);

  const locName =
    locationsEnabled && memo.locationCode
      ? isDefaultLocation(memo.locationCode)
        ? t('common.labels.defaultLocation')
        : (locations.find((l) => l.code === memo.locationCode)?.name ?? memo.locationCode)
      : null;

  const hasPrevNext = typeof memo.prevOnHand === 'number' && typeof memo.nextOnHand === 'number';
  const delta = typeof memo.delta === 'number' ? memo.delta : undefined;

  return (
    <Stack gap={2} pl={36}>
      {locName && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('common.labels.location')}:
          </Text>
          <Text size="xs" fw={500}>
            {locName}
          </Text>
        </Group>
      )}
      {hasPrevNext && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('common.labels.onHand')}:
          </Text>
          <Text size="xs" c="dimmed">
            {memo.prevOnHand!.toLocaleString()}
          </Text>
          <Text size="xs" c="dimmed">
            →
          </Text>
          <Text size="xs" fw={500}>
            {memo.nextOnHand!.toLocaleString()}
          </Text>
          {typeof delta === 'number' && delta !== 0 && (
            <Group gap={2} wrap="nowrap" align="baseline">
              {delta > 0 ? (
                <IconArrowUp size={12} color="var(--mantine-color-teal-6)" />
              ) : (
                <IconArrowDown size={12} color="var(--mantine-color-orange-6)" />
              )}
              <Text size="xs" fw={600} c={delta > 0 ? 'teal' : 'orange'}>
                {delta > 0 ? '+' : ''}
                {delta.toLocaleString()}
              </Text>
            </Group>
          )}
        </Group>
      )}
      {!hasPrevNext && typeof memo.onHand === 'number' && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('common.labels.onHand')}:
          </Text>
          <Text size="xs" fw={500}>
            {memo.onHand.toLocaleString()}
          </Text>
        </Group>
      )}
      {memo.setCode && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('common.labels.set')}:
          </Text>
          <ProductLink code={memo.setCode} name={memo.setName} size="xs" />
        </Group>
      )}
      {memo.customerName && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('salesOrders.detail.activityMemo.customer')}:
          </Text>
          <CustomerLink code={memo.customerCode} name={memo.customerName} size="xs" />
        </Group>
      )}
      {memo.salesOrderNumber && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('common.labels.salesOrder')}:
          </Text>
          <SalesOrderLink id={memo.salesOrderId} fallbackLabel={memo.salesOrderNumber} size="xs" />
        </Group>
      )}
      {memo.reason && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('materialInventory.form.reasonLabel')}:
          </Text>
          <Text size="xs" fw={500}>
            {t(`materialInventory.reason.${memo.reason}`, { defaultValue: memo.reason })}
          </Text>
        </Group>
      )}
      {/* Set-operation entries (`setCode` present) render the set as a link
          above; their `[compose-set] …` note is redundant, so it's suppressed.
          Cross-emit `source` links and free-text operator notes still show. */}
      {(memo.source || (memo.note && !memo.setCode)) && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('__new__.01-common.labels.note')}:
          </Text>
          {memo.source ? (
            <InventorySourceContent source={memo.source} />
          ) : (
            <InventoryNoteContent note={memo.note!} />
          )}
        </Group>
      )}
    </Stack>
  );
}

// `memo.source` is the structured cross-emit pointer — carries id + label
// directly, no store lookup needed. The Link components show the label via
// `fallbackLabel` even when the source store hasn't hydrated, and the click
// still navigates to the detail page because we already have the id.
function InventorySourceContent({
  source,
}: {
  readonly source: NonNullable<InventoryMemo['source']>;
}) {
  return (
    <Group gap={4} wrap="nowrap" align="baseline">
      {source.kind === 'SO' ? (
        <SalesOrderLink id={source.id} fallbackLabel={source.label} size="xs" />
      ) : source.kind === 'GR' ? (
        <GoodsReceiptLink id={source.id} fallbackLabel={source.label} size="xs" />
      ) : (
        <WarehouseLink
          id={source.id}
          kind={source.kind === 'WR' ? 'receipt' : 'delivery-note'}
          fallbackLabel={source.label}
          size="xs"
        />
      )}
      {source.suffix && (
        <Text size="xs" fs="italic" c="dimmed">
          {source.suffix}
        </Text>
      )}
    </Group>
  );
}

// Legacy fallback. `memo.note` carries either an operator-typed string
// (direct edits from the inventory modal — free text) or a pre-2026-06-03
// SO / GR trace string (`SO <orderNumber>` / `GR <receiptNumber>`). When
// we recognize the trace shape, fall back to store-lookup-by-number to
// build the Link; otherwise render plain italic text.
const LEGACY_TRACE_PATTERN = /^(SO|GR)\s+([A-Z0-9][A-Z0-9-]+)(\s.*)?$/;

function InventoryNoteContent({ note }: { readonly note: string }) {
  const match = note.match(LEGACY_TRACE_PATTERN);
  if (!match) {
    return (
      <Text size="xs" fs="italic">
        {note}
      </Text>
    );
  }
  const [, kind, number, suffix] = match;
  const trimmedSuffix = suffix?.trim();
  return (
    <Group gap={4} wrap="nowrap" align="baseline">
      {kind === 'SO' ? (
        <LegacySalesOrderTraceLink number={number} />
      ) : (
        <LegacyGoodsReceiptTraceLink number={number} />
      )}
      {trimmedSuffix && (
        <Text size="xs" fs="italic" c="dimmed">
          {trimmedSuffix}
        </Text>
      )}
    </Group>
  );
}

function LegacySalesOrderTraceLink({ number }: { readonly number: string }) {
  // Pre-2026-06-03 entries don't carry the SO id — look up by orderNumber.
  // Falls back to monospace plain text when the store hasn't hydrated
  // (no id = no link target). New entries use `memo.source` and avoid
  // this lookup entirely.
  const so = useSalesOrderStore((s) => s.items.find((o) => o.orderNumber === number));
  if (!so) {
    return (
      <Text size="xs" ff="monospace" c="dimmed">
        {number}
      </Text>
    );
  }
  return <SalesOrderLink id={so.id} size="xs" />;
}

function LegacyGoodsReceiptTraceLink({ number }: { readonly number: string }) {
  const gr = useGoodsReceiptStore((s) => s.items.find((g) => g.receiptNumber === number));
  if (!gr) {
    return (
      <Text size="xs" ff="monospace" c="dimmed">
        {number}
      </Text>
    );
  }
  return <GoodsReceiptLink id={gr.id} size="xs" />;
}

// ── Sales-order memo renderer ────────────────────────────────────────────
//
// The five `salesOrder.*` verbs carry module-specific memos (per the
// transactional-module convention in `docs/memo/activity-logging.md` — not
// `deepDiff`). Memos persist codes / ids (productCode, customerCode,
// fromLocationCode, assignedStaff = employee id, status values); this
// renderer resolves each to the live display via its store / config so
// renames in master data don't poison historical audit entries. Empty
// memos fall through to the header verb sentence with no extra body
// (matches `updateImages`).

type SalesOrderMemo = {
  // common
  orderNumber?: string;
  // create — customer-by-code (registered) OR walk-in shape
  customerCode?: string;
  customerName?: string;
  isIndividualCustomer?: boolean;
  // create — items snapshot
  lineCount?: number;
  items?: readonly SalesOrderMemoItem[];
  // statusChange
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  inventoryAction?: 'reserve' | 'ship' | 'release' | 'auto-ship-on-completion';
  autoAdvanceOnCreate?: boolean;
  // cancel
  reason?: string;
  inventoryReleased?: boolean;
  autoReleaseFailed?: boolean;
  // update (form) — item-level + customer + reservation
  itemDiff?: SalesOrderItemDiff;
  customerDiff?: SalesOrderCustomerDiff;
  reservationDiff?: { affectedRows?: number; fullyReleased?: boolean };
  // update (inline) — per-field {from, to}; legacy entries may carry
  // `editedKeys` only (renderer falls back gracefully).
  inlineEdit?: boolean;
  fields?: SalesOrderInlineFields;
  editedKeys?: readonly string[];
  // manualRelease — per-row snapshot. Number = legacy (pre-2026-06-03 shape).
  releasedRows?: readonly SalesOrderReleasedRow[] | number;
};

function SalesOrderMemoLine({
  action,
  memo,
}: {
  readonly action: string;
  readonly memo: SalesOrderMemo;
}) {
  if (action === 'salesOrder.statusChange') return <SalesOrderStatusChangeBody memo={memo} />;
  if (action === 'salesOrder.cancel') return <SalesOrderCancelBody memo={memo} />;
  if (action === 'salesOrder.manualRelease') return <SalesOrderManualReleaseBody memo={memo} />;
  if (action === 'salesOrder.update') {
    return memo.inlineEdit ? (
      <SalesOrderInlineUpdateBody memo={memo} />
    ) : (
      <SalesOrderFormUpdateBody memo={memo} />
    );
  }
  if (action === 'salesOrder.create') return <SalesOrderCreateBody memo={memo} />;
  return null;
}

// ── statusChange ─────────────────────────────────────────────────────────

function SalesOrderStatusChangeBody({ memo }: { readonly memo: SalesOrderMemo }) {
  const { t } = useTranslation();
  const fromLabel = memo.fromStatus ? salesOrderFieldOptions.resolveStatus(memo.fromStatus) : null;
  const toLabel = memo.toStatus ? salesOrderFieldOptions.resolveStatus(memo.toStatus) : null;
  return (
    <Stack gap={2} pl={36}>
      {fromLabel && toLabel && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <StatusChip status={fromLabel} />
          <Text size="xs" c="dimmed">
            →
          </Text>
          <StatusChip status={toLabel} />
        </Group>
      )}
      {memo.autoAdvanceOnCreate && (
        <Text size="xs" c="dimmed" fs="italic">
          {t('salesOrders.detail.activityMemo.autoAdvanceOnCreate')}
        </Text>
      )}
      {memo.inventoryAction && (
        <Text size="xs" c="dimmed">
          {t(
            `salesOrders.detail.activityMemo.inventoryAction.${memo.inventoryAction === 'auto-ship-on-completion' ? 'autoShipOnCompletion' : memo.inventoryAction}` as const,
          )}
        </Text>
      )}
      {memo.note && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('__new__.01-common.labels.note')}:
          </Text>
          <Text size="xs" fs="italic">
            {memo.note}
          </Text>
        </Group>
      )}
    </Stack>
  );
}

function StatusChip({ status }: { readonly status: { label: string; color: string } }) {
  return (
    <Text size="xs" fw={500} c={status.color}>
      {status.label}
    </Text>
  );
}

// ── cancel ───────────────────────────────────────────────────────────────

function SalesOrderCancelBody({ memo }: { readonly memo: SalesOrderMemo }) {
  const { t } = useTranslation();
  const fromLabel = memo.fromStatus ? salesOrderFieldOptions.resolveStatus(memo.fromStatus) : null;
  return (
    <Stack gap={2} pl={36}>
      {fromLabel && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('salesOrders.detail.activityMemo.cancelledFrom')}:
          </Text>
          <StatusChip status={fromLabel} />
        </Group>
      )}
      {memo.reason && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('salesOrders.detail.activityMemo.reason')}:
          </Text>
          <Text size="xs" fs="italic">
            {memo.reason}
          </Text>
        </Group>
      )}
      {memo.autoReleaseFailed ? (
        <Text size="xs" c="orange">
          {t('salesOrders.detail.activityMemo.autoReleaseFailed')}
        </Text>
      ) : memo.inventoryReleased ? (
        <Text size="xs" c="teal">
          {t('salesOrders.detail.activityMemo.reservationReleased')}
        </Text>
      ) : (
        <Text size="xs" c="dimmed" fs="italic">
          {t('salesOrders.detail.activityMemo.reservationUnchanged')}
        </Text>
      )}
    </Stack>
  );
}

// ── manualRelease ────────────────────────────────────────────────────────

function SalesOrderManualReleaseBody({ memo }: { readonly memo: SalesOrderMemo }) {
  const { t } = useTranslation();
  // Legacy shape (pre-refactor): `releasedRows` was a count. New shape is
  // an array of per-row snapshots. Either way, suppress the body if no
  // rows actually moved.
  if (typeof memo.releasedRows === 'number') {
    if (memo.releasedRows === 0) return null;
    return (
      <Stack gap={2} pl={36}>
        <Text size="xs" c="teal">
          {t('salesOrders.detail.activityMemo.rowsReleased', { count: memo.releasedRows })}
        </Text>
      </Stack>
    );
  }
  const rows = memo.releasedRows ?? [];
  if (rows.length === 0) return null;
  return (
    <Stack gap={4} pl={36}>
      <Text size="xs" c="teal">
        {t('salesOrders.detail.activityMemo.rowsReleased', { count: rows.length })}
      </Text>
      <Stack gap={2}>
        {rows.map((row, idx) => (
          <Group
            key={`${row.productCode}-${row.locationCode}-${idx}`}
            gap={6}
            wrap="nowrap"
            align="baseline"
          >
            <Text size="xs" c="dimmed">
              ·
            </Text>
            <ProductLink code={row.productCode} size="xs" />
            <LocationTag code={row.locationCode} />
            <ByUnitChip byUnit={row.byUnit} />
          </Group>
        ))}
      </Stack>
    </Stack>
  );
}

// ── create ───────────────────────────────────────────────────────────────

function SalesOrderCreateBody({ memo }: { readonly memo: SalesOrderMemo }) {
  const { t } = useTranslation();
  const hasItems = Array.isArray(memo.items) && memo.items.length > 0;
  const lineCount = typeof memo.lineCount === 'number' ? memo.lineCount : memo.items?.length;
  if (!hasCustomer(memo) && lineCount === undefined && !hasItems) return null;
  return (
    <Stack gap={4} pl={36}>
      {hasCustomer(memo) && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('salesOrders.detail.activityMemo.customer')}:
          </Text>
          <CustomerChip
            code={memo.customerCode}
            name={memo.customerName}
            isIndividual={memo.isIndividualCustomer}
          />
        </Group>
      )}
      {typeof lineCount === 'number' && (
        <Text size="xs" c="dimmed">
          {t('salesOrders.detail.activityMemo.lineCount', { count: lineCount })}
        </Text>
      )}
      {hasItems && <ItemSnapshotList items={memo.items!} />}
    </Stack>
  );
}

function hasCustomer(memo: SalesOrderMemo): boolean {
  return !!memo.customerCode || (!!memo.isIndividualCustomer && !!memo.customerName);
}

// ── update (form) ────────────────────────────────────────────────────────

function SalesOrderFormUpdateBody({ memo }: { readonly memo: SalesOrderMemo }) {
  const { t } = useTranslation();
  const diff = memo.itemDiff;
  const hasItemChanges =
    !!diff && (diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0);
  const hasCustomerChange = !!memo.customerDiff;
  const hasReservation =
    !!memo.reservationDiff &&
    typeof memo.reservationDiff.affectedRows === 'number' &&
    memo.reservationDiff.affectedRows > 0;
  if (
    !hasItemChanges &&
    !hasCustomerChange &&
    !hasReservation &&
    typeof memo.lineCount !== 'number'
  ) {
    return null;
  }
  return (
    <Stack gap={4} pl={36}>
      {hasCustomerChange && <CustomerDiffRow diff={memo.customerDiff!} />}
      {hasItemChanges && <ItemDiffSection diff={diff!} />}
      {!hasItemChanges && typeof memo.lineCount === 'number' && (
        <Text size="xs" c="dimmed">
          {t('salesOrders.detail.activityMemo.lineCount', { count: memo.lineCount })}
        </Text>
      )}
      {hasReservation && (
        <Text size="xs" c="teal">
          {t('salesOrders.detail.activityMemo.reservationDiffRows', {
            count: memo.reservationDiff!.affectedRows,
          })}
          {memo.reservationDiff!.fullyReleased
            ? ` · ${t('salesOrders.detail.activityMemo.fullyReleased')}`
            : ''}
        </Text>
      )}
    </Stack>
  );
}

function CustomerDiffRow({ diff }: { readonly diff: SalesOrderCustomerDiff }) {
  const { t } = useTranslation();
  return (
    <Group gap={6} wrap="nowrap" align="baseline">
      <Text size="xs" c="dimmed">
        {t('salesOrders.detail.activityMemo.customer')}:
      </Text>
      <CustomerChip
        code={diff.from.customerCode}
        name={diff.from.customerName}
        isIndividual={diff.from.isIndividualCustomer}
      />
      <Text size="xs" c="dimmed">
        →
      </Text>
      <CustomerChip
        code={diff.to.customerCode}
        name={diff.to.customerName}
        isIndividual={diff.to.isIndividualCustomer}
      />
    </Group>
  );
}

function ItemDiffSection({ diff }: { readonly diff: SalesOrderItemDiff }) {
  const { t } = useTranslation();
  return (
    <Stack gap={2}>
      {diff.added.length > 0 && (
        <Stack gap={2}>
          <Text size="xs" c="teal" fw={500}>
            {t('salesOrders.detail.activityMemo.itemsAdded', { count: diff.added.length })}
          </Text>
          {diff.added.map((item, idx) => (
            <ItemRow key={`add-${item.productCode}-${idx}`} item={item} tone="teal" />
          ))}
        </Stack>
      )}
      {diff.removed.length > 0 && (
        <Stack gap={2}>
          <Text size="xs" c="red" fw={500}>
            {t('salesOrders.detail.activityMemo.itemsRemoved', { count: diff.removed.length })}
          </Text>
          {diff.removed.map((item, idx) => (
            <ItemRow key={`del-${item.productCode}-${idx}`} item={item} tone="red" />
          ))}
        </Stack>
      )}
      {diff.changed.length > 0 && (
        <Stack gap={2}>
          <Text size="xs" c="blue" fw={500}>
            {t('salesOrders.detail.activityMemo.itemsChanged', { count: diff.changed.length })}
          </Text>
          {diff.changed.map((row, idx) => (
            <ItemChangeRow key={`chg-${row.productCode}-${idx}`} row={row} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// ── update (inline) ──────────────────────────────────────────────────────

function SalesOrderInlineUpdateBody({ memo }: { readonly memo: SalesOrderMemo }) {
  const { t } = useTranslation();
  // New shape: structured per-field diff. Legacy shape carried only
  // `editedKeys` (a list of changed key names) — fall back to that when
  // the structured form is absent.
  if (!memo.fields) {
    if (!memo.editedKeys?.length) return null;
    return (
      <Stack gap={2} pl={36}>
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('salesOrders.detail.activityMemo.editedKeys')}:
          </Text>
          <Text size="xs" ff="monospace">
            {memo.editedKeys.join(', ')}
          </Text>
        </Group>
      </Stack>
    );
  }
  const f = memo.fields;
  if (
    !f.assignedStaff &&
    !f.deliveryMethod &&
    !f.deliveryDate &&
    !f.notes &&
    !f.itemMemo &&
    !f.warehouseNote &&
    !f.driverNote
  )
    return null;
  return (
    <Stack gap={2} pl={36}>
      {f.assignedStaff && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('salesOrders.detail.assignedStaff')}:
          </Text>
          {f.assignedStaff.from ? (
            <EmployeeLink id={f.assignedStaff.from} size="xs" noAvatar />
          ) : (
            <Text size="xs" c="dimmed">
              —
            </Text>
          )}
          <Text size="xs" c="dimmed">
            →
          </Text>
          {f.assignedStaff.to ? (
            <EmployeeLink id={f.assignedStaff.to} size="xs" noAvatar />
          ) : (
            <Text size="xs" c="dimmed">
              —
            </Text>
          )}
        </Group>
      )}
      {f.deliveryMethod && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('salesOrders.detail.deliveryMethod')}:
          </Text>
          <Text size="xs" c="dimmed">
            {f.deliveryMethod.from
              ? salesOrderFieldOptions.resolveDeliveryMethod(f.deliveryMethod.from)
              : '—'}
          </Text>
          <Text size="xs" c="dimmed">
            →
          </Text>
          <Text size="xs" fw={500}>
            {f.deliveryMethod.to
              ? salesOrderFieldOptions.resolveDeliveryMethod(f.deliveryMethod.to)
              : '—'}
          </Text>
        </Group>
      )}
      {f.deliveryDate && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('salesOrders.detail.deliveryDate')}:
          </Text>
          <Text size="xs" c="dimmed">
            {f.deliveryDate.from ? formatDate(f.deliveryDate.from) : '—'}
          </Text>
          <Text size="xs" c="dimmed">
            →
          </Text>
          <Text size="xs" fw={500}>
            {f.deliveryDate.to ? formatDate(f.deliveryDate.to) : '—'}
          </Text>
        </Group>
      )}
      {f.notes?.changed && (
        <Text size="xs" c="dimmed" fs="italic">
          {t('salesOrders.detail.activityMemo.notesChanged')}
        </Text>
      )}
      {f.itemMemo?.changed && (
        <Text size="xs" c="dimmed" fs="italic">
          {t('salesOrders.detail.activityMemo.itemMemoChanged')}
        </Text>
      )}
      {f.warehouseNote?.changed && (
        <Text size="xs" c="dimmed" fs="italic">
          {t('salesOrders.detail.activityMemo.warehouseNoteChanged')}
        </Text>
      )}
      {f.driverNote?.changed && (
        <Text size="xs" c="dimmed" fs="italic">
          {t('salesOrders.detail.activityMemo.driverNoteChanged')}
        </Text>
      )}
    </Stack>
  );
}

// ── Shared item / location / by-unit primitives ──────────────────────────

function ItemSnapshotList({ items }: { readonly items: readonly SalesOrderMemoItem[] }) {
  return (
    <Stack gap={2}>
      {items.map((item, idx) => (
        <ItemRow key={`item-${item.productCode}-${idx}`} item={item} tone="dimmed" />
      ))}
    </Stack>
  );
}

function ItemRow({
  item,
  tone,
}: {
  readonly item: SalesOrderMemoItem;
  readonly tone: 'teal' | 'red' | 'dimmed';
}) {
  const toneColor = tone === 'dimmed' ? 'dimmed' : tone;
  return (
    <Group gap={6} wrap="nowrap" align="baseline">
      <Text size="xs" c={toneColor}>
        ·
      </Text>
      <ProductLink code={item.productCode} size="xs" />
      <Text size="xs" fw={500}>
        {formatQty(item.quantity)}
      </Text>
      <Text size="xs" c="dimmed">
        {item.unit}
      </Text>
      {typeof item.unitPrice === 'number' && item.unitPrice > 0 && (
        <Text size="xs" c="dimmed">
          @ {item.unitPrice.toLocaleString()}
        </Text>
      )}
      {item.fromLocationCode && <LocationTag code={item.fromLocationCode} />}
      {item.role === 'set-component' && item.sourceSetCode && (
        <Text size="xs" c="dimmed" fs="italic">
          ({item.sourceSetCode})
        </Text>
      )}
    </Group>
  );
}

function ItemChangeRow({ row }: { readonly row: SalesOrderItemDiff['changed'][number] }) {
  const { t } = useTranslation();
  return (
    <Stack gap={0}>
      <Group gap={6} wrap="nowrap" align="baseline">
        <Text size="xs" c="dimmed">
          ·
        </Text>
        <ProductLink code={row.productCode} size="xs" />
      </Group>
      <Group gap={8} wrap="wrap" align="baseline" pl={14}>
        {row.from.quantity !== undefined || row.to.quantity !== undefined ? (
          <FieldDelta
            label={t('salesOrders.detail.activityMemo.fieldQuantity')}
            from={formatQty(row.from.quantity)}
            to={formatQty(row.to.quantity)}
          />
        ) : null}
        {row.from.unit !== undefined || row.to.unit !== undefined ? (
          <FieldDelta
            label={t('salesOrders.detail.activityMemo.fieldUnit')}
            from={row.from.unit}
            to={row.to.unit}
          />
        ) : null}
        {row.from.unitPrice !== undefined || row.to.unitPrice !== undefined ? (
          <FieldDelta
            label={t('salesOrders.detail.activityMemo.fieldUnitPrice')}
            from={formatPrice(row.from.unitPrice)}
            to={formatPrice(row.to.unitPrice)}
          />
        ) : null}
        {row.from.fromLocationCode !== undefined || row.to.fromLocationCode !== undefined ? (
          <FieldDelta
            label={t('salesOrders.detail.activityMemo.fieldLocation')}
            from={row.from.fromLocationCode}
            to={row.to.fromLocationCode}
          />
        ) : null}
      </Group>
    </Stack>
  );
}

function FieldDelta({
  label,
  from,
  to,
}: {
  readonly label: string;
  readonly from: string | undefined;
  readonly to: string | undefined;
}) {
  return (
    <Group gap={4} wrap="nowrap" align="baseline">
      <Text size="xs" c="dimmed">
        {label}:
      </Text>
      <Text size="xs" c="dimmed">
        {from || '—'}
      </Text>
      <Text size="xs" c="dimmed">
        →
      </Text>
      <Text size="xs" fw={500}>
        {to || '—'}
      </Text>
    </Group>
  );
}

function CustomerChip({
  code,
  name,
  isIndividual,
}: {
  readonly code?: string;
  readonly name?: string;
  readonly isIndividual?: boolean;
}) {
  // CustomerLink already covers the registered-vs-individual fork — pass
  // `code` for registered customers, `name` for walk-ins. When the link
  // can't resolve to either, render an em-dash (matches the link's own
  // empty state but visible inline).
  if (!code && !name) {
    return (
      <Text size="xs" c="dimmed">
        —
      </Text>
    );
  }
  return <CustomerLink code={code} name={isIndividual ? name : undefined} size="xs" />;
}

function LocationTag({ code }: { readonly code: string | undefined }) {
  const locations = useLocationStore((s) => s.items);
  if (!code) return null;
  const label = locationsEnabled
    ? isDefaultLocation(code)
      ? null
      : (locations.find((l) => l.code === code)?.name ?? code)
    : null;
  if (!label) return null;
  return (
    <Text size="xs" c="dimmed">
      @ {label}
    </Text>
  );
}

function ByUnitChip({ byUnit }: { readonly byUnit: Record<string, number> }) {
  const entries = Object.entries(byUnit).filter(([, q]) => q !== 0);
  if (entries.length === 0) return null;
  return (
    <Text size="xs" fw={500}>
      {entries.map(([u, q]) => `${formatQty(q)} ${u}`).join(', ')}
    </Text>
  );
}

function formatQty(q: number | undefined): string {
  if (typeof q !== 'number') return '';
  return q.toLocaleString();
}

function formatPrice(p: number | undefined): string {
  if (typeof p !== 'number') return '';
  return p.toLocaleString();
}

// ── Delivery-request memo renderer ───────────────────────────────────────
//
// Mirrors `SalesOrderMemoLine` for the DR module. DR has no inventory side-
// effects, so the body components drop the `inventoryAction` /
// `reservationDiff` axes and the `cancel` / `manualRelease` verbs are absent
// entirely. Status resolution uses `deliveryRequestStatusOptions` instead of
// `salesOrderFieldOptions`.

type DeliveryRequestMemo = {
  // common
  requestNumber?: string;
  // create — party + items snapshot
  direction?: 'outbound' | 'inbound';
  salesOrderId?: string;
  salesOrderNumber?: string;
  customerName?: string;
  vendorCode?: string;
  vendorName?: string;
  lineCount?: number;
  items?: readonly DeliveryRequestMemoItem[];
  // statusChange
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  // update (form) — item-level
  itemDiff?: DeliveryRequestItemDiff;
  // update (inline)
  inlineEdit?: boolean;
  fields?: DeliveryRequestInlineFields;
};

function DeliveryRequestMemoLine({
  action,
  memo,
}: {
  readonly action: string;
  readonly memo: DeliveryRequestMemo;
}) {
  if (action === 'deliveryRequest.statusChange')
    return <DeliveryRequestStatusChangeBody memo={memo} />;
  if (action === 'deliveryRequest.update') {
    return memo.inlineEdit ? (
      <DeliveryRequestInlineUpdateBody memo={memo} />
    ) : (
      <DeliveryRequestFormUpdateBody memo={memo} />
    );
  }
  if (action === 'deliveryRequest.create') return <DeliveryRequestCreateBody memo={memo} />;
  return null;
}

function DeliveryRequestStatusChangeBody({ memo }: { readonly memo: DeliveryRequestMemo }) {
  const { t } = useTranslation();
  const fromLabel = memo.fromStatus
    ? deliveryRequestStatusOptions.resolveStatus(memo.fromStatus)
    : null;
  const toLabel = memo.toStatus ? deliveryRequestStatusOptions.resolveStatus(memo.toStatus) : null;
  return (
    <Stack gap={2} pl={36}>
      {fromLabel && toLabel && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <StatusChip status={fromLabel} />
          <Text size="xs" c="dimmed">
            →
          </Text>
          <StatusChip status={toLabel} />
        </Group>
      )}
      {memo.note && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('__new__.01-common.labels.note')}:
          </Text>
          <Text size="xs" fs="italic">
            {memo.note}
          </Text>
        </Group>
      )}
    </Stack>
  );
}

function DeliveryRequestCreateBody({ memo }: { readonly memo: DeliveryRequestMemo }) {
  const { t } = useTranslation();
  const hasItems = Array.isArray(memo.items) && memo.items.length > 0;
  const lineCount = typeof memo.lineCount === 'number' ? memo.lineCount : memo.items?.length;
  const hasParty = drMemoHasParty(memo);
  if (!hasParty && lineCount === undefined && !hasItems) return null;
  return (
    <Stack gap={4} pl={36}>
      {hasParty && <DeliveryRequestPartyRow memo={memo} />}
      {typeof lineCount === 'number' && (
        <Text size="xs" c="dimmed">
          {t('deliveryRequests.detail.activityMemo.lineCount', { count: lineCount })}
        </Text>
      )}
      {hasItems && <DeliveryRequestItemSnapshotList items={memo.items!} />}
    </Stack>
  );
}

function drMemoHasParty(memo: DeliveryRequestMemo): boolean {
  return !!(
    memo.salesOrderId ||
    memo.salesOrderNumber ||
    memo.customerName ||
    memo.vendorCode ||
    memo.vendorName
  );
}

function DeliveryRequestPartyRow({ memo }: { readonly memo: DeliveryRequestMemo }) {
  const { t } = useTranslation();
  const isInbound = memo.direction === 'inbound';
  if (isInbound) {
    const label = memo.vendorName ?? memo.vendorCode;
    if (!label) return null;
    return (
      <Group gap={6} wrap="nowrap" align="baseline">
        <Text size="xs" c="dimmed">
          {t('deliveryRequests.detail.activityMemo.vendor')}:
        </Text>
        {memo.vendorCode ? (
          <VendorLink code={memo.vendorCode} size="xs" />
        ) : (
          <Text size="xs" fw={500}>
            {label}
          </Text>
        )}
      </Group>
    );
  }
  // Outbound — SO link (when present) and/or customer name.
  return (
    <Group gap={8} wrap="wrap" align="baseline">
      {memo.salesOrderId && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('deliveryRequests.detail.activityMemo.salesOrder')}:
          </Text>
          <SalesOrderLink
            id={memo.salesOrderId}
            fallbackLabel={memo.salesOrderNumber ?? null}
            size="xs"
          />
        </Group>
      )}
      {memo.customerName && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('deliveryRequests.detail.activityMemo.customer')}:
          </Text>
          <Text size="xs" fw={500}>
            {memo.customerName}
          </Text>
        </Group>
      )}
    </Group>
  );
}

function DeliveryRequestItemSnapshotList({
  items,
}: {
  readonly items: readonly DeliveryRequestMemoItem[];
}) {
  return (
    <Stack gap={2}>
      {items.map((item, idx) => (
        <DeliveryRequestItemRow
          key={`dr-item-${item.productCode}-${idx}`}
          item={item}
          tone="dimmed"
        />
      ))}
    </Stack>
  );
}

function DeliveryRequestItemRow({
  item,
  tone,
}: {
  readonly item: DeliveryRequestMemoItem;
  readonly tone: 'teal' | 'red' | 'dimmed';
}) {
  const toneColor = tone === 'dimmed' ? 'dimmed' : tone;
  return (
    <Group gap={6} wrap="nowrap" align="baseline">
      <Text size="xs" c={toneColor}>
        ·
      </Text>
      <ProductLink code={item.productCode} size="xs" />
      <Text size="xs" fw={500}>
        {formatQty(item.quantity)}
      </Text>
      <Text size="xs" c="dimmed">
        {item.unit}
      </Text>
      {typeof item.unitPrice === 'number' && item.unitPrice > 0 && (
        <Text size="xs" c="dimmed">
          @ {item.unitPrice.toLocaleString()}
        </Text>
      )}
      {item.fromLocationCode && <LocationTag code={item.fromLocationCode} />}
    </Group>
  );
}

function DeliveryRequestFormUpdateBody({ memo }: { readonly memo: DeliveryRequestMemo }) {
  const { t } = useTranslation();
  const diff = memo.itemDiff;
  const hasItemChanges =
    !!diff && (diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0);
  if (!hasItemChanges && typeof memo.lineCount !== 'number') return null;
  return (
    <Stack gap={4} pl={36}>
      {hasItemChanges && <DeliveryRequestItemDiffSection diff={diff!} />}
      {!hasItemChanges && typeof memo.lineCount === 'number' && (
        <Text size="xs" c="dimmed">
          {t('deliveryRequests.detail.activityMemo.lineCount', { count: memo.lineCount })}
        </Text>
      )}
    </Stack>
  );
}

function DeliveryRequestItemDiffSection({ diff }: { readonly diff: DeliveryRequestItemDiff }) {
  const { t } = useTranslation();
  return (
    <Stack gap={2}>
      {diff.added.length > 0 && (
        <Stack gap={2}>
          <Text size="xs" c="teal" fw={500}>
            {t('deliveryRequests.detail.activityMemo.itemsAdded', { count: diff.added.length })}
          </Text>
          {diff.added.map((item, idx) => (
            <DeliveryRequestItemRow
              key={`dr-add-${item.productCode}-${idx}`}
              item={item}
              tone="teal"
            />
          ))}
        </Stack>
      )}
      {diff.removed.length > 0 && (
        <Stack gap={2}>
          <Text size="xs" c="red" fw={500}>
            {t('deliveryRequests.detail.activityMemo.itemsRemoved', { count: diff.removed.length })}
          </Text>
          {diff.removed.map((item, idx) => (
            <DeliveryRequestItemRow
              key={`dr-del-${item.productCode}-${idx}`}
              item={item}
              tone="red"
            />
          ))}
        </Stack>
      )}
      {diff.changed.length > 0 && (
        <Stack gap={2}>
          <Text size="xs" c="blue" fw={500}>
            {t('deliveryRequests.detail.activityMemo.itemsChanged', { count: diff.changed.length })}
          </Text>
          {diff.changed.map((row, idx) => (
            <DeliveryRequestItemChangeRow key={`dr-chg-${row.productCode}-${idx}`} row={row} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function DeliveryRequestItemChangeRow({
  row,
}: {
  readonly row: DeliveryRequestItemDiff['changed'][number];
}) {
  const { t } = useTranslation();
  return (
    <Stack gap={0}>
      <Group gap={6} wrap="nowrap" align="baseline">
        <Text size="xs" c="dimmed">
          ·
        </Text>
        <ProductLink code={row.productCode} size="xs" />
      </Group>
      <Group gap={8} wrap="wrap" align="baseline" pl={14}>
        {row.from.quantity !== undefined || row.to.quantity !== undefined ? (
          <FieldDelta
            label={t('deliveryRequests.detail.activityMemo.fieldQuantity')}
            from={formatQty(row.from.quantity)}
            to={formatQty(row.to.quantity)}
          />
        ) : null}
        {row.from.unit !== undefined || row.to.unit !== undefined ? (
          <FieldDelta
            label={t('deliveryRequests.detail.activityMemo.fieldUnit')}
            from={row.from.unit}
            to={row.to.unit}
          />
        ) : null}
        {row.from.unitPrice !== undefined || row.to.unitPrice !== undefined ? (
          <FieldDelta
            label={t('deliveryRequests.detail.activityMemo.fieldUnitPrice')}
            from={formatPrice(row.from.unitPrice)}
            to={formatPrice(row.to.unitPrice)}
          />
        ) : null}
        {row.from.fromLocationCode !== undefined || row.to.fromLocationCode !== undefined ? (
          <FieldDelta
            label={t('deliveryRequests.detail.activityMemo.fieldLocation')}
            from={row.from.fromLocationCode}
            to={row.to.fromLocationCode}
          />
        ) : null}
      </Group>
    </Stack>
  );
}

function DeliveryRequestInlineUpdateBody({ memo }: { readonly memo: DeliveryRequestMemo }) {
  const { t } = useTranslation();
  const f = memo.fields;
  if (!f) return null;
  if (
    !f.assignedDriverId &&
    !f.scheduledDate &&
    !f.deliveryAddress &&
    !f.googleMapUrl &&
    !f.notes
  ) {
    return null;
  }
  return (
    <Stack gap={2} pl={36}>
      {f.assignedDriverId && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('deliveryRequests.detail.driverLabel')}:
          </Text>
          {f.assignedDriverId.from ? (
            <EmployeeLink id={f.assignedDriverId.from} size="xs" noAvatar />
          ) : (
            <Text size="xs" c="dimmed">
              —
            </Text>
          )}
          <Text size="xs" c="dimmed">
            →
          </Text>
          {f.assignedDriverId.to ? (
            <EmployeeLink id={f.assignedDriverId.to} size="xs" noAvatar />
          ) : (
            <Text size="xs" c="dimmed">
              —
            </Text>
          )}
        </Group>
      )}
      {f.scheduledDate && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('deliveryRequests.detail.activityMemo.scheduledDate')}:
          </Text>
          <Text size="xs" c="dimmed">
            {f.scheduledDate.from ? formatDate(f.scheduledDate.from) : '—'}
          </Text>
          <Text size="xs" c="dimmed">
            →
          </Text>
          <Text size="xs" fw={500}>
            {f.scheduledDate.to ? formatDate(f.scheduledDate.to) : '—'}
          </Text>
        </Group>
      )}
      {f.deliveryAddress?.changed && (
        <Text size="xs" c="dimmed" fs="italic">
          {t('deliveryRequests.detail.activityMemo.addressChanged')}
        </Text>
      )}
      {f.googleMapUrl?.changed && (
        <Text size="xs" c="dimmed" fs="italic">
          {t('deliveryRequests.detail.activityMemo.googleMapUrlChanged')}
        </Text>
      )}
      {f.notes?.changed && (
        <Text size="xs" c="dimmed" fs="italic">
          {t('deliveryRequests.detail.activityMemo.notesChanged')}
        </Text>
      )}
    </Stack>
  );
}

// ── Goods-receipt memo renderer ──────────────────────────────────────────
//
// The five `goodsReceipt.*` verbs carry module-specific memos (codes-not-
// names per the transactional convention). Status is a bounded enum
// (`draft` / `received` / `cancelled`) so we resolve via
// `findGoodsReceiptStatus()` rather than a config field-options helper.
// Item lines may carry both products and materials; the per-row item link
// switches via `itemType`.

type GoodsReceiptMemo = {
  // common
  receiptNumber?: string;
  vendorCode?: string;
  lineCount?: number;
  // create — items snapshot
  items?: readonly GoodsReceiptMemoItem[];
  // update (form) — item-level + vendor diff
  itemDiff?: GoodsReceiptItemDiff;
  vendorDiff?: GoodsReceiptVendorDiff;
  // update (inline = mobile quantity-edit)
  inlineEdit?: boolean;
  fields?: GoodsReceiptInlineFields;
  // confirmReceived / cancel — inventory-effect summary
  inventoryAttempted?: number;
  inventoryFailed?: number;
  // cancel — fromStatus distinguishes draft cancel (cheap) from received
  // cancel (reversed stock). `priorStatus` is the pre-2026 alias kept for
  // back-compat.
  fromStatus?: GoodsReceiptStatus;
  priorStatus?: GoodsReceiptStatus;
};

function GoodsReceiptMemoLine({
  action,
  memo,
}: {
  readonly action: string;
  readonly memo: GoodsReceiptMemo;
}) {
  if (action === 'goodsReceipt.create') return <GoodsReceiptCreateBody memo={memo} />;
  if (action === 'goodsReceipt.update') {
    return memo.inlineEdit ? (
      <GoodsReceiptInlineUpdateBody memo={memo} />
    ) : (
      <GoodsReceiptFormUpdateBody memo={memo} />
    );
  }
  if (action === 'goodsReceipt.confirmReceived' || action === 'goodsReceipt.repostInventory') {
    return <GoodsReceiptConfirmBody memo={memo} />;
  }
  if (action === 'goodsReceipt.cancel') return <GoodsReceiptCancelBody memo={memo} />;
  return null;
}

// ── create ───────────────────────────────────────────────────────────────

function GoodsReceiptCreateBody({ memo }: { readonly memo: GoodsReceiptMemo }) {
  const { t } = useTranslation();
  const hasItems = Array.isArray(memo.items) && memo.items.length > 0;
  const lineCount = typeof memo.lineCount === 'number' ? memo.lineCount : memo.items?.length;
  if (!memo.vendorCode && lineCount === undefined && !hasItems) return null;
  return (
    <Stack gap={4} pl={36}>
      {memo.vendorCode && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('goodsReceipts.detail.activityMemo.vendor')}:
          </Text>
          <VendorLink code={memo.vendorCode} size="xs" />
        </Group>
      )}
      {typeof lineCount === 'number' && (
        <Text size="xs" c="dimmed">
          {t('goodsReceipts.detail.activityMemo.lineCount', { count: lineCount })}
        </Text>
      )}
      {hasItems && <GoodsReceiptItemSnapshotList items={memo.items!} />}
    </Stack>
  );
}

// ── update (form) ────────────────────────────────────────────────────────

function GoodsReceiptFormUpdateBody({ memo }: { readonly memo: GoodsReceiptMemo }) {
  const { t } = useTranslation();
  const diff = memo.itemDiff;
  const hasItemChanges =
    !!diff && (diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0);
  const hasVendorChange = !!memo.vendorDiff;
  if (!hasItemChanges && !hasVendorChange && typeof memo.lineCount !== 'number') return null;
  return (
    <Stack gap={4} pl={36}>
      {hasVendorChange && <GoodsReceiptVendorDiffRow diff={memo.vendorDiff!} />}
      {hasItemChanges && <GoodsReceiptItemDiffSection diff={diff!} />}
      {!hasItemChanges && typeof memo.lineCount === 'number' && (
        <Text size="xs" c="dimmed">
          {t('goodsReceipts.detail.activityMemo.lineCount', { count: memo.lineCount })}
        </Text>
      )}
    </Stack>
  );
}

function GoodsReceiptVendorDiffRow({ diff }: { readonly diff: GoodsReceiptVendorDiff }) {
  const { t } = useTranslation();
  return (
    <Group gap={6} wrap="nowrap" align="baseline">
      <Text size="xs" c="dimmed">
        {t('goodsReceipts.detail.activityMemo.vendor')}:
      </Text>
      {diff.from.vendorCode ? (
        <VendorLink code={diff.from.vendorCode} size="xs" />
      ) : (
        <Text size="xs" c="dimmed">
          —
        </Text>
      )}
      <Text size="xs" c="dimmed">
        →
      </Text>
      {diff.to.vendorCode ? (
        <VendorLink code={diff.to.vendorCode} size="xs" />
      ) : (
        <Text size="xs" c="dimmed">
          —
        </Text>
      )}
    </Group>
  );
}

function GoodsReceiptItemDiffSection({ diff }: { readonly diff: GoodsReceiptItemDiff }) {
  const { t } = useTranslation();
  return (
    <Stack gap={2}>
      {diff.added.length > 0 && (
        <Stack gap={2}>
          <Text size="xs" c="teal" fw={500}>
            {t('goodsReceipts.detail.activityMemo.itemsAdded', { count: diff.added.length })}
          </Text>
          {diff.added.map((item, idx) => (
            <GoodsReceiptItemRow key={`gr-add-${item.itemCode}-${idx}`} item={item} tone="teal" />
          ))}
        </Stack>
      )}
      {diff.removed.length > 0 && (
        <Stack gap={2}>
          <Text size="xs" c="red" fw={500}>
            {t('goodsReceipts.detail.activityMemo.itemsRemoved', { count: diff.removed.length })}
          </Text>
          {diff.removed.map((item, idx) => (
            <GoodsReceiptItemRow key={`gr-del-${item.itemCode}-${idx}`} item={item} tone="red" />
          ))}
        </Stack>
      )}
      {diff.changed.length > 0 && (
        <Stack gap={2}>
          <Text size="xs" c="blue" fw={500}>
            {t('goodsReceipts.detail.activityMemo.itemsChanged', { count: diff.changed.length })}
          </Text>
          {diff.changed.map((row, idx) => (
            <GoodsReceiptItemChangeRow key={`gr-chg-${row.itemCode}-${idx}`} row={row} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// ── update (inline = mobile quantity-edit) ───────────────────────────────

function GoodsReceiptInlineUpdateBody({ memo }: { readonly memo: GoodsReceiptMemo }) {
  const { t } = useTranslation();
  const q = memo.fields?.quantity;
  if (!q) return null;
  return (
    <Stack gap={2} pl={36}>
      <Group gap={6} wrap="nowrap" align="baseline">
        <Text size="xs" c="dimmed">
          ·
        </Text>
        <GoodsReceiptItemRefLink itemType={q.itemType} itemCode={q.itemCode} />
        <FieldDelta
          label={t('goodsReceipts.detail.activityMemo.fieldQuantity')}
          from={`${formatQty(q.from)} ${q.unit}`}
          to={`${formatQty(q.to)} ${q.unit}`}
        />
      </Group>
    </Stack>
  );
}

// ── confirmReceived ──────────────────────────────────────────────────────

function GoodsReceiptConfirmBody({ memo }: { readonly memo: GoodsReceiptMemo }) {
  const { t } = useTranslation();
  const failed = memo.inventoryFailed ?? 0;
  const attempted = memo.inventoryAttempted ?? 0;
  return (
    <Stack gap={2} pl={36}>
      {typeof memo.lineCount === 'number' && (
        <Text size="xs" c="dimmed">
          {t('goodsReceipts.detail.activityMemo.lineCount', { count: memo.lineCount })}
        </Text>
      )}
      {attempted > 0 && failed === 0 && (
        <Text size="xs" c="teal">
          {t('goodsReceipts.detail.activityMemo.inventoryApplied', { count: attempted })}
        </Text>
      )}
      {failed > 0 && (
        <Text size="xs" c="orange">
          {t('goodsReceipts.detail.activityMemo.inventoryPartial', {
            failed,
            attempted,
          })}
        </Text>
      )}
    </Stack>
  );
}

// ── cancel ───────────────────────────────────────────────────────────────

function GoodsReceiptCancelBody({ memo }: { readonly memo: GoodsReceiptMemo }) {
  const { t } = useTranslation();
  // `fromStatus` is the new (2026-06-03+) field; `priorStatus` is the
  // pre-refactor alias kept on emit for back-compat. Fall through to it.
  const fromValue = memo.fromStatus ?? memo.priorStatus;
  const fromStatus = fromValue ? findGoodsReceiptStatus(fromValue) : null;
  const wasReceived = fromValue === 'received';
  const failed = memo.inventoryFailed ?? 0;
  const attempted = memo.inventoryAttempted ?? 0;
  return (
    <Stack gap={2} pl={36}>
      {fromStatus && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('goodsReceipts.detail.activityMemo.cancelledFrom')}:
          </Text>
          <Text size="xs" fw={500} c={fromStatus.color}>
            {t(fromStatus.labelKey)}
          </Text>
        </Group>
      )}
      {wasReceived ? (
        failed > 0 ? (
          <Text size="xs" c="orange">
            {t('goodsReceipts.detail.activityMemo.inventoryReversalPartial', {
              failed,
              attempted,
            })}
          </Text>
        ) : (
          <Text size="xs" c="red">
            {t('goodsReceipts.detail.activityMemo.inventoryReversed', { count: attempted })}
          </Text>
        )
      ) : (
        <Text size="xs" c="dimmed" fs="italic">
          {t('goodsReceipts.detail.activityMemo.inventoryUnchanged')}
        </Text>
      )}
    </Stack>
  );
}

// ── Shared GR primitives ─────────────────────────────────────────────────

function GoodsReceiptItemSnapshotList({
  items,
}: {
  readonly items: readonly GoodsReceiptMemoItem[];
}) {
  return (
    <Stack gap={2}>
      {items.map((item, idx) => (
        <GoodsReceiptItemRow key={`gr-item-${item.itemCode}-${idx}`} item={item} tone="dimmed" />
      ))}
    </Stack>
  );
}

function GoodsReceiptItemRow({
  item,
  tone,
}: {
  readonly item: GoodsReceiptMemoItem;
  readonly tone: 'teal' | 'red' | 'dimmed';
}) {
  const toneColor = tone === 'dimmed' ? 'dimmed' : tone;
  return (
    <Group gap={6} wrap="nowrap" align="baseline">
      <Text size="xs" c={toneColor}>
        ·
      </Text>
      <GoodsReceiptItemRefLink itemType={item.itemType} itemCode={item.itemCode} />
      <Text size="xs" fw={500}>
        {formatQty(item.quantity)}
      </Text>
      <Text size="xs" c="dimmed">
        {item.unit}
      </Text>
      {item.note && (
        <Text size="xs" c="dimmed" fs="italic">
          · {item.note}
        </Text>
      )}
    </Group>
  );
}

function GoodsReceiptItemChangeRow({
  row,
}: {
  readonly row: GoodsReceiptItemDiff['changed'][number];
}) {
  const { t } = useTranslation();
  return (
    <Stack gap={0}>
      <Group gap={6} wrap="nowrap" align="baseline">
        <Text size="xs" c="dimmed">
          ·
        </Text>
        <GoodsReceiptItemRefLink itemType={row.itemType} itemCode={row.itemCode} />
      </Group>
      <Group gap={8} wrap="wrap" align="baseline" pl={14}>
        {row.from.quantity !== undefined || row.to.quantity !== undefined ? (
          <FieldDelta
            label={t('goodsReceipts.detail.activityMemo.fieldQuantity')}
            from={formatQty(row.from.quantity)}
            to={formatQty(row.to.quantity)}
          />
        ) : null}
        {row.from.note !== undefined || row.to.note !== undefined ? (
          <FieldDelta
            label={t('__new__.01-common.labels.note')}
            from={row.from.note}
            to={row.to.note}
          />
        ) : null}
      </Group>
    </Stack>
  );
}

/**
 * Item-link dispatcher — `itemType` switches between `ProductLink` and
 * `MaterialLink`. Both resolve `code → master-data record` via their stores
 * and render a clickable chip; works the same way the GR detail-page items
 * table does so the audit card matches the detail-page UX.
 */
function GoodsReceiptItemRefLink({
  itemType,
  itemCode,
}: {
  readonly itemType: 'product' | 'material';
  readonly itemCode: string;
}) {
  return itemType === 'product' ? <ProductLink code={itemCode} size="xs" /> : null;
}

// ── Auth / fallback cards ────────────────────────────────────────────────

function LoginActivityCard({
  entry,
  method,
}: {
  readonly entry: ActivityLoggerActivityEntity;
  readonly method: 'password' | 'qr';
}) {
  const { t } = useTranslation();
  const isQr = method === 'qr';
  return (
    <Card withBorder radius="md" padding="sm">
      <ActivityCardHeader
        createdAt={entry.createdAt}
        icon={
          <ThemeIcon size="md" radius="md" variant="light" color={isQr ? 'blue' : 'gray'}>
            {isQr ? <IconQrcode size={16} /> : <IconKey size={16} />}
          </ThemeIcon>
        }
      >
        <Text size="sm" fw={500}>
          {t(`employees.detail.activityLogin.${method}`)}
        </Text>
      </ActivityCardHeader>
    </Card>
  );
}

// Raw JSON view — last-resort fallback. Keeps the entry scannable and dumps
// the rest verbatim so unrecognized verbs are visible (vs silently hidden).
function RawActivityCard({
  entry,
  targetLabel,
  showActor,
}: {
  readonly entry: ActivityLoggerActivityEntity;
  readonly targetLabel: string | null;
  readonly showActor?: boolean;
}) {
  return (
    <Card withBorder radius="md" padding="sm">
      <Stack gap={6}>
        <ActivityCardHeader createdAt={entry.createdAt}>
          {showActor && entry.actorId && <EmployeeLink id={entry.actorId} size="sm" />}
          <Code>{entry.action}</Code>
        </ActivityCardHeader>
        {targetLabel && (
          <Text size="xs" c="dimmed">
            → {targetLabel}
          </Text>
        )}
        <Code block style={{ fontSize: 11 }}>
          {JSON.stringify(entry, null, 2)}
        </Code>
      </Stack>
    </Card>
  );
}

// ── Transport-order memo bodies ──────────────────────────────────────────
//
// TO has no line items and no inventory, so there is no item-diff / inventory
// axis here. What matters on a freight job is its header (truck, driver, route,
// container) and its money — so `update` renders a bounded field diff, and the
// other verbs render a compact job summary.

type TransportOrderFieldDelta = { from?: string | number; to?: string | number };

type TransportOrderMemo = {
  orderNumber?: string;
  // create
  truckId?: string;
  driverId?: string;
  customerCode?: string;
  route?: string;
  containerNumber?: string;
  containerSize?: string;
  shipmentType?: string;
  feeCount?: number;
  /**
   * @deprecated Nothing has emitted this since the 2026-07-16 fee merge (chi hộ
   * became a fee line). Kept because **entries already in the log carry it** — an
   * audit trail is history, and dropping the field would blank a line of it.
   */
  disbursementCount?: number;
  totalAmount?: number;
  grandTotal?: number;
  advanceAmount?: number;
  tripCount?: number;
  tripLaborTotal?: number;
  // update
  fields?: Record<string, TransportOrderFieldDelta | { changed: true } | undefined>;
  // statusChange / cancel / delete
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
};

/** Field-key → i18n label. Keys not listed render under their raw key. */
const TRANSPORT_ORDER_FIELD_LABEL: Record<string, string> = {
  entryDate: 'fieldEntryDate',
  truckId: 'fieldTruck',
  driverId: 'fieldDriver',
  customerCode: 'fieldCustomer',
  billNumber: 'fieldBillNumber',
  containerNumber: 'fieldContainerNumber',
  containerSize: 'fieldContainerSize',
  shipmentType: 'fieldShipmentType',
  route: 'fieldRoute',
  vatRate: 'fieldVatRate',
  totalAmount: 'fieldTotalAmount',
  feeCount: 'fieldFeeCount',
  // No longer emitted (2026-07-16 fee merge) — retained so historical entries
  // still render with a label instead of a raw key.
  disbursementCount: 'fieldDisbursementCount',
  transportContractNo: 'fieldContractNo',
  advanceAmount: 'fieldAdvanceAmount',
  tripCount: 'fieldTripCount',
  tripLaborTotal: 'fieldTripLaborTotal',
};

function TransportOrderStatusChip({ status }: { readonly status: string | undefined }) {
  // `useTranslation` isn't read directly — it's what re-renders this chip when the
  // language changes, since the resolver reads the active language internally.
  useTranslation();
  if (!status) return null;
  const resolved = resolveTransportOrderStatus(status);
  return <StatusChip status={{ label: resolved.label, color: resolved.color }} />;
}

function TransportOrderCreateBody({ memo }: { readonly memo: TransportOrderMemo }) {
  const { t } = useTranslation();
  return (
    <Stack gap={2} pl={44}>
      {memo.route && (
        <Group gap={4} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('transportOrders.detail.activityMemo.route')}:
          </Text>
          <Text size="xs">{memo.route}</Text>
        </Group>
      )}
      <Group gap={8} wrap="wrap" align="baseline">
        {memo.truckId && <TruckLink id={memo.truckId} size="xs" />}
        {memo.driverId && <EmployeeLink id={memo.driverId} size="xs" />}
        {memo.customerCode && <CustomerLink code={memo.customerCode} size="xs" />}
      </Group>
      <Group gap={8} wrap="wrap" align="baseline">
        {memo.containerNumber && (
          <Text size="xs" c="dimmed">
            {t('transportOrders.detail.activityMemo.container')}: {memo.containerNumber}
            {memo.containerSize ? ` (${memo.containerSize}ft)` : ''}
          </Text>
        )}
        {/* Leg count marks the job as multi-trip at a glance — it's only ever
            present on one, and it reframes the truck chip above as the FIRST
            leg's rather than the job's. */}
        {typeof memo.tripCount === 'number' && (
          <Text size="xs" c="dimmed">
            {t('transportOrders.detail.activityMemo.trips', { count: memo.tripCount })}
          </Text>
        )}
        {typeof memo.feeCount === 'number' && (
          <Text size="xs" c="dimmed">
            {t('transportOrders.detail.activityMemo.fees', { count: memo.feeCount })}
          </Text>
        )}
        {/* Pre-2026-07-16 entries only — chi hộ is a fee line now, counted in
            `feeCount`. Still rendered so old history reads as it was written. */}
        {typeof memo.disbursementCount === 'number' && memo.disbursementCount > 0 && (
          <Text size="xs" c="dimmed">
            {t('transportOrders.detail.activityMemo.disbursements', {
              count: memo.disbursementCount,
            })}
          </Text>
        )}
        {typeof memo.advanceAmount === 'number' && memo.advanceAmount > 0 && (
          <Text size="xs" c="dimmed">
            {t('transportOrders.detail.activityMemo.fieldAdvanceAmount')}:{' '}
            {memo.advanceAmount.toLocaleString('vi-VN')}
          </Text>
        )}
      </Group>
    </Stack>
  );
}

function TransportOrderUpdateBody({ memo }: { readonly memo: TransportOrderMemo }) {
  const { t } = useTranslation();
  const fields = memo.fields ?? {};
  const entries = Object.entries(fields).filter(([, v]) => !!v);
  if (entries.length === 0) return null;

  return (
    <Stack gap={2} pl={44}>
      {entries.map(([key, value]) => {
        // The two `{changed:true}` flags — they carry no from/to to render.
        if (key === 'notes' || key === 'scheduleChanged') {
          return (
            <Text key={key} size="xs" c="dimmed">
              {t(
                key === 'notes'
                  ? 'transportOrders.detail.activityMemo.notesChanged'
                  : 'transportOrders.detail.activityMemo.scheduleChanged',
              )}
            </Text>
          );
        }
        const delta = value as TransportOrderFieldDelta;
        const labelKey = TRANSPORT_ORDER_FIELD_LABEL[key];
        const label = labelKey
          ? t(`transportOrders.detail.activityMemo.${labelKey}` as never)
          : key;
        return (
          <FieldDelta
            key={key}
            label={label}
            from={delta.from === undefined ? undefined : String(delta.from)}
            to={delta.to === undefined ? undefined : String(delta.to)}
          />
        );
      })}
    </Stack>
  );
}

function TransportOrderStatusChangeBody({ memo }: { readonly memo: TransportOrderMemo }) {
  return (
    <Group gap={6} pl={44} wrap="nowrap" align="baseline">
      <TransportOrderStatusChip status={memo.fromStatus} />
      <IconArrowRight size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
      <TransportOrderStatusChip status={memo.toStatus} />
    </Group>
  );
}

function TransportOrderCancelBody({
  memo,
  labelKey,
}: {
  readonly memo: TransportOrderMemo;
  readonly labelKey: 'cancelledFrom' | 'deletedFrom';
}) {
  const { t } = useTranslation();
  return (
    <Stack gap={2} pl={44}>
      {memo.fromStatus && (
        <Group gap={4} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t(`transportOrders.detail.activityMemo.${labelKey}` as never)}:
          </Text>
          <TransportOrderStatusChip status={memo.fromStatus} />
        </Group>
      )}
      {memo.reason && (
        <Group gap={4} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('transportOrders.detail.activityMemo.reason')}:
          </Text>
          <Text size="xs">{memo.reason}</Text>
        </Group>
      )}
    </Stack>
  );
}

function TransportOrderMemoLine({
  action,
  memo,
}: {
  readonly action: string;
  readonly memo: TransportOrderMemo;
}) {
  if (action === 'transportOrder.create') return <TransportOrderCreateBody memo={memo} />;
  if (action === 'transportOrder.update') return <TransportOrderUpdateBody memo={memo} />;
  if (action === 'transportOrder.statusChange')
    return <TransportOrderStatusChangeBody memo={memo} />;
  if (action === 'transportOrder.cancel')
    return <TransportOrderCancelBody memo={memo} labelKey="cancelledFrom" />;
  if (action === 'transportOrder.delete')
    return <TransportOrderCancelBody memo={memo} labelKey="deletedFrom" />;
  return null;
}
