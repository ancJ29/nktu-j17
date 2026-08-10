import { Box, Table, Text, TextInput } from '@mantine/core';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { stageOf } from '@/utils/cropSheetModel';
import type { SheetColumn, SheetDay, SheetStage } from '@/types';

type Props = {
  readonly columns: SheetColumn[];
  readonly days: SheetDay[];
  readonly stages: SheetStage[];
  readonly onChange: (days: SheetDay[]) => void;
};

export function ProcessGridEditor({ columns, days, stages, onChange }: Props) {
  const { t } = useTranslation();

  const stageNameFor = useMemo(() => {
    const map = new Map<number, string>();
    for (const day of days) {
      const stage = stageOf(day.day, stages);

      if (stage && stage.fromDay === day.day) map.set(day.day, stage.name);
    }
    return map;
  }, [days, stages]);

  const setCell = useCallback(
    (day: number, key: string, raw: string) => {
      onChange(
        days.map((d) => {
          if (d.day !== day) return d;
          const values = { ...d.values };
          const trimmed = raw.trim();
          if (!trimmed) delete values[key];
          else {
            const n = Number(trimmed.replace(/,/g, ''));
            values[key] = trimmed !== '' && Number.isFinite(n) ? n : raw;
          }
          return { day: d.day, values };
        }),
      );
    },
    [days, onChange],
  );

  if (!columns.length) {
    return (
      <Text size="xs" c="dimmed">
        {t('cropDiaryTemplates.plan.gridNeedsColumns')}
      </Text>
    );
  }

  return (
    <Box style={{ overflowX: 'auto' }}>
      <Table striped withTableBorder verticalSpacing={2} horizontalSpacing={4} miw={640}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={54} style={STICKY_DAY}>
              {t('cropDiaryTemplates.plan.day')}
            </Table.Th>
            <Table.Th w={150}>{t('cropDiaryTemplates.plan.stage')}</Table.Th>
            {columns.map((column) => (
              <Table.Th key={column.key} miw={110}>
                <Text size="xs" fw={600} lh={1.2}>
                  {column.label || column.key}
                </Text>
                {(column.unit || column.group) && (
                  <Text size="10px" c="dimmed" lh={1.2}>
                    {[column.group, column.unit].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {days.map((day) => (
            <GridRow
              key={day.day}
              day={day}
              columns={columns}
              stageName={stageNameFor.get(day.day)}
              onCellChange={setCell}
            />
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
}

const STICKY_DAY = {
  position: 'sticky' as const,
  left: 0,
  zIndex: 1,
  background: 'var(--mantine-color-body)',
};

const GridRow = memo(function GridRow({
  day,
  columns,
  stageName,
  onCellChange,
}: {
  readonly day: SheetDay;
  readonly columns: SheetColumn[];
  readonly stageName?: string;
  readonly onCellChange: (day: number, key: string, raw: string) => void;
}) {
  return (
    <Table.Tr>
      <Table.Td style={STICKY_DAY}>
        <Text size="xs" fw={600} ta="center">
          {day.day}
        </Text>
      </Table.Td>
      <Table.Td>
        {stageName ? (
          <Text size="xs" fw={600} c="primary" lh={1.2}>
            {stageName}
          </Text>
        ) : null}
      </Table.Td>
      {columns.map((column) => (
        <Table.Td key={column.key}>
          <TextInput
            size="xs"
            variant="unstyled"
            styles={{ input: { minHeight: 24, height: 24 } }}
            value={String(day.values[column.key] ?? '')}
            onChange={(e) => onCellChange(day.day, column.key, e.currentTarget.value)}
          />
        </Table.Td>
      ))}
    </Table.Tr>
  );
});
