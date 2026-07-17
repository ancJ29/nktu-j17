import { ActionIcon, Badge, Card, Group, Skeleton, Stack, Text, Tooltip } from '@mantine/core';
import { IconCopy, IconListDetails } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import type { GoodsReceipt } from '@/types';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { findStatus } from './goodsReceiptStatuses';
import { isLocationsEnabled } from '@/utils/permission';

const locationsEnabled = isLocationsEnabled();

type Props = {
  readonly receipts: GoodsReceipt[];
  readonly isLoading?: boolean;
  
  readonly onShowItems?: (receipt: GoodsReceipt) => void;
};

function CardSkeleton() {
  return (
    <Card withBorder padding="sm">
      <Stack gap="xs">
        <Group justify="space-between">
          <Skeleton h={16} w="60%" />
          <Skeleton h={20} w={60} radius="xl" />
        </Group>
        <Skeleton h={12} w="40%" />
        <Skeleton h={12} w="70%" />
        <Skeleton h={12} w="50%" />
      </Stack>
    </Card>
  );
}

export function GoodsReceiptCardList({ receipts, isLoading, onShowItems }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  
  const employees = useEmployeeStore((s) => s.items);

  if (isLoading) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 5 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </Stack>
    );
  }

  if (receipts.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl" size="sm">
        {t('goodsReceipts.noItems')}
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {receipts.map((r) => {
        const totalQuantity = r.items.reduce((acc, curr) => acc + curr.quantity, 0);
        const status = findStatus(r.status);
        
        
        
        const hasReceivedAt = !!r.receivedAt;
        const dateText = hasReceivedAt ? formatDateTime(r.receivedAt!) : formatDate(r.receivedDate);
        const dateLabel = t(
          hasReceivedAt
            ? 'goodsReceipts.columns.dateLabelReceived'
            : 'goodsReceipts.columns.dateLabelExpected',
        );

        const assignedId = r.extra?.assignedTo;
        const assignedName = assignedId
          ? (employees.find((e) => e.id === assignedId)?.name ?? null)
          : null;

        
        
        
        const metaLine = [`${dateLabel} ${dateText}`, locationsEnabled ? r.locationName : null]
          .filter(Boolean)
          .join(' · ');

        return (
          <Card
            key={r.id}
            withBorder
            padding="sm"
            onClick={() => navigate(ROUTES.GOODS_RECEIPTS.DETAIL.replace(':id', r.id))}
            style={{ cursor: 'pointer' }}
          >
            <Stack gap={6}>
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Group gap={6} wrap="nowrap" align="center">
                    <Text fw={700} size="md" truncate>
                      {r.receiptNumber}
                    </Text>
                    {r.extra?.copyFromId && (
                      <IconCopy size={12} color="var(--mantine-color-dimmed)" />
                    )}
                  </Group>
                  {r.reference && (
                    <Text size="xs" c="dimmed" ff="monospace" lineClamp={1}>
                      {r.reference}
                    </Text>
                  )}
                </Stack>
                <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                  <Badge color={status.color} variant="light">
                    {t(status.labelKey)}
                  </Badge>
                  {onShowItems && (
                    <Tooltip label={t('goodsReceipts.detail.viewItems')} withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label={t('goodsReceipts.detail.viewItems')}
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowItems(r);
                        }}
                      >
                        <IconListDetails size={18} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Group>

              <Text size="sm" fw={600} lh={1.25} truncate>
                {r.vendorName}
              </Text>

              <Text size="xs" c="dimmed" lh={1.3}>
                {metaLine}
              </Text>

              {totalQuantity > 0 && (
                <Text size="xs" lh={1.3}>
                  <Text span size="xs" c="dimmed">
                    {t('goodsReceipts.columns.itemsCount', { count: r.items.length })}
                    {' · '}
                  </Text>
                  {totalQuantity.toLocaleString()} {t('common.labels.units')}
                </Text>
              )}

              {assignedName && (
                <Text size="xs" c="dimmed" lh={1.3} truncate>
                  {t('goodsReceipts.columns.assignedTo')}: {assignedName}
                </Text>
              )}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
