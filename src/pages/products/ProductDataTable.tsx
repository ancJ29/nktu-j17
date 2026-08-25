import React, { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Badge, Group, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core';
import { IconPackageOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { Product } from '@/types';
import { CodeLabel, ColorBadge, DataTable } from '@credo/base-ui/components';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';
import { getItemBaseUnit } from '@/utils/unitConversion';
import { ProductThumb } from './ProductThumb';
import {
  hasImagesForProducts,
  isPriceManagementEnabled,
  isProductInventoryEnabled,
  perms,
  tableDensity,
} from '@/utils/permission';
import { ActiveBadge } from '@/components/badges';
import { isNoInventoryProduct } from '@/utils/productSet';
import { ProductSetBadge } from '@/components/ProductSetBadge';
import { formatNumber } from '@/utils/number';

const inventoryEnabled = isProductInventoryEnabled();

const priceVisible = isPriceManagementEnabled() && perms.product.canViewPrice();
const imagesEnabled = hasImagesForProducts();

type ProductDataTableProps = {
  readonly products: Product[];
  readonly isLoading?: boolean;
  readonly onHandByCode?: Map<string, number>;
  readonly viewportRef?: React.Ref<HTMLDivElement>;
  readonly hasMore?: boolean;
  readonly onLoadMore?: () => void;
  readonly loadingMoreLabel?: string;
};

export function ProductDataTable({
  products,
  isLoading,
  onHandByCode,
  viewportRef,
  hasMore,
  onLoadMore,
  loadingMoreLabel,
}: ProductDataTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const unitLabels = useLookupV2Labels('unit');

  const categoryLabels = useLookupV2Labels('product-category');

  const columns = useMemo(
    () =>
      [
        {
          key: 'name',
          header: t('common.labels.name'),
          width: '250px',
          render: (item: Product) => {
            const altNames = item.extra?.alternativeNames ?? [];
            return (
              <Group gap="lg" wrap="nowrap">
                {imagesEnabled && <ProductThumb product={item} size={48} />}
                <Stack gap={2}>
                  <Group gap="xs" wrap="nowrap">
                    <Text fz="md" fw={600} lh={1.25}>
                      {item.name}
                    </Text>
                    <ProductSetBadge product={item} />
                    {isNoInventoryProduct(item) && (
                      <Tooltip label={t('products.detail.noInventoryBadge')} withArrow>
                        <ThemeIcon size="sm" variant="light" color="gray" radius="sm">
                          <IconPackageOff size={12} />
                        </ThemeIcon>
                      </Tooltip>
                    )}
                  </Group>
                  <CodeLabel code={item.extra?.sku} />
                  {altNames.length > 0 && (
                    <Text size="xs" c="dimmed" lh={1.2} lineClamp={1}>
                      {altNames.join(', ')}
                    </Text>
                  )}
                </Stack>
              </Group>
            );
          },
        },
        {
          key: 'category',
          width: '200px',
          header: t('common.labels.category'),
          render: (item: Product) => (
            <ColorBadge label={lookupLabelOf(categoryLabels, item.extra.category)} size="sm" />
          ),
        },
        ...(priceVisible
          ? [
              {
                key: 'basePrice',
                ta: 'right' as const,
                width: '140px',
                header: t('__new__.07-entities.products.labels.basePriceLabel'),
                render: (item: Product) => (
                  <Text size="sm" fw={600} ta="right">
                    {formatNumber(item.extra?.basePrice)}
                  </Text>
                ),
              },
              {
                key: 'price',
                ta: 'right' as const,
                width: '140px',
                header: t('common.columns.price'),
                render: (item: Product) => (
                  <Text size="sm" fw={600} ta="right">
                    {formatNumber(item.price)}
                  </Text>
                ),
              },
              {
                key: 'suggestedPrice',
                ta: 'right' as const,
                width: '140px',
                header: t('products.form.suggestedPriceLabel'),
                render: (item: Product) => (
                  <Text size="sm" fw={600} ta="right">
                    {formatNumber(item.extra?.suggestedPrice)}
                  </Text>
                ),
              },
            ]
          : []),
        ...(inventoryEnabled
          ? [
              {
                key: 'onHand',
                ta: 'right',
                width: '200px',
                header: t('common.columns.onHand'),
                render: (item: Product) => {
                  const onHand = onHandByCode?.get(item.code) ?? 0;
                  const minInv = item.extra?.minimumInventory;
                  const minValue = minInv?.value;
                  const isLow = typeof minValue === 'number' && onHand > 0 && onHand <= minValue;
                  const isNegative = onHand < 0;
                  const baseUnit = getItemBaseUnit(item);
                  return (
                    <Stack gap={2} align="flex-end">
                      <Group gap={4} wrap="nowrap" justify="left" align="baseline">
                        <Text
                          size="sm"
                          fw={600}
                          c={isNegative ? 'red' : isLow ? 'orange' : undefined}
                        >
                          {onHand.toLocaleString()}
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
                      {minInv && typeof minValue === 'number' && (
                        <Group gap={4} wrap="nowrap" align="baseline">
                          <Text size="xs" c="dimmed">
                            {t('products.columns.minimumInventory')}:
                          </Text>
                          <Text size="xs" c="dimmed" fw={500}>
                            {minValue.toLocaleString()}
                          </Text>
                          {minInv.unit && (
                            <Text size="xs" c="dimmed">
                              {lookupLabelOf(unitLabels, minInv.unit)}
                            </Text>
                          )}
                        </Group>
                      )}
                    </Stack>
                  );
                },
              },
            ]
          : []),
        {
          key: 'status',
          header: t('__new__.01-common.labels.status'),
          ta: 'right',
          render: (item: Product) => (
            <Group gap="xs" wrap="nowrap" justify="flex-end" align="baseline">
              <ActiveBadge
                isActive={item.isActive}
                activeLabel={t('products.status.active')}
                inactiveLabel={t('__new__.01-common.labels.inactive')}
                size="sm"
              />
            </Group>
          ),
        },
      ] as {
        key: string;
        header: string;
        render: (item: Product) => React.ReactNode;
        ta?: 'left' | 'center' | 'right';
      }[],
    [t, onHandByCode, unitLabels, categoryLabels],
  );

  const handleRowClick = (item: Product) => {
    navigate(ROUTES.PRODUCTS.DETAIL.replace(':id', item.id));
  };

  return (
    <DataTable
      withIndex
      noActions
      density={tableDensity()}
      maxHeight="calc(100vh - 250px)"
      viewportRef={viewportRef}
      data={products as (Product & Record<string, unknown>)[]}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('products.noItems')}
      onRowClick={handleRowClick}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      loadingMoreLabel={loadingMoreLabel}
    />
  );
}
