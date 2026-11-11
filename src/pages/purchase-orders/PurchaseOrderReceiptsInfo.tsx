import { Alert, Badge, Group, Stack } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { GoodsReceiptLink } from '@/components/GoodsReceiptLink';
import { findStatus as findReceiptStatus } from '@/pages/goods-receipts/goodsReceiptStatuses';
import type { GoodsReceipt } from '@/types';
import { liveReceipt } from './purchaseOrderReceipts';

export function PurchaseOrderReceiptsInfo({
  receipts,
}: {
  readonly receipts: readonly GoodsReceipt[];
}) {
  const { t } = useTranslation();

  const liveCount = receipts.filter(liveReceipt).length;
  return (
    <Stack gap="xs">
      {liveCount > 1 && (
        <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />}>
          {t('purchaseOrders.detail.severalLiveReceipts')}
        </Alert>
      )}
      {receipts.map((r) => {
        const st = findReceiptStatus(r.status);
        return (
          <Group key={r.id} gap="sm">
            <GoodsReceiptLink id={r.id} fallbackLabel={r.receiptNumber} />
            <Badge variant="light" color={st.color}>
              {t(st.labelKey)}
            </Badge>
          </Group>
        );
      })}
    </Stack>
  );
}
