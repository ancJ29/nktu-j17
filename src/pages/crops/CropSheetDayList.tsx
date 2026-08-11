import { Badge, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/dateFormat';
import { hasValue, type SheetRow } from '@/utils/cropSheetModel';

type Props = {
  readonly rows: SheetRow[];
  readonly todayDay?: number;
  readonly onOpenDay: (day: number) => void;
};

export function CropSheetDayList({ rows, todayDay, onOpenDay }: Props) {
  const { t } = useTranslation();

  return (
    <Stack gap={0}>
      {rows.map((row) => {
        const planned = row.cells.some((c) => hasValue(c.value));
        const isToday = row.day === todayDay;
        return (
          <UnstyledButton
            key={row.day}
            onClick={() => onOpenDay(row.day)}
            aria-label={t('crops.sheet.day.open', { day: row.day })}
            style={{
              padding: '10px 4px',
              borderTop: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <Group gap="sm" wrap="nowrap" align="center">
              <Text size="sm" fw={700} w={32} ta="center" c={isToday ? 'primary' : undefined}>
                {row.day}
              </Text>
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Group gap={6} wrap="nowrap">
                  <Text size="sm" fw={isToday ? 700 : 500} truncate>
                    {row.date
                      ? formatDate(row.date)
                      : t('crops.sheet.day.title', {
                          day: row.day,
                          total: rows.length,
                        })}
                  </Text>
                  {isToday && (
                    <Badge size="xs" radius="sm" variant="light" color="primary" tt="none">
                      {t('crops.sheet.day.today')}
                    </Badge>
                  )}
                </Group>
                {row.stage && (
                  <Text size="xs" c="dimmed" truncate>
                    {row.stage}
                  </Text>
                )}
              </Stack>
              {/* A day the process plans nothing for is the ordinary case, so the
                  dot marks work rather than marking its absence as a problem. */}
              {planned && <Badge size="6px" circle color="primary" variant="filled" />}
              <IconChevronRight size={14} opacity={0.5} />
            </Group>
          </UnstyledButton>
        );
      })}
    </Stack>
  );
}
