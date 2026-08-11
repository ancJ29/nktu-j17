import { Badge, Box, Button, Group, Stack, Table, Text, TextInput } from '@mantine/core';
import { IconRotate2 } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { formatDate } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import type { SheetDayLine, SheetDayView } from '@/utils/cropSheetModel';
import type { CropDiaryEntry } from '@/types';

type Props = {
  readonly view: SheetDayView | null;

  readonly events?: CropDiaryEntry[];
  readonly onClose: () => void;
  readonly editable: boolean;
  readonly dirty: boolean;
  readonly saving: boolean;
  readonly onCellChange: (day: number, columnKey: string, raw: string) => void;

  readonly onReset?: (day: number) => void;
  readonly onSave: () => void;
};

export function CropSheetDayModal({
  view,
  events,
  onClose,
  editable,
  dirty,
  saving,
  onCellChange,
  onReset,
  onSave,
}: Props) {
  const { t } = useTranslation();

  return (
    <ResponsiveModal
      opened={view !== null}
      onClose={onClose}
      size="lg"
      title={
        view && (
          <Group gap="xs" wrap="wrap">
            <Text fw={700} size="sm">
              {t('crops.sheet.day.title', { day: view.day, total: view.totalDays })}
            </Text>
            {view.stage && (
              <Badge variant="light" color="primary" size="sm" radius="sm" tt="none">
                {view.stage}
              </Badge>
            )}
            {view.changed && (
              <Badge variant="light" color="orange" size="sm" radius="sm" tt="none">
                {t('crops.sheet.day.changed')}
              </Badge>
            )}
          </Group>
        )
      }
    >
      {view && (
        <Stack gap="md">
          {(view.date || view.weekday) && (
            <Text size="xs" c="dimmed">
              {[view.weekday, view.date && formatDate(view.date)].filter(Boolean).join(' · ')}
            </Text>
          )}

          {view.empty && (
            <Text size="sm" c="dimmed">
              {t('crops.sheet.day.noWork')}
            </Text>
          )}

          {view.doses.map((group, i) => (
            <DayLineTable
              key={group.name ?? `_${i}`}
              title={group.name ?? t('crops.sheet.day.otherDoses')}
              lines={group.lines}
              day={view.day}
              editable={editable}
              onCellChange={onCellChange}
            />
          ))}

          {view.measures.length > 0 && (
            <DayLineTable
              title={t('crops.sheet.day.measures')}
              lines={view.measures}
              day={view.day}
              editable={editable}
              onCellChange={onCellChange}
            />
          )}

          {view.notes.length > 0 && (
            <Stack gap="xs">
              <SectionLabel>{t('crops.sheet.day.notes')}</SectionLabel>
              {view.notes.map((line) => (
                <TextInput
                  key={line.column.key}
                  size="xs"
                  label={line.column.label || line.column.key}
                  readOnly={!editable}
                  value={String(line.value ?? '')}
                  onChange={(e) => onCellChange(view.day, line.column.key, e.currentTarget.value)}
                  styles={
                    line.changed
                      ? { input: { fontWeight: 700, color: 'var(--mantine-color-orange-7)' } }
                      : undefined
                  }
                />
              ))}
            </Stack>
          )}

          {events && events.length > 0 && (
            <Stack gap={4}>
              <SectionLabel>{t('crops.sheet.day.events')}</SectionLabel>
              {events.map((event) => (
                <Text key={event.id} size="sm">
                  {event.activity}
                  {event.extra?.notes && (
                    <Text span size="xs" c="dimmed">
                      {' — '}
                      {event.extra.notes}
                    </Text>
                  )}
                </Text>
              ))}
            </Stack>
          )}

          <Group justify="space-between" gap="sm" wrap="wrap">
            {editable && view.changed && onReset ? (
              <Button
                size="compact-sm"
                variant="subtle"
                color="orange"
                leftSection={<IconRotate2 size={14} />}
                onClick={() => onReset(view.day)}
              >
                {t('crops.sheet.day.reset')}
              </Button>
            ) : (
              <span />
            )}
            <Group gap="sm">
              <Button variant="default" size="sm" onClick={onClose} disabled={saving}>
                {t('__new__.01-common.actions.close')}
              </Button>
              {editable && (
                <Button size="sm" loading={saving} disabled={!dirty} onClick={onSave}>
                  {t('__new__.01-common.actions.save')}
                </Button>
              )}
            </Group>
          </Group>
        </Stack>
      )}
    </ResponsiveModal>
  );
}

function SectionLabel({ children }: { readonly children: React.ReactNode }) {
  return (
    <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: 0.3 }}>
      {children}
    </Text>
  );
}

function DayLineTable({
  title,
  lines,
  day,
  editable,
  onCellChange,
}: {
  readonly title: string;
  readonly lines: SheetDayLine[];
  readonly day: number;
  readonly editable: boolean;
  readonly onCellChange: (day: number, columnKey: string, raw: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <Stack gap={4}>
      <SectionLabel>{title}</SectionLabel>
      <Table verticalSpacing={4} horizontalSpacing={8} withRowBorders={false}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th />
            <Table.Th w={110}>
              <Text size="10px" c="dimmed" tt="uppercase" fw={600} ta="center">
                {t('crops.sheet.day.dose')}
              </Text>
            </Table.Th>
            <Table.Th w={130}>
              <Text size="10px" c="dimmed" tt="uppercase" fw={600} ta="right">
                {t('crops.sheet.day.amount')}
              </Text>
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {lines.map((line) => (
            <Table.Tr key={line.column.key}>
              <Table.Td>
                <Text size="sm" fw={500} lh={1.2}>
                  {line.column.label || line.column.key}
                </Text>
              </Table.Td>
              <Table.Td>
                <TextInput
                  size="xs"
                  ta="center"
                  readOnly={!editable}
                  aria-label={`${line.column.label || line.column.key} — ${t('crops.sheet.day.dose')}`}
                  value={String(line.value ?? '')}
                  onChange={(e) => onCellChange(day, line.column.key, e.currentTarget.value)}
                  styles={
                    line.changed
                      ? { input: { fontWeight: 700, color: 'var(--mantine-color-orange-7)' } }
                      : undefined
                  }
                />
              </Table.Td>
              <Table.Td>
                <Amount line={line} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

function Amount({ line }: { readonly line: SheetDayLine }) {
  if (line.amount === undefined) {
    return (
      <Text size="sm" c="dimmed" ta="right">
        —
      </Text>
    );
  }
  return (
    <Box ta="right">
      <Text size="lg" fw={800} lh={1.1}>
        {formatNumber(Number(line.amount.toFixed(2)))}
      </Text>
      {line.column.unit && (
        <Text size="10px" c="dimmed" lh={1.2}>
          {line.column.unit}
        </Text>
      )}
    </Box>
  );
}
