

import { Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { InventorySecondaryStatus } from '@/types';

const STATUS_COLOR: Record<InventorySecondaryStatus, string> = {
  outOfStock: 'red',
  mustOrder: 'orange',
  ok: 'green',
};

type Props = {
  readonly status: InventorySecondaryStatus;
  
  readonly size?: 'xs' | 'sm' | 'md';
};

export function InventorySecondaryStatusBadge({ status, size = 'sm' }: Props) {
  const { t } = useTranslation();
  return (
    <Badge size={size} variant="light" color={STATUS_COLOR[status]} radius="sm" tt="none">
      {t(`common.secondaryStatus.${status}`)}
    </Badge>
  );
}
