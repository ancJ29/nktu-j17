import { Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/utils/dateFormat';

type Props = {
  
  readonly counter: number;
  
  readonly diff: number;
  
  readonly lastVerifiedAt?: number | null;
  readonly size?: 'xs' | 'sm';
};

export function InventoryRecheckBadge({ counter, diff, lastVerifiedAt, size = 'xs' }: Props) {
  const { t } = useTranslation();
  const title = [
    t('productInventory.recheck.tooltip', {
      count: counter,
      diff: `${diff > 0 ? '+' : ''}${diff.toLocaleString()}`,
    }),
    lastVerifiedAt
      ? t('productInventory.verify.lastVerified', { at: formatDateTime(lastVerifiedAt) })
      : t('productInventory.verify.neverVerified'),
  ].join('\n');
  return (
    <Badge size={size} variant="light" color="orange" radius="sm" tt="lowercase" title={title}>
      {t('productInventory.recheck.badge')}
    </Badge>
  );
}
