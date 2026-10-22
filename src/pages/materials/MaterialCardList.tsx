import { Badge, Card, Group, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconBox } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { ActiveBadge } from '@/components/badges';
import { ColorBadge } from '@credo/base-ui/components';
import { ListCardList } from '@/components/ListCardList';
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
import type { Material, MaterialInventoryRow } from '@/types';
import { MaterialThumb } from './MaterialThumb';

const imagesEnabled = hasMaterialImages();
const pricingEnabled = hasMaterialPricing();
const minStockEnabled = hasMaterialMinimumStock();

type MaterialCardListProps = {
  readonly materials: Material[];
  readonly isLoading?: boolean;

  readonly invByCode?: ReadonlyMap<string, MaterialInventoryRow>;
};

function MaterialCardSkeleton() {
  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap={6}>
        <Skeleton h={14} w="60%" />
        <Skeleton h={10} w="40%" />
      </Stack>
    </Card>
  );
}

export function MaterialCardList({ materials, isLoading, invByCode }: MaterialCardListProps) {
  const { t } = useTranslation();
  const unitLabels = useLookupV2Labels(getMaterialUnitCategory());
  const categoryLabels = useLookupV2Labels(MATERIAL_CATEGORY_LOOKUP);

  return (
    <ListCardList
      data={materials}
      isLoading={isLoading}
      detailRoute={ROUTES.MATERIALS.DETAIL}
      getRowBg={
        invByCode
          ? (item) => ((invByCode.get(item.code)?.onHand ?? 0) < 0 ? 'red.1' : undefined)
          : undefined
      }
      renderSkeleton={() => <MaterialCardSkeleton />}
      emptyState={
        <Card withBorder padding="xl" radius="md">
          <Stack align="center" gap="sm" py="md">
            <ThemeIcon size={56} radius="xl" variant="light" color="gray">
              <IconBox size={28} stroke={1.5} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              {t('materials.emptyTitle')}
            </Text>
            <Text size="xs" c="dimmed" ta="center" maw={260}>
              {t('materials.emptyMessage')}
            </Text>
          </Stack>
        </Card>
      }
      renderCard={(item) => {
        const baseUnit = item.extra?.units?.[0];
        const category = item.extra?.category;
        const costPrice = item.extra?.costPrice;
        const row = invByCode?.get(item.code);
        const byUnit = row?.extra?.onHandByUnit;
        const breakdown = byUnit ? Object.entries(byUnit).filter(([, q]) => q !== 0) : [];
        const isLow =
          minStockEnabled &&
          row != null &&
          isMaterialLowStock(item.extra?.minimumStock, row.onHand);
        return (
          <Group gap="md" wrap="nowrap" align="flex-start">
            {imagesEnabled && <MaterialThumb material={item} size={44} />}
            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Group gap={8} wrap="nowrap" justify="space-between" align="flex-start">
                <Text fw={700} size="sm" lh={1.25} truncate style={{ flex: 1 }}>
                  {item.name}
                </Text>
                <ActiveBadge
                  isActive={item.isActive}
                  activeLabel={t('materials.status.active')}
                  inactiveLabel={t('__new__.01-common.labels.inactive')}
                  size="sm"
                  style={{ flexShrink: 0 }}
                />
              </Group>
              <Group gap={8} align="center" wrap="nowrap">
                <Text
                  size="xs"
                  c="dimmed"
                  ff="monospace"
                  tt="uppercase"
                  fw={500}
                  style={{ letterSpacing: 0.3 }}
                >
                  {item.code}
                </Text>
                {category && (
                  <ColorBadge label={lookupLabelOf(categoryLabels, category, category)} size="xs" />
                )}
              </Group>
              {pricingEnabled && costPrice != null && (
                <Group gap={6} align="baseline">
                  <Text size="xs" c="dimmed">
                    {t('materials.detail.costPrice')}
                  </Text>
                  <Text size="sm" fw={600}>
                    {formatNumber(costPrice)}
                  </Text>
                </Group>
              )}
              {row && (
                <Group gap={6} align="baseline" wrap="wrap">
                  <Text size="xs" c="dimmed">
                    {t('common.labels.onHand')}
                  </Text>
                  <Text
                    size="sm"
                    fw={600}
                    c={row.onHand < 0 ? 'red' : isLow ? 'orange' : undefined}
                  >
                    {row.onHand.toLocaleString()}
                  </Text>
                  {baseUnit && (
                    <Text size="xs" c="dimmed">
                      {lookupLabelOf(unitLabels, baseUnit)}
                    </Text>
                  )}
                  {breakdown.length > 0 &&
                    breakdown.map(([u, q]) => (
                      <Badge key={u} variant="light" color="gray" size="xs" radius="sm" tt="none">
                        {q.toLocaleString()} {lookupLabelOf(unitLabels, u, u)}
                      </Badge>
                    ))}
                </Group>
              )}
            </Stack>
          </Group>
        );
      }}
    />
  );
}
