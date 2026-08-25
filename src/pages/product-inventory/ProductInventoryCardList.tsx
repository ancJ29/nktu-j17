import { useMemo } from 'react';
import { Badge, Card, Group, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconBuildingWarehouse, IconMapPin } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { getItemBaseUnit } from '@/utils/unitConversion';
import { lookupLabelOf, useLookupV2Labels, type InboundEntry } from '@/hooks';
import type { Location, Product, ProductInventorySummary } from '@/types';
import { isDefaultLocation } from '@/types';
import { isLocationsEnabled } from '@/utils/permission';

const locationsEnabled = isLocationsEnabled();

type Props = {
  readonly summaries: ProductInventorySummary[];
  readonly locations: Location[];
  readonly isLoading?: boolean;
  readonly onRowClick: (product: Product) => void;
  readonly inboundIndex?: ReadonlyMap<string, InboundEntry>;
};

function CardSkeleton() {
  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap={6}>
        <Skeleton h={14} w="60%" />
        <Skeleton h={10} w="50%" />
        <Skeleton h={20} w="30%" />
      </Stack>
    </Card>
  );
}

export function ProductInventoryCardList({
  summaries,
  locations,
  isLoading,
  onRowClick,
  inboundIndex,
}: Props) {
  const { t } = useTranslation();
  const unitLabels = useLookupV2Labels('product-unit');

  const locationByCode = useMemo(() => {
    const m = new Map<string, Location>();
    for (const l of locations) m.set(l.code, l);
    return m;
  }, [locations]);

  if (isLoading) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 5 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </Stack>
    );
  }

  if (summaries.length === 0) {
    return (
      <Card withBorder padding="xl" radius="md">
        <Stack align="center" gap="sm" py="md">
          <ThemeIcon size={56} radius="xl" variant="light" color="gray">
            <IconBuildingWarehouse size={28} stroke={1.5} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            {t('productInventory.emptyTitle')}
          </Text>
          <Text size="xs" c="dimmed" ta="center" maw={260}>
            {t('productInventory.emptyMessage')}
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="sm">
      {summaries.map((s) => {
        const min = s.product.extra?.minimumInventory?.value;
        const isNegative = s.totalOnHand < 0;
        const isOutOfStock = !isNegative && s.totalOnHand === 0;
        const isLow =
          !isNegative && !isOutOfStock && typeof min === 'number' && s.totalOnHand <= min;
        const baseUnit = getItemBaseUnit(s.product);
        const sku = s.product.extra?.sku;

        let locationNode: React.ReactNode = null;
        if (locationsEnabled) {
          if (s.rows.length === 0) {
            locationNode = (
              <Text size="xs" c="dimmed">
                —
              </Text>
            );
          } else if (s.rows.length === 1) {
            const r = s.rows[0];
            locationNode = isDefaultLocation(r.locationCode) ? (
              <Badge variant="default" size="xs" radius="sm" tt="lowercase">
                {t('productInventory.defaultLocationBadge')}
              </Badge>
            ) : (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {locationByCode.get(r.locationCode)?.name ?? r.locationCode}
              </Text>
            );
          } else {
            locationNode = (
              <Badge variant="light" color="gray" size="xs" radius="sm" tt="lowercase">
                {t('common.columns.locationCount', { count: s.rows.length })}
              </Badge>
            );
          }
        }

        return (
          <Card
            key={s.product.id}
            withBorder
            padding="sm"
            radius="md"
            onClick={() => onRowClick(s.product)}
            style={{ cursor: 'pointer' }}
          >
            <Stack gap={6}>
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={700} size="sm" lh={1.25} truncate>
                    {s.product.name}
                  </Text>
                  <Group gap={6} wrap="nowrap">
                    {sku && (
                      <Text size="xs" c="dimmed" ff="monospace">
                        {sku}
                      </Text>
                    )}
                    {locationNode && (
                      <>
                        <IconMapPin size={12} color="var(--mantine-color-dimmed)" />
                        {locationNode}
                      </>
                    )}
                  </Group>
                </Stack>
                <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
                  <Group gap={4} align="baseline">
                    <Text
                      size="lg"
                      fw={700}
                      c={
                        isNegative ? 'red' : isLow ? 'orange' : isOutOfStock ? 'dimmed' : undefined
                      }
                    >
                      {s.totalOnHand.toLocaleString()}
                    </Text>
                    {baseUnit && (
                      <Text size="xs" c="dimmed">
                        {lookupLabelOf(unitLabels, baseUnit)}
                      </Text>
                    )}
                  </Group>
                  {(isNegative || isLow) && (
                    <Badge
                      size="xs"
                      variant="light"
                      color={isNegative ? 'red' : 'orange'}
                      radius="sm"
                      tt="lowercase"
                    >
                      {t(
                        isNegative
                          ? 'productInventory.stockState.negative'
                          : 'productInventory.stockState.low',
                      )}
                    </Badge>
                  )}
                  {(() => {
                    const breakdownEntries = Object.entries(s.totalByUnit).filter(
                      ([u, q]) => q !== 0 && u !== baseUnit,
                    );
                    if (breakdownEntries.length === 0) return null;
                    return (
                      <Group gap={4} wrap="wrap" justify="flex-end">
                        {breakdownEntries.map(([u, q]) => (
                          <Badge
                            key={u}
                            variant="light"
                            color="gray"
                            size="xs"
                            radius="sm"
                            tt="none"
                          >
                            {q.toLocaleString()} {lookupLabelOf(unitLabels, u)}
                          </Badge>
                        ))}
                      </Group>
                    );
                  })()}
                </Stack>
              </Group>

              <Group gap={12} wrap="nowrap" justify="flex-end">
                {(() => {
                  const minInv = s.product.extra?.minimumInventory;
                  const minLabel =
                    minInv && typeof minInv.value === 'number'
                      ? `${minInv.value.toLocaleString()}${
                          minInv.unit ? ` ${lookupLabelOf(unitLabels, minInv.unit)}` : ''
                        }`
                      : '—';
                  const inbound = inboundIndex?.get(s.product.code);
                  const inboundLabel =
                    inbound && inbound.totalBase > 0
                      ? `${inbound.totalBase.toLocaleString()} ${
                          baseUnit ? lookupLabelOf(unitLabels, baseUnit) : ''
                        }`.trim()
                      : '—';
                  const projected =
                    inbound && inbound.totalBase > 0
                      ? `${(s.totalAvailable + inbound.totalBase).toLocaleString()} ${
                          baseUnit ? lookupLabelOf(unitLabels, baseUnit) : ''
                        }`.trim()
                      : '—';
                  const inboundColor =
                    inbound && inbound.totalBase > 0 ? 'teal' : ('dimmed' as const);
                  const beginLabel = s.hasBeginOfPeriod
                    ? `${s.totalBeginOfPeriod.toLocaleString()}${
                        baseUnit ? ` ${lookupLabelOf(unitLabels, baseUnit)}` : ''
                      }`
                    : '—';
                  const outgoingLabel = s.totalReserved
                    ? `${s.totalReserved.toLocaleString()}${
                        baseUnit ? ` ${lookupLabelOf(unitLabels, baseUnit)}` : ''
                      }`
                    : '—';
                  const outgoingColor = s.totalReserved ? 'orange' : ('dimmed' as const);
                  return (
                    <>
                      <Text size="xs" c="dimmed">
                        {t('common.columns.minStock')}: {minLabel}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {t('common.columns.beginOfPeriod')}: {beginLabel}
                      </Text>
                      <Text size="xs" c={inboundColor}>
                        {t('productInventory.columns.incoming')}: {inboundLabel}
                      </Text>
                      <Text size="xs" c={outgoingColor}>
                        {t('productInventory.columns.outgoing')}: {outgoingLabel}
                      </Text>
                      <Text size="xs" c={inboundColor}>
                        {t('productInventory.columns.forecasted')}: {projected}
                      </Text>
                    </>
                  );
                })()}
              </Group>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
