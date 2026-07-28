import { useMemo } from 'react';
import { Badge, Box, Group, HoverCard, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { Material, MaterialInventoryRow } from '@/types';
import { ColorBadge } from '@credo/base-ui/components';
import { ListDataTable } from '@/components/ListDataTable';
import { ActiveBadge } from '@/components/badges';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';
import {
  getMaterialUnitCategory,
  hasMaterialImages,
  hasMaterialMinimumStock,
  hasMaterialPricing,
  isMaterialLowStock,
  MATERIAL_CATEGORY_LOOKUP,
} from '@/utils/materialConfig';
import { formatNumber } from '@/utils/number';
import { MaterialThumb } from './MaterialThumb';

const imagesEnabled = hasMaterialImages();
const pricingEnabled = hasMaterialPricing();
const minStockEnabled = hasMaterialMinimumStock();

type MaterialDataTableProps = {
  readonly materials: Material[];
  readonly isLoading?: boolean;

  readonly invByCode?: ReadonlyMap<string, MaterialInventoryRow>;
};

function OnHandCell({
  row,
  material,
  unitLabels,
}: {
  row: MaterialInventoryRow | undefined;
  material: Material;
  unitLabels: Map<string, string>;
}) {
  const { t } = useTranslation();
  if (!row) {
    return (
      <Text size="sm" c="dimmed" fs="italic" ta="right">
        —
      </Text>
    );
  }

  const baseUnit = material.extra?.units?.[0];
  const byUnit = row.extra?.onHandByUnit;
  const breakdown = byUnit ? Object.entries(byUnit).filter(([, q]) => q !== 0) : [];
  const isMultiUnit = (material.extra?.units?.length ?? 0) > 1 && breakdown.length > 0;
  const isNegative = row.onHand < 0;
  const minStock = material.extra?.minimumStock;
  const isLow = minStockEnabled && isMaterialLowStock(minStock, row.onHand);

  const total = (
    <Stack gap={2} align="flex-end">
      <Group gap={4} wrap="nowrap" justify="flex-end" align="baseline">
        <Text
          size="sm"
          fw={600}
          c={isNegative ? 'red' : isLow ? 'orange' : isMultiUnit ? 'teal' : undefined}
          td={isMultiUnit ? 'underline' : undefined}
          style={isMultiUnit ? { textDecorationStyle: 'dotted', cursor: 'help' } : undefined}
        >
          {row.onHand.toLocaleString()}
        </Text>
        {baseUnit && (
          <Text size="xs" c="dimmed">
            {lookupLabelOf(unitLabels, baseUnit)}
          </Text>
        )}
        {isNegative && (
          <Badge size="xs" variant="filled" color="red" radius="sm">
            {t('productInventory.stockState.negative')}
          </Badge>
        )}
      </Group>
      {minStockEnabled && typeof minStock === 'number' && (
        <Group gap={4} wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {t('materials.columns.minimumStock')}:
          </Text>
          <Text size="xs" c="dimmed" fw={500}>
            {minStock.toLocaleString()}
          </Text>
        </Group>
      )}
    </Stack>
  );

  if (!isMultiUnit) return total;

  return (
    <HoverCard width={240} shadow="md" withArrow position="top" openDelay={120}>
      <HoverCard.Target>
        <Box>{total}</Box>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Stack gap={6}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">
            {t('common.labels.onHand')}
          </Text>
          {breakdown.map(([u, q]) => (
            <Group key={u} justify="space-between" gap="lg" wrap="nowrap">
              <Text size="sm">{lookupLabelOf(unitLabels, u, u)}</Text>
              <Text size="sm" fw={600}>
                {q.toLocaleString()}
              </Text>
            </Group>
          ))}
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

export function MaterialDataTable({ materials, isLoading, invByCode }: MaterialDataTableProps) {
  const { t } = useTranslation();
  const unitLabels = useLookupV2Labels(getMaterialUnitCategory());
  const categoryLabels = useLookupV2Labels(MATERIAL_CATEGORY_LOOKUP);

  const showCategory = useMemo(() => materials.some((m) => !!m.extra?.category), [materials]);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('common.labels.name'),
        width: '320px',
        render: (item: Material) => (
          <Group gap="md" wrap="nowrap">
            {imagesEnabled && <MaterialThumb material={item} size={44} />}
            <Stack gap={2}>
              <Text fz="md" fw={600} lh={1.25}>
                {item.name}
              </Text>
              <Text size="xs" c="dimmed" ff="monospace" tt="uppercase" fw={500}>
                {item.code}
              </Text>
            </Stack>
          </Group>
        ),
      },
      ...(showCategory
        ? [
            {
              key: 'category',
              header: t('common.labels.category'),
              width: '200px',
              render: (item: Material) =>
                item.extra?.category ? (
                  <ColorBadge
                    label={lookupLabelOf(categoryLabels, item.extra.category, item.extra.category)}
                    size="sm"
                  />
                ) : null,
            },
          ]
        : []),
      ...(pricingEnabled
        ? [
            {
              key: 'costPrice',
              header: t('materials.detail.costPrice'),
              ta: 'right' as const,
              width: '140px',
              render: (item: Material) => (
                <Text size="sm" fw={600} ta="right">
                  {formatNumber(item.extra?.costPrice)}
                </Text>
              ),
            },
          ]
        : []),
      ...(invByCode
        ? [
            {
              key: 'onHand',
              header: t('common.labels.onHand'),
              ta: 'right' as const,
              width: '200px',
              render: (item: Material) => (
                <OnHandCell
                  row={invByCode.get(item.code)}
                  material={item}
                  unitLabels={unitLabels}
                />
              ),
            },
          ]
        : []),
      {
        key: 'status',
        header: t('__new__.01-common.labels.status'),
        ta: 'right' as const,
        render: (item: Material) => (
          <Group gap="xs" wrap="nowrap" justify="flex-end" align="baseline">
            <ActiveBadge
              isActive={item.isActive}
              activeLabel={t('materials.status.active')}
              inactiveLabel={t('common.status.inactive')}
              size="sm"
            />
          </Group>
        ),
      },
    ],
    [t, invByCode, showCategory, unitLabels, categoryLabels],
  );

  const getRowBg = useMemo(
    () =>
      invByCode
        ? (item: Material) => ((invByCode.get(item.code)?.onHand ?? 0) < 0 ? 'red.1' : undefined)
        : undefined,
    [invByCode],
  );

  return (
    <ListDataTable
      data={materials}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('materials.noItems')}
      detailRoute={ROUTES.MATERIALS.DETAIL}
      getRowBg={getRowBg}
    />
  );
}
