import { Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { PRODUCT_BREAKDOWN_SET_COLOR, PRODUCT_SET_COLOR } from '@/config/misc';
import type { Product } from '@/types';
import { isBreakdownSet, isProductSet } from '@/utils/productSet';

export function ProductSetBadge({
  product,
  variant = 'light',
  tt,
}: {
  readonly product: Product;
  readonly variant?: 'light' | 'filled';

  readonly tt?: 'none';
}) {
  const { t } = useTranslation();
  if (!isProductSet(product)) return null;
  const breakdown = isBreakdownSet(product);
  return (
    <Badge
      size="xs"
      variant={variant}
      color={breakdown ? PRODUCT_BREAKDOWN_SET_COLOR : PRODUCT_SET_COLOR}
      radius="sm"
      tt={tt}
    >
      {t(breakdown ? 'products.detail.breakdownBadge' : 'products.detail.setBadge')}
    </Badge>
  );
}
