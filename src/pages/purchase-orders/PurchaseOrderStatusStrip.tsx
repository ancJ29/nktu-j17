import { Box, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import {
  IconCheck,
  IconClipboardList,
  IconSend,
  IconTruckDelivery,
  IconX,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/utils/dateFormat';
import type { PurchaseOrder } from '@/types';
import { poStatus } from './purchaseOrderModel';

export function PurchaseOrderStatusStrip({
  order,
  compact,
}: {
  readonly order: PurchaseOrder;
  readonly compact: boolean;
}) {
  const { t } = useTranslation();
  const status = poStatus(order);
  const isReady = status === 'ready';
  const isReceived = status === 'received';
  const isCancelled = status === 'cancelled';

  const wasReady = !!order.readyAt || isReceived;

  return (
    <Box
      style={{
        background: 'var(--mantine-color-gray-0)',
        borderRadius: 'var(--mantine-radius-md)',
        padding: compact ? '12px 14px' : '14px 18px',
        border: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Group gap={compact ? 10 : 16} wrap="nowrap" align="center">
        <Node
          label={t('purchaseOrders.statuses.draft')}
          icon={<IconClipboardList size={14} />}
          color="gray"
          filled={status === 'draft'}
          timestamp={order.createdAt}
          compact={compact}
        />
        <Line done={isReady || wasReady} />
        <Node
          label={t('purchaseOrders.statuses.ready')}
          icon={isReady ? <IconCheck size={14} /> : <IconSend size={14} />}
          color="blue"
          filled={isReady}
          muted={!isReady && !wasReady}
          timestamp={order.readyAt}
          compact={compact}
        />
        {!isCancelled && (
          <>
            <Line done={isReceived} />
            <Node
              label={t('purchaseOrders.statuses.received')}
              icon={isReceived ? <IconCheck size={14} /> : <IconTruckDelivery size={14} />}
              color="green"
              filled={isReceived}
              muted={!isReceived}
              timestamp={order.receivedAt ?? undefined}
              compact={compact}
            />
          </>
        )}
        {isCancelled && (
          <>
            <Line done={false} cancelled />
            <Node
              label={t('purchaseOrders.statuses.cancelled')}
              icon={<IconX size={14} />}
              color="red"
              filled
              timestamp={order.cancelledAt}
              compact={compact}
            />
          </>
        )}
      </Group>
    </Box>
  );
}

function Node({
  label,
  icon,
  color,
  filled,
  muted,
  timestamp,
  compact,
}: {
  readonly label: string;
  readonly icon: ReactNode;
  readonly color: string;
  readonly filled: boolean;
  readonly muted?: boolean;
  readonly timestamp?: string | undefined;
  readonly compact: boolean;
}) {
  return (
    <Stack gap={2} align="center" style={{ minWidth: compact ? 64 : 90 }}>
      <ThemeIcon
        size={compact ? 28 : 32}
        radius="xl"
        color={muted ? 'gray' : color}
        variant={filled ? 'filled' : muted ? 'outline' : 'light'}
      >
        {icon}
      </ThemeIcon>
      <Text size="xs" fw={filled ? 700 : 500} c={muted ? 'dimmed' : undefined} ta="center" lh={1.1}>
        {label}
      </Text>
      {timestamp && !muted && (
        <Text size="10px" c="dimmed" ta="center" lh={1.1} style={{ whiteSpace: 'nowrap' }}>
          {formatDateTime(timestamp)}
        </Text>
      )}
    </Stack>
  );
}

function Line({ done, cancelled }: { readonly done: boolean; readonly cancelled?: boolean }) {
  return (
    <Box
      style={{
        flex: 1,
        minWidth: 18,
        marginTop: 14,
        height: done ? 2 : 0,
        background: done ? 'var(--mantine-color-green-5)' : 'transparent',
        borderTop: done
          ? 'none'
          : `2px dashed var(--mantine-color-${cancelled ? 'red-4' : 'gray-4'})`,
      }}
    />
  );
}
