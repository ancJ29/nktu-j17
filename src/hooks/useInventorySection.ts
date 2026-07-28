import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDisclosure } from '@mantine/hooks';
import { useLocationStore } from '@/stores/useLocationStore';
import type { Location } from '@/types';
import { isDefaultLocation } from '@/types';
import { getItemBaseUnit, getItemUnits } from '@/utils/unitConversion';
import { lookupLabelOf, useLookupLabels } from '@/hooks';

type InventoryRowBase = {
  readonly id: string;
  readonly itemCode: string;
  readonly locationCode: string;
  readonly onHand: number;
  readonly extra?: {
    readonly isDeleted?: boolean;
    readonly onHandByUnit?: Record<string, number>;
  } & Record<string, unknown>;
};

type EntityBase = {
  readonly code: string;
  readonly unit: string;
  readonly extra?: { readonly units?: string[] } & Record<string, unknown>;
};

type InventoryStoreSlice<TRow extends InventoryRowBase> = {
  readonly items: readonly TRow[];
  readonly loading: boolean;
  readonly initialized: boolean;
  readonly loadAll: () => unknown;
  readonly forceRefresh: () => unknown;
};

type Options<TEntity extends EntityBase, TRow extends InventoryRowBase> = {
  readonly entity: TEntity;
  readonly store: InventoryStoreSlice<TRow>;

  readonly unitLookup?: string;
};

export type InventorySection<TRow extends InventoryRowBase> = {
  readonly rows: TRow[];

  readonly allRows: readonly TRow[];
  readonly totalOnHand: number;
  readonly baseUnit: string;
  readonly baseUnitLabel: string;
  readonly hasMultipleUnits: boolean;
  readonly unitLabels: ReturnType<typeof useLookupLabels>;
  readonly locationByCode: Map<string, Location>;
  readonly forceRefresh: () => unknown;

  readonly isReady: boolean;
  readonly update: {
    readonly opened: boolean;
    readonly activeRow: TRow | null;
    readonly open: (row: TRow) => void;
    readonly close: () => void;

    readonly contextLabel: string | undefined;
    readonly noLocation: boolean;
  };
  readonly create: {
    readonly opened: boolean;
    readonly open: () => void;
    readonly close: () => void;
  };
};

export function useInventorySection<TEntity extends EntityBase, TRow extends InventoryRowBase>({
  entity,
  store,
  unitLookup = 'unit',
}: Options<TEntity, TRow>): InventorySection<TRow> {
  const { t } = useTranslation();
  const { items: allRows, loading, initialized, loadAll, forceRefresh } = store;
  const locations = useLocationStore((s) => s.items);

  useEffect(() => {
    if (!initialized) loadAll();
  }, [initialized, loadAll]);

  const rows = useMemo(
    () => allRows.filter((r) => r.itemCode === entity.code && !r.extra?.isDeleted),
    [allRows, entity.code],
  );

  const locationByCode = useMemo(() => {
    const m = new Map<string, Location>();
    for (const l of locations) m.set(l.code, l as Location);
    return m;
  }, [locations]);

  const totalOnHand = useMemo(() => rows.reduce((sum, r) => sum + r.onHand, 0), [rows]);
  const baseUnit = getItemBaseUnit(entity);
  const units = useMemo(() => getItemUnits(entity), [entity]);
  const hasMultipleUnits = units.length > 1;
  const unitLabels = useLookupLabels(unitLookup);
  const baseUnitLabel = baseUnit ? lookupLabelOf(unitLabels, baseUnit) : '';

  const [updateOpened, { open: openUpdateRaw, close: closeUpdate }] = useDisclosure(false);
  const [activeRow, setActiveRow] = useState<TRow | null>(null);

  const openUpdate = useCallback(
    (row: TRow) => {
      setActiveRow(row);
      openUpdateRaw();
    },
    [openUpdateRaw],
  );

  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);

  const noLocation = isDefaultLocation(activeRow?.locationCode);
  const contextLabel = activeRow
    ? noLocation
      ? t('common.labels.defaultLocation')
      : (locationByCode.get(activeRow.locationCode)?.name ?? activeRow.locationCode)
    : undefined;

  return {
    rows,
    allRows,
    totalOnHand,
    baseUnit,
    baseUnitLabel,
    hasMultipleUnits,
    unitLabels,
    locationByCode,
    forceRefresh,
    isReady: initialized || !loading,
    update: {
      opened: updateOpened,
      activeRow,
      open: openUpdate,
      close: closeUpdate,
      contextLabel,
      noLocation,
    },
    create: {
      opened: createOpened,
      open: openCreate,
      close: closeCreate,
    },
  };
}
