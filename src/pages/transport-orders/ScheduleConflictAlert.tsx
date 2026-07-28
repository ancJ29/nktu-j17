import { Alert, Anchor, Group, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { formatDateTime } from '@/utils/dateFormat';
import { WHOLE_ORDER, type ScheduleConflict } from './scheduleConflicts';

export function ScheduleConflictAlert({
  conflicts,
}: {
  readonly conflicts: readonly ScheduleConflict[];
}) {
  const { t } = useTranslation();
  if (conflicts.length === 0) return null;

  const slotLabel = (tripIndex: number) =>
    tripIndex === WHOLE_ORDER
      ? t('transportOrders.conflicts.wholeOrder')
      : t('transportOrders.conflicts.leg', { n: tripIndex + 1 });

  const windowLabel = (c: ScheduleConflict) =>
    c.start === c.end
      ? formatDateTime(c.start)
      : `${formatDateTime(c.start)} → ${formatDateTime(c.end)}`;

  return (
    <Alert
      color="yellow"
      variant="light"
      icon={<IconAlertTriangle size={16} />}
      title={t('transportOrders.conflicts.title')}
    >
      <Stack gap={6}>
        {conflicts.map((c) => (
          <Group key={`${c.tripIndex}|${c.subject}|${c.orderId}`} gap={6} wrap="wrap">
            <Text fz="sm" fw={500}>
              {slotLabel(c.tripIndex)} ·{' '}
              {t(
                c.subject === 'truck'
                  ? 'transportOrders.columns.truck'
                  : 'transportOrders.form.driver',
              )}
            </Text>
            <Text fz="sm">{t('transportOrders.conflicts.overlapsWith')}</Text>
            <Anchor
              fz="sm"
              fw={500}
              href={ROUTES.TRANSPORT_ORDERS.DETAIL.replace(':id', c.orderId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {c.orderNumber}
            </Anchor>
            <Text fz="sm" c="dimmed">
              (
              {c.otherTripIndex === WHOLE_ORDER
                ? windowLabel(c)
                : `${slotLabel(c.otherTripIndex)}: ${windowLabel(c)}`}
              )
            </Text>
          </Group>
        ))}
        <Text fz="xs" c="dimmed">
          {t('transportOrders.conflicts.hint')}
        </Text>
      </Stack>
    </Alert>
  );
}
