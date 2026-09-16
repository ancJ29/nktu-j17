import { Badge, Text, Tooltip } from '@mantine/core';
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
  return (
    <Tooltip
      withArrow
      multiline
      maw={280}
      label={
        <>
          <Text size="xs">
            {t('productInventory.recheck.tooltip', {
              count: counter,
              diff: `${diff > 0 ? '+' : ''}${diff.toLocaleString()}`,
            })}
          </Text>
          <Text size="xs" c="dimmed">
            {lastVerifiedAt
              ? t('productInventory.verify.lastVerified', { at: formatDateTime(lastVerifiedAt) })
              : t('productInventory.verify.neverVerified')}
          </Text>
        </>
      }
    >
      <Badge size={size} variant="light" color="orange" radius="sm" tt="lowercase">
        {t('productInventory.recheck.badge')}
      </Badge>
    </Tooltip>
  );
}
