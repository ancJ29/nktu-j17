import { Badge, Box, Group, Stack, Text } from '@mantine/core';
import { IconPackage } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ICON_MAP, IconName } from '@credo/base-ui/components';
import { EmployeeLink } from '@/components/EmployeeLink';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import type { ResolvedStatusOption } from '@/utils/permission';
import type { DateTimeInput, NullableDateTimeInput } from '@credo/kits/types';

export type ActivityTimelineEntry = {
  timestamp: DateTimeInput;
  userId?: string;
  note?: string;
};

function resolveStatusIcon(iconName?: string) {
  if (iconName) return ICON_MAP[iconName as IconName] ?? IconPackage;
  return IconPackage;
}

type ActivityTimelineProps<E extends ActivityTimelineEntry = ActivityTimelineEntry> = {
  statusFlowOrder: string[];
  currentFlowIndex: number;
  currentStatusValue: string;
  activityByStatus: Map<string, E>;
  resolveStatus: (value: string | undefined | null) => ResolvedStatusOption;
  
  deliveryDate?: NullableDateTimeInput;
  
  expectedDeliveryAtStatus?: string | null;
  
  labels?: {
    currentStatus?: string;
    pending?: string;
    expectedDelivery?: string;
  };
  
  showNotes?: boolean;
};

const DEFAULT_LABELS: Required<NonNullable<ActivityTimelineProps['labels']>> = {
  currentStatus: 'common.detail.currentStatus',
  pending: 'common.detail.pending',
  expectedDelivery: 'salesOrders.detail.expectedDelivery',
};

export function ActivityTimeline<E extends ActivityTimelineEntry = ActivityTimelineEntry>({
  statusFlowOrder,
  currentFlowIndex,
  currentStatusValue,
  activityByStatus,
  resolveStatus,
  deliveryDate,
  expectedDeliveryAtStatus = 'shipped',
  labels,
  showNotes = true,
}: ActivityTimelineProps<E>) {
  const { t } = useTranslation();
  const lbl = { ...DEFAULT_LABELS, ...labels };

  return (
    <Stack gap={0} p="md">
      {statusFlowOrder.map((statusValue, idx) => {
        const statusInfo = resolveStatus(statusValue);
        const isLast = idx === statusFlowOrder.length - 1;
        const isCurrent = statusValue === currentStatusValue;
        const isPending = currentFlowIndex < 0 ? idx > 0 : idx > currentFlowIndex;
        const isTerminal = statusInfo.stage === 'COMPLETED' || statusInfo.stage === 'EXCEPTIONAL';
        const showPendingLabel = isPending && !isTerminal;
        const entry = activityByStatus.get(statusValue);
        const StatusIcon = resolveStatusIcon(statusInfo.icon);

        return (
          <Group key={statusValue} gap="md" wrap="nowrap" align="stretch">
            {/* Timeline rail */}
            <Stack gap={0} align="center" style={{ width: 36, flexShrink: 0 }}>
              <Box
                w={36}
                h={36}
                style={{
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isPending
                    ? 'var(--mantine-color-gray-1)'
                    : `var(--mantine-color-${statusInfo.color}-light, var(--mantine-color-gray-1))`,
                  color: isPending
                    ? 'var(--mantine-color-gray-5)'
                    : `var(--mantine-color-${statusInfo.color}-6, var(--mantine-color-gray-6))`,
                  flexShrink: 0,
                }}
              >
                <StatusIcon size={16} />
              </Box>
              {!isLast && <Box w={2} style={{ flex: 1, minHeight: 24 }} bg="gray.3" />}
            </Stack>
            {/* Content */}
            <Stack gap={2} pb="lg" style={{ flex: 1, minWidth: 0 }}>
              <Group gap="xs" wrap="nowrap">
                <Text size="sm" fw={600} c={isPending ? 'dimmed' : undefined}>
                  {statusInfo.label}
                </Text>
                {isCurrent && (
                  <Badge size="xs" color={statusInfo.color} variant="filled">
                    {t(lbl.currentStatus as 'common.detail.currentStatus')}
                  </Badge>
                )}
                {showPendingLabel && (
                  <Badge size="xs" color="gray" variant="light">
                    {t(lbl.pending as 'common.detail.pending')}
                  </Badge>
                )}
              </Group>
              {entry ? (
                <>
                  {entry.userId && <EmployeeLink id={entry.userId} size="xs" />}
                  {showNotes && entry.note && (
                    <Text size="xs" c="dimmed" fs="italic">
                      {entry.note}
                    </Text>
                  )}
                  <Text size="xs" c="dimmed" ff="monospace">
                    {formatDateTime(entry.timestamp)}
                  </Text>
                </>
              ) : isPending &&
                expectedDeliveryAtStatus !== null &&
                statusValue === expectedDeliveryAtStatus &&
                deliveryDate ? (
                <Text size="xs" c="dimmed">
                  {t(lbl.expectedDelivery as 'salesOrders.detail.expectedDelivery', {
                    date: formatDate(deliveryDate),
                  })}
                </Text>
              ) : showPendingLabel ? (
                <Text size="xs" c="dimmed">
                  {t(lbl.pending as 'common.detail.pending')}
                </Text>
              ) : null}
            </Stack>
          </Group>
        );
      })}
    </Stack>
  );
}
