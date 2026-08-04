import { Group, Stack, Text } from '@mantine/core';
import type { TruckAssetExtra } from '@/types';
import { expirySummary, type ExpiryEntry } from './truckExpiry';

type Props = {
  readonly extra: TruckAssetExtra | undefined;
  readonly todayIso: string;
  readonly t: (key: string) => string;
  readonly formatDate: (iso: string) => string;

  readonly urgentOnly?: boolean;
};

export function TruckExpiryLines({ extra, todayIso, t, formatDate, urgentOnly }: Props) {
  const summary = expirySummary(extra, todayIso);
  if (!summary)
    return urgentOnly ? null : (
      <Text size="sm" c="dimmed">
        —
      </Text>
    );
  if (urgentOnly && !summary.urgent) return null;

  return (
    <Stack gap={2}>
      {summary.visible.map((entry) => (
        <ExpiryLine
          key={`${entry.date}-${entry.kindKey}-${entry.detail ?? ''}`}
          entry={entry}
          t={t}
          formatDate={formatDate}
        />
      ))}
      {summary.hiddenCount > 0 && (
        <Text size="xs" c="dimmed" fw={600}>
          {`+${summary.hiddenCount}`}
        </Text>
      )}
    </Stack>
  );
}

function ExpiryLine({
  entry,
  t,
  formatDate,
}: {
  entry: ExpiryEntry;
  t: (key: string) => string;
  formatDate: (iso: string) => string;
}) {
  const color = entry.expired ? 'red' : entry.daysLeft <= 30 ? 'orange' : undefined;
  const label = entry.detail ? `${t(entry.kindKey)} · ${entry.detail}` : t(entry.kindKey);

  return (
    <Group gap={6} wrap="nowrap" align="baseline">
      <Text size="sm" c={color} fw={color ? 600 : undefined} style={{ flexShrink: 0 }}>
        {formatDate(entry.date)}
      </Text>
      <Text size="xs" c="dimmed" lineClamp={1}>
        {label}
        {entry.expired ? ` · ${t('assets.truck.expiry.expired')}` : ''}
      </Text>
    </Group>
  );
}
