import { Badge, Card, Group, Skeleton, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core';
import { IconPackage, IconPackageOff } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { CodeLabel, ColorBadge, InfiniteScrollSentinel } from '@credo/base-ui/components';
import { ActiveBadge } from '@/components/badges';
import type { Product } from '@/types';
import { hasImagesForProducts, isProductInventoryEnabled } from '@/utils/permission';
import { lookupLabelOf, useLookupLabels } from '@/hooks';
import { ProductThumb } from './ProductThumb';
import { isProductSet, isNoInventoryProduct } from '@/utils/productSet';
import { PRODUCT_SET_COLOR } from '@/config/misc';

const inventoryEnabled = isProductInventoryEnabled();
const imagesEnabled = hasImagesForProducts();

type ProductCardListProps = {
  readonly products: Product[];
  readonly isLoading?: boolean;
  readonly onHandByCode?: Map<string, number>;
  readonly hasMore?: boolean;
  readonly onLoadMore?: () => void;
  readonly loadingMoreLabel?: string;
};

function ProductCardSkeleton() {
  return (
    <Card withBorder padding="md" radius="md">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        {imagesEnabled && <Skeleton h={48} w={48} radius="md" />}
        <Stack gap={8} style={{ flex: 1 }}>
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <Skeleton h={14} w="55%" />
            <Skeleton h={18} w={68} radius="xl" />
          </Group>
          <Skeleton h={10} w="75%" />
          <Skeleton h={18} w={90} radius="sm" />
          <Group justify="space-between" wrap="nowrap" align="flex-end">
            <Skeleton h={22} w={84} />
            <Skeleton h={10} w={70} />
          </Group>
        </Stack>
      </Group>
    </Card>
  );
}

export function ProductCardList({
  products,
  isLoading,
  onHandByCode,
  hasMore = false,
  onLoadMore,
  loadingMoreLabel,
}: ProductCardListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const categoryLabels = useLookupLabels('product-category');

  if (isLoading) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 5 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </Stack>
    );
  }

  if (products.length === 0) {
    return (
      <Card withBorder padding="xl" radius="md">
        <Stack align="center" gap="sm" py="md">
          <ThemeIcon size={56} radius="xl" variant="light" color="gray">
            <IconPackage size={28} stroke={1.5} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            {t('products.emptyTitle')}
          </Text>
          <Text size="xs" c="dimmed" ta="center" maw={260}>
            {t('products.emptyMessage')}
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="sm">
      {products.map((item) => {
        const sku = item.extra?.sku;
        const category = item.extra?.category;
        const altNames = item.extra?.alternativeNames ?? [];
        const onHand = inventoryEnabled ? (onHandByCode?.get(item.code) ?? 0) : null;
        const minInv = item.extra?.minimumInventory;
        const minValue = minInv?.value;
        const isLow =
          onHand !== null && typeof minValue === 'number' && onHand > 0 && onHand <= minValue;
        const isNegative = onHand !== null && onHand < 0;

        const accent = isNegative
          ? 'var(--mantine-color-red-6)'
          : isLow
            ? 'var(--mantine-color-orange-5)'
            : null;

        return (
          <Card
            key={item.id}
            withBorder
            padding="md"
            radius="md"
            onClick={() => navigate(ROUTES.PRODUCTS.DETAIL.replace(':id', item.id))}
            style={{
              cursor: 'pointer',
              ...(accent && {
                borderLeftWidth: 3,
                borderLeftColor: accent,

                paddingLeft: 'calc(var(--mantine-spacing-md) - 2px)',
              }),
            }}
          >
            <Group gap="sm" wrap="nowrap" align="flex-start">
              {imagesEnabled && <ProductThumb product={item} size={48} radius={10} />}
              <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
                {/* Name allows two lines via `lineClamp` so long Vietnamese
                    names don't get chopped mid-word on narrow screens. */}
                <Text fw={700} size="sm" lh={1.3} lineClamp={2}>
                  {item.name}
                </Text>

                {/* Identifiers strip — SKU (monospace) and alt names live on
                    one dimmed line, separated by a middle dot. Truncates so
                    very long alt-name lists don't push the card wider on
                    narrow viewports. */}
                {(sku || altNames.length > 0) && (
                  <Group gap={6} wrap="nowrap" align="baseline" style={{ minWidth: 0 }}>
                    {sku && <CodeLabel code={sku} size="xs" />}
                    {sku && altNames.length > 0 && (
                      <Text size="xs" c="dimmed" lh={1.2}>
                        ·
                      </Text>
                    )}
                    {altNames.length > 0 && (
                      <Text size="xs" c="dimmed" lh={1.2} truncate>
                        {altNames.join(', ')}
                      </Text>
                    )}
                  </Group>
                )}

                {/* Category + set marker on their own line as compact chips —
                    the colored taxonomy signal, kept out of the header
                    cluster. Status lives top-right (always visible). */}
                {(category || isProductSet(item) || isNoInventoryProduct(item)) && (
                  <Group gap={6} wrap="wrap" align="center">
                    {category && (
                      <ColorBadge label={lookupLabelOf(categoryLabels, category)} size="sm" />
                    )}
                    {isProductSet(item) && (
                      <Badge size="xs" color={PRODUCT_SET_COLOR} radius="sm" tt="none">
                        {t('products.detail.setBadge')}
                      </Badge>
                    )}
                    {isNoInventoryProduct(item) && (
                      <Tooltip label={t('products.detail.noInventoryBadge')} withArrow>
                        <ThemeIcon size="sm" variant="light" color="gray" radius="sm">
                          <IconPackageOff size={12} />
                        </ThemeIcon>
                      </Tooltip>
                    )}
                  </Group>
                )}
              </Stack>

              {/* Status badge pinned top-right, always rendered — independent
                  of whether the product has a category. */}
              <ActiveBadge
                isActive={item.isActive}
                activeLabel={t('products.status.active')}
                inactiveLabel={t('__new__.01-common.labels.inactive')}
                size="sm"
                style={{ flexShrink: 0 }}
              />
            </Group>
          </Card>
        );
      })}

      {onLoadMore && (
        <InfiniteScrollSentinel
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          renderedCount={products.length}
          label={loadingMoreLabel}
        />
      )}
    </Stack>
  );
}
