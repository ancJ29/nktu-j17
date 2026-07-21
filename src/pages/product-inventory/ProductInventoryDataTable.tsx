import { useMemo, type Ref } from 'react';
import { Badge, Box, Group, HoverCard, Stack, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconMapPin } from '@tabler/icons-react';
import { isProductSet } from '@/utils/productSet';
import { useTranslation } from 'react-i18next';
import { CodeLabel, DataTable } from '@credo/base-ui/components';
import { formatDateTime } from '@/utils/dateFormat';
import { getItemBaseUnit } from '@/utils/unitConversion';
import { lookupLabelOf, useLookupLabels, type InboundEntry } from '@/hooks';
import type { Location, Product, ProductInventorySummary } from '@/types';
import { isDefaultLocation } from '@/types';
import { isLocationsEnabled } from '@/utils/permission';
import { ProductThumb } from '../products/ProductThumb';
import { GoodsReceiptLink } from '@/components/GoodsReceiptLink';
import { InventorySecondaryStatusBadge } from '@/components/inventory/InventorySecondaryStatusBadge';
import { SalesOrderLink } from '@/components/SalesOrderLink';
import { hasImagesForProducts } from '@/utils/permission';
import { PRODUCT_SET_COLOR } from '@/config/misc';

const imagesEnabled = hasImagesForProducts();
const locationsEnabled = isLocationsEnabled();

type Props = {
  readonly summaries: ProductInventorySummary[];
  readonly locations: Location[];
  readonly isLoading?: boolean;
  readonly onRowClick: (product: Product) => void;
  
  readonly inboundIndex?: ReadonlyMap<string, InboundEntry>;
  
  readonly maxHeight?: number | string;
  
  readonly viewportRef?: Ref<HTMLDivElement>;
};

function PlaceholderCell() {
  return (
    <Text size="sm" c="dimmed" ta="right">
      —
    </Text>
  );
}

const MAX_REFS_IN_POPOVER = 10;

function formatByUnit(
  byUnit: Record<string, number>,
  unitLabels: ReturnType<typeof useLookupLabels>,
): string {
  return Object.entries(byUnit)
    .filter(([, q]) => q !== 0)
    .map(([u, q]) => `${q.toLocaleString()} ${lookupLabelOf(unitLabels, u)}`)
    .join(' + ');
}

function InboundDropdown({
  entry,
  unitLabels,
}: {
  entry: InboundEntry;
  unitLabels: ReturnType<typeof useLookupLabels>;
}) {
  const { t } = useTranslation();
  const shown = entry.draftRefs.slice(0, MAX_REFS_IN_POPOVER);
  const extra = entry.draftRefs.length - shown.length;
  return (
    <Stack gap={6}>
      <Text size="xs" fw={600} c="dimmed">
        {t('productInventory.inbound.fromDrafts', { count: entry.draftCount })}
      </Text>
      <Stack gap={4}>
        {shown.map((ref) => (
          <Group key={ref.id} gap={8} wrap="nowrap" justify="space-between">
            <GoodsReceiptLink
              id={ref.id}
              fallbackLabel={ref.receiptNumber}
              size="xs"
              color="teal"
            />
            <Text size="xs" c="dimmed">
              {formatByUnit(ref.byUnit, unitLabels)}
            </Text>
          </Group>
        ))}
        {extra > 0 && (
          <Text size="xs" c="dimmed">
            {t('productInventory.inbound.moreDrafts', { count: extra })}
          </Text>
        )}
      </Stack>
      {entry.unmappedCount > 0 && (
        <Text size="xs" c="orange">
          {t('productInventory.inbound.unmappedWarning', { count: entry.unmappedCount })}
        </Text>
      )}
    </Stack>
  );
}

function InboundCell({
  entry,
  product,
  unitLabels,
}: {
  entry: InboundEntry | undefined;
  product: Product;
  unitLabels: ReturnType<typeof useLookupLabels>;
}) {
  if (!entry || (entry.totalBase === 0 && Object.keys(entry.byUnit).length === 0)) {
    return <PlaceholderCell />;
  }
  const baseUnit = getItemBaseUnit(product);
  const breakdown = Object.entries(entry.byUnit).filter(([u, q]) => q !== 0 && u !== baseUnit);
  return (
    <HoverCard width={320} shadow="md" withArrow position="top" openDelay={120}>
      <HoverCard.Target>
        <Box style={{ cursor: 'help' }}>
          <Stack gap={2} align="flex-end">
            <Group gap={6} wrap="nowrap" justify="flex-end">
              <Text
                size="sm"
                fw={600}
                c="teal"
                td="underline"
                style={{ textDecorationStyle: 'dotted' }}
              >
                {entry.totalBase.toLocaleString()}
              </Text>
              {baseUnit && (
                <Text size="xs" c="dimmed">
                  {lookupLabelOf(unitLabels, baseUnit)}
                </Text>
              )}
              {entry.unmappedCount > 0 && (
                <IconAlertTriangle size={14} color="var(--mantine-color-orange-6)" />
              )}
            </Group>
            {breakdown.length > 0 && (
              <Group gap={4} wrap="wrap" justify="flex-end">
                {breakdown.map(([u, q]) => (
                  <Badge key={u} variant="light" color="teal" size="xs" radius="sm" tt="none">
                    {q.toLocaleString()} {lookupLabelOf(unitLabels, u)}
                  </Badge>
                ))}
              </Group>
            )}
          </Stack>
        </Box>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <InboundDropdown entry={entry} unitLabels={unitLabels} />
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

function ForecastedCell({
  summary,
  entry,
  unitLabels,
}: {
  summary: ProductInventorySummary;
  entry: InboundEntry | undefined;
  unitLabels: ReturnType<typeof useLookupLabels>;
}) {
  const { t } = useTranslation();
  const totalBase = entry?.totalBase || 0;
  const baseUnit = getItemBaseUnit(summary.product);
  const projected = summary.totalAvailable + totalBase;
  const min = summary.product.extra?.minimumInventory?.value;
  const wasBelowMin =
    typeof min === 'number' && summary.totalAvailable <= min && summary.totalAvailable >= 0;
  const wouldClearMin = typeof min === 'number' && projected > min;
  const crossesMinThreshold = wasBelowMin && wouldClearMin;
  const stillBelowMin = typeof min === 'number' && projected <= min;
  return (
    <Tooltip label={t('productInventory.inbound.forecastedHelp')} withArrow>
      <Group gap={6} wrap="nowrap" justify="flex-end">
        <Text
          size="sm"
          fw={crossesMinThreshold ? 700 : 600}
          c={crossesMinThreshold ? 'green' : stillBelowMin ? 'orange' : undefined}
        >
          {projected.toLocaleString()}
        </Text>
        {baseUnit && (
          <Text size="xs" c="dimmed">
            {lookupLabelOf(unitLabels, baseUnit)}
          </Text>
        )}
      </Group>
    </Tooltip>
  );
}

function rollupReservationsBySO(
  summary: ProductInventorySummary,
): { id: string; orderNumber: string; byUnit: Record<string, number> }[] {
  const map = new Map<
    string,
    { id: string; orderNumber: string; byUnit: Record<string, number> }
  >();
  for (const row of summary.rows) {
    const m = row.extra?.reservedBySalesOrder;
    if (!m) continue;
    for (const [soId, entry] of Object.entries(m)) {
      const cur = map.get(soId);
      if (cur) {
        for (const [u, q] of Object.entries(entry.byUnit)) {
          cur.byUnit[u] = (cur.byUnit[u] ?? 0) + q;
        }
      } else {
        map.set(soId, {
          id: soId,
          orderNumber: entry.orderNumber,
          byUnit: { ...entry.byUnit },
        });
      }
    }
  }
  return [...map.values()];
}

function OutgoingDropdown({
  reservations,
  unitLabels,
}: {
  reservations: ReturnType<typeof rollupReservationsBySO>;
  unitLabels: ReturnType<typeof useLookupLabels>;
}) {
  const { t } = useTranslation();
  const shown = reservations.slice(0, MAX_REFS_IN_POPOVER);
  const extra = reservations.length - shown.length;
  return (
    <Stack gap={6}>
      <Text size="xs" fw={600} c="dimmed">
        {t('__new__.07-entities.productInventory.fromOrders')}
      </Text>
      <Stack gap={4}>
        {shown.map((r) => (
          <Group key={r.id} gap={8} wrap="nowrap" justify="space-between">
            <SalesOrderLink id={r.id} fallbackLabel={r.orderNumber} size="xs" />
            <Text size="xs" c="dimmed">
              {formatByUnit(r.byUnit, unitLabels)}
            </Text>
          </Group>
        ))}
        {extra > 0 && (
          <Text size="xs" c="dimmed">
            {t('productInventory.outgoing.moreOrders', { count: extra })}
          </Text>
        )}
      </Stack>
    </Stack>
  );
}

export function ProductInventoryDataTable({
  summaries,
  locations,
  isLoading,
  onRowClick,
  inboundIndex,
  maxHeight = 'calc(100vh - 300px)',
  viewportRef,
}: Props) {
  const { t } = useTranslation();
  const unitLabels = useLookupLabels('unit');

  const locationByCode = useMemo(() => {
    const m = new Map<string, Location>();
    for (const l of locations) m.set(l.code, l);
    return m;
  }, [locations]);

  const columns = useMemo(
    () =>
      [
        {
          key: 'product',
          header: t('common.labels.product'),
          width: '250px',
          render: (s: ProductInventorySummary) => {
            const product = s.product;
            const altNames = s.product.extra?.alternativeNames ?? [];
            return (
              <Group gap="lg" wrap="nowrap">
                {imagesEnabled && <ProductThumb product={product} size={48} />}
                <Stack gap={2}>
                  <Group gap="xs" wrap="nowrap">
                    <Text fz="md" fw={600} lh={1.25}>
                      {product.name}
                    </Text>
                    {isProductSet(product) && (
                      <Badge size="xs" variant="light" color={PRODUCT_SET_COLOR} radius="sm">
                        {t('products.detail.setBadge')}
                      </Badge>
                    )}
                  </Group>
                  <CodeLabel code={product.extra?.sku} />
                  {altNames.length > 0 && (
                    <Text size="xs" c="dimmed" lh={1.2} lineClamp={1}>
                      {altNames.join(', ')}
                    </Text>
                  )}
                </Stack>
                {/* <Stack gap={2}>
                  <Group gap="xs" wrap="nowrap">
                    <Text fz="md" fw={600} lh={1.25}>
                      {product.name}
                    </Text>
                    <CodeLabel code={product.extra?.sku} />
                  </Group>
                  {altNames.length > 0 && (
                    <Text size="xs" c="dimmed" lh={1.2} lineClamp={1}>
                      {altNames.join(', ')}
                    </Text>
                  )}
                  <ActiveBadge
                    isActive={isActive}
                    activeLabel={t('products.status.active')}
                    inactiveLabel={t('common.status.inactive')}
                    size="sm"
                  />
                </Stack> */}
              </Group>
            );
          },
        },
        ...(locationsEnabled
          ? [
              {
                key: 'location',
                header: t('common.labels.location'),
                render: (s: ProductInventorySummary) => {
                  if (s.rows.length === 0) {
                    return (
                      <Text size="xs" c="dimmed">
                        —
                      </Text>
                    );
                  }
                  if (s.rows.length === 1) {
                    const r = s.rows[0];
                    if (isDefaultLocation(r.locationCode)) {
                      return (
                        <Group gap={6} wrap="nowrap">
                          <IconMapPin size={14} color="var(--mantine-color-dimmed)" />
                          <Badge variant="default" size="sm" radius="sm" tt="lowercase">
                            {t('productInventory.defaultLocationBadge')}
                          </Badge>
                        </Group>
                      );
                    }
                    const l = locationByCode.get(r.locationCode);
                    return (
                      <Group gap={6} wrap="nowrap">
                        <IconMapPin size={14} color="var(--mantine-color-dimmed)" />
                        <Text size="sm" fw="bold">
                          {l?.name ?? r.locationCode}
                        </Text>
                      </Group>
                    );
                  }
                  return (
                    <Group gap={6} wrap="nowrap">
                      <IconMapPin size={14} color="var(--mantine-color-dimmed)" />
                      <Badge variant="light" color="gray" size="sm" radius="sm" tt="lowercase">
                        {t('common.columns.locationCount', { count: s.rows.length })}
                      </Badge>
                    </Group>
                  );
                },
              },
            ]
          : []),

        {
          key: 'minStock',
          header: (
            <Tooltip label={t('common.columns.minStockTooltip')} withArrow>
              <Text size="sm" fw="bold" ta="right">
                {t('common.columns.minStock')}
              </Text>
            </Tooltip>
          ),
          ta: 'right' as const,
          render: (s: ProductInventorySummary) => {
            const min = s.product.extra?.minimumInventory;
            if (!min || typeof min.value !== 'number') return <PlaceholderCell />;
            return (
              <Group gap={6} wrap="nowrap" justify="flex-end">
                <Text size="sm" fw="bold">
                  {min.value.toLocaleString()}
                </Text>
                {min.unit && (
                  <Text size="xs" c="dimmed">
                    {lookupLabelOf(unitLabels, min.unit)}
                  </Text>
                )}
              </Group>
            );
          },
        },
        {
          key: 'beginOfPeriod',
          header: (
            <Tooltip label={t('common.columns.beginOfPeriodTooltip')} withArrow>
              <Text size="sm" fw="bold" ta="right">
                {t('common.columns.beginOfPeriodWithPeriod')}
              </Text>
            </Tooltip>
          ),
          ta: 'right' as const,
          render: (s: ProductInventorySummary) => {
            
            
            if (!s.hasBeginOfPeriod) return <PlaceholderCell />;
            const baseUnit = getItemBaseUnit(s.product);
            return (
              <Group gap={6} wrap="nowrap" justify="flex-end">
                <Text size="sm" fw="bold">
                  {s.totalBeginOfPeriod.toLocaleString()}
                </Text>
                {baseUnit && (
                  <Text size="xs" c="dimmed">
                    {lookupLabelOf(unitLabels, baseUnit)}
                  </Text>
                )}
              </Group>
            );
          },
        },
        {
          key: 'onHand',
          header: t('common.columns.onHand'),
          ta: 'right' as const,
          render: (s: ProductInventorySummary) => {
            const min = s.product.extra?.minimumInventory?.value;
            const isNegative = s.totalOnHand < 0;
            const isOutOfStock = !isNegative && s.totalOnHand === 0;
            const isLow =
              !isNegative && !isOutOfStock && typeof min === 'number' && s.totalOnHand <= min;
            const isOvercommitted = s.totalReserved > s.totalOnHand;
            const baseUnit = getItemBaseUnit(s.product);
            const breakdownEntries = Object.entries(s.totalByUnit).filter(
              ([u, q]) => q !== 0 && u !== baseUnit,
            );
            return (
              <Stack gap={2} align="flex-end">
                <Group gap={6} wrap="nowrap" justify="flex-end">
                  {isOvercommitted && (
                    <Tooltip
                      label={t('productInventory.columns.overcommittedTooltip', {
                        reserved: s.totalReserved.toLocaleString(),
                        onHand: s.totalOnHand.toLocaleString(),
                      })}
                      withArrow
                    >
                      <IconAlertTriangle size={14} color="var(--mantine-color-orange-6)" />
                    </Tooltip>
                  )}
                  <Text
                    size="md"
                    fw={700}
                    c={isNegative ? 'red' : isLow ? 'orange' : isOutOfStock ? 'dimmed' : undefined}
                  >
                    {s.totalOnHand.toLocaleString()}
                  </Text>
                  {baseUnit && (
                    <Text size="xs" c="dimmed">
                      {lookupLabelOf(unitLabels, baseUnit)}
                    </Text>
                  )}
                  {isNegative && (
                    <Badge size="xs" variant="light" color="red" radius="sm" tt="lowercase">
                      {t('productInventory.stockState.negative')}
                    </Badge>
                  )}
                  {isLow && (
                    <Badge size="xs" variant="light" color="orange" radius="sm" tt="lowercase">
                      {t('productInventory.stockState.low')}
                    </Badge>
                  )}
                </Group>
                {breakdownEntries.length > 0 && (
                  <Group gap={4} wrap="wrap" justify="flex-end">
                    {breakdownEntries.map(([u, q]) => (
                      <Badge key={u} variant="light" color="gray" size="xs" radius="sm" tt="none">
                        {q.toLocaleString()} {lookupLabelOf(unitLabels, u)}
                      </Badge>
                    ))}
                  </Group>
                )}
              </Stack>
            );
          },
        },
        {
          key: 'incoming',
          header: (
            <Tooltip label={t('productInventory.columns.incomingTooltip')} withArrow>
              <Text size="sm" fw="bold" ta="right">
                {t('productInventory.columns.incoming')}
              </Text>
            </Tooltip>
          ),
          ta: 'right' as const,
          render: (s: ProductInventorySummary) => (
            <InboundCell
              entry={inboundIndex?.get(s.product.code)}
              product={s.product}
              unitLabels={unitLabels}
            />
          ),
        },
        {
          key: 'outgoing',
          header: (
            <Tooltip label={t('productInventory.columns.outgoingTooltip')} withArrow>
              <Text size="sm" fw="bold" ta="right">
                {t('productInventory.columns.outgoing')}
              </Text>
            </Tooltip>
          ),
          ta: 'right' as const,
          render: (s: ProductInventorySummary) => {
            if (!s.totalReserved) return <PlaceholderCell />;
            const baseUnit = getItemBaseUnit(s.product);
            const reservedExtras = Object.entries(s.reservedByUnit).filter(
              ([u, q]) => q !== 0 && u !== baseUnit,
            );
            const reservations = rollupReservationsBySO(s);
            const cell = (
              <Stack gap={2} align="flex-end">
                <Group gap={6} wrap="nowrap" justify="flex-end">
                  <Text
                    size="sm"
                    fw={600}
                    c="orange"
                    td={reservations.length > 0 ? 'underline' : undefined}
                    style={reservations.length > 0 ? { textDecorationStyle: 'dotted' } : undefined}
                  >
                    {s.totalReserved.toLocaleString()}
                  </Text>
                  {baseUnit && (
                    <Text size="xs" c="dimmed">
                      {lookupLabelOf(unitLabels, baseUnit)}
                    </Text>
                  )}
                </Group>
                {reservedExtras.length > 0 && (
                  <Group gap={4} wrap="wrap" justify="flex-end">
                    {reservedExtras.map(([u, q]) => (
                      <Badge key={u} variant="light" color="orange" size="xs" radius="sm" tt="none">
                        {q.toLocaleString()} {lookupLabelOf(unitLabels, u)}
                      </Badge>
                    ))}
                  </Group>
                )}
              </Stack>
            );
            
            
            
            if (reservations.length === 0) return cell;
            return (
              <HoverCard width={320} shadow="md" withArrow position="top" openDelay={120}>
                <HoverCard.Target>
                  <Box style={{ cursor: 'help' }}>{cell}</Box>
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  <OutgoingDropdown reservations={reservations} unitLabels={unitLabels} />
                </HoverCard.Dropdown>
              </HoverCard>
            );
          },
        },
        {
          key: 'forecasted',
          header: (
            <Tooltip label={t('productInventory.columns.forecastedTooltip')} withArrow>
              <Text size="sm" fw="bold" ta="right">
                {t('productInventory.columns.forecasted')}
              </Text>
            </Tooltip>
          ),
          ta: 'right' as const,
          render: (s: ProductInventorySummary) => (
            <ForecastedCell
              summary={s}
              entry={inboundIndex?.get(s.product.code)}
              unitLabels={unitLabels}
            />
          ),
        },
        {
          key: 'secondaryStatus',
          header: (
            <Tooltip label={t('common.columns.secondaryStatusTooltip')} withArrow>
              <Text size="sm" fw="bold" ta="center">
                {t('common.columns.secondaryStatus')}
              </Text>
            </Tooltip>
          ),
          ta: 'center' as const,
          render: (s: ProductInventorySummary) => (
            <Box ta="center">
              <InventorySecondaryStatusBadge status={s.secondaryStatus} />
            </Box>
          ),
        },
        {
          key: 'lastUpdated',
          ta: 'right',
          header: t('common.columns.lastUpdated'),
          hidden: true,
          render: (s: ProductInventorySummary) => (
            <Text size="xs" c="dimmed" ta="right" w="100%">
              {s.lastUpdatedAt ? formatDateTime(s.lastUpdatedAt) : '—'}
            </Text>
          ),
        },
      ] as {
        key: string;
        header: string;
        render: (item: ProductInventorySummary) => React.ReactNode;
        ta?: 'left' | 'center' | 'right';
      }[],
    [t, locationByCode, unitLabels, inboundIndex],
  );

  return (
    <DataTable
      withIndex
      noActions
      maxHeight={maxHeight}
      viewportRef={viewportRef}
      data={summaries as (ProductInventorySummary & Record<string, unknown>)[]}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('productInventory.emptyMessage')}
      onRowClick={(s: ProductInventorySummary) => onRowClick(s.product)}
    />
  );
}
