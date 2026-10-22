import { Group, Stack, Text, Title } from '@mantine/core';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActiveBadge } from '@/components/badges';
import { TimestampLine } from '@/components/TimestampLine';
import type { MasterDataFormValues, MasterDataRow, MasterDataSpec } from './spec';

export function MasterDataDetailHeader<
  Row extends MasterDataRow,
  Values extends MasterDataFormValues,
>({
  spec,
  row,
  showTimestamps = true,
}: {
  readonly spec: MasterDataSpec<Row, Values>;
  readonly row: Row;

  readonly showTimestamps?: boolean;
}) {
  const { t } = useTranslation();
  const text = useMemo(() => spec.text(t), [spec, t]);
  const { secondary, tag } = spec.useHeaderText(row);

  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <Stack gap={4} style={{ minWidth: 0 }}>
        <Title order={3} lineClamp={2}>
          {row.name}
        </Title>
        <Group gap="xs" wrap="wrap">
          <Text size="sm" fw={600} c="dimmed" ff="monospace">
            {row.code}
          </Text>
          {secondary ? (
            <>
              <Text size="xs" c="dimmed">
                ·
              </Text>
              <Text size="sm" c="dimmed">
                {secondary}
              </Text>
            </>
          ) : null}
          <ActiveBadge
            isActive={row.isActive}
            activeLabel={text.statusLabels?.active ?? t('__new__.01-common.labels.active')}
            inactiveLabel={text.statusLabels?.inactive ?? t('__new__.01-common.labels.inactive')}
            size="sm"
          />
          {tag ? (
            <Text size="sm" c="dimmed">
              {tag}
            </Text>
          ) : null}
        </Group>
      </Stack>
      {showTimestamps && (
        <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
          <TimestampLine updatedAt={row.updatedAt} createdAt={row.createdAt} />
        </Stack>
      )}
    </Group>
  );
}
