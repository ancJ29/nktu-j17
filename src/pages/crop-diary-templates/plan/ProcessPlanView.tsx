import { Badge, Box, Group, Stack, Table, Text } from '@mantine/core';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/utils/number';
import {
  makeCropSheetExtra,
  seasonTotals,
  sheetHasGroups,
  sheetStageSpans,
  stageOf,
} from '@/utils/cropSheetModel';
import { SheetColumnHeadCells, SheetGroupHeadCells } from '@/components/SheetGridColumnHeads';
import { SHEET_GRID_W, sheetTableMinWidth } from '@/utils/sheetGridLayout';
import type { CropProcessPlan } from '@/types';

type Props = {
  readonly plan: CropProcessPlan;
};

export function ProcessPlanView({ plan }: Props) {
  const { t } = useTranslation();

  const totals = useMemo(() => seasonTotals(makeCropSheetExtra(plan)), [plan]);

  const stageSpans = useMemo(
    () => sheetStageSpans(plan.days.map((d) => ({ stage: stageOf(d.day, plan.stages)?.name }))),
    [plan],
  );
  const hasGroups = sheetHasGroups(plan.columns);

  if (!plan.columns.length) {
    return (
      <Text size="sm" c="dimmed">
        {t('cropDiaryTemplates.plan.noColumns')}
      </Text>
    );
  }

  return (
    <Stack gap="md">
      <Group gap="xs">
        <Badge variant="light" color="primary" radius="sm">
          {t('cropDiaryTemplates.dayCount', { count: plan.totalDays })}
        </Badge>
        {plan.target ? (
          <Badge variant="light" color="gray" radius="sm">
            {t('cropDiaryTemplates.plan.target')}: {plan.target}
          </Badge>
        ) : null}
        {plan.referenceSeedCount ? (
          <Badge variant="light" color="gray" radius="sm">
            {t('cropDiaryTemplates.plan.seedCount')}: {formatNumber(plan.referenceSeedCount)}
          </Badge>
        ) : null}
        {plan.referencePlantCount ? (
          <Badge variant="light" color="gray" radius="sm">
            {t('cropDiaryTemplates.plan.referencePlantCount')}:{' '}
            {formatNumber(plan.referencePlantCount)}
          </Badge>
        ) : null}
        {plan.referenceAdjustmentRate ? (
          <Badge variant="light" color="gray" radius="sm">
            {t('cropDiaryTemplates.plan.adjustmentRate')}: {plan.referenceAdjustmentRate}
          </Badge>
        ) : null}
      </Group>

      {plan.memos?.length ? (
        <Box>
          <Text size="xs" fw={600} c="dimmed" mb={4}>
            {t('cropDiaryTemplates.plan.memosSection')}
          </Text>
          <Stack gap={2}>
            {plan.memos.map((memo, i) => (
              <Text key={i} size="xs">
                {memo.key ? (
                  <Text span fw={600}>
                    {memo.key}:{' '}
                  </Text>
                ) : null}
                {memo.value}
              </Text>
            ))}
          </Stack>
        </Box>
      ) : null}

      {plan.preparation?.length ? (
        <Box>
          <Text size="xs" fw={600} c="dimmed" mb={4}>
            {t('cropDiaryTemplates.plan.preparationSection')}
          </Text>
          <Stack gap={2}>
            {plan.preparation.map((job, i) => (
              <Text key={i} size="xs">
                <Text span fw={700}>
                  {job.dayOffset > 0 ? `+${job.dayOffset}` : job.dayOffset}
                </Text>
                {job.label ? ` · ${job.label}` : ''} — {job.activity}
                {/* Shown only when it is `'material'`: labour is the ordinary
                    case, and marking every other line "no material" would be
                    noise on the majority to caption the minority. */}
                {job.kind === 'material' && (
                  <Badge ml={6} size="xs" radius="sm" variant="light" color="primary" tt="none">
                    {t('cropDiaryTemplates.plan.prepKindMaterial')}
                  </Badge>
                )}
              </Text>
            ))}
          </Stack>
        </Box>
      ) : null}

      {totals.length > 0 && (
        <Box>
          <Text size="xs" fw={600} c="dimmed" mb={4}>
            {t('cropDiaryTemplates.plan.totalsTitle')}
          </Text>
          <Group gap={6}>
            {totals.map((total) => (
              <Badge key={total.columnKey} variant="outline" radius="sm" size="sm">
                {total.label}: {formatNumber(Number(total.quantity.toFixed(2)))}
                {total.unit ? ` ${total.unit}` : ''}
              </Badge>
            ))}
          </Group>
        </Box>
      )}

      <Box style={{ overflowX: 'auto' }}>
        <Table
          withTableBorder
          verticalSpacing={2}
          horizontalSpacing={6}
          miw={sheetTableMinWidth(plan.columns, SHEET_GRID_W.day + SHEET_GRID_W.stage)}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={SHEET_GRID_W.day} rowSpan={hasGroups ? 2 : 1}>
                {t('cropDiaryTemplates.plan.day')}
              </Table.Th>
              <Table.Th w={SHEET_GRID_W.stage} rowSpan={hasGroups ? 2 : 1}>
                {t('cropDiaryTemplates.plan.stage')}
              </Table.Th>
              {hasGroups ? (
                <SheetGroupHeadCells columns={plan.columns} />
              ) : (
                <SheetColumnHeadCells columns={plan.columns} unitOf={(c) => c.unit} />
              )}
            </Table.Tr>
            {hasGroups && (
              <Table.Tr>
                <SheetColumnHeadCells columns={plan.columns} unitOf={(c) => c.unit} />
              </Table.Tr>
            )}
          </Table.Thead>
          <Table.Tbody>
            {plan.days.map((day, i) => (
              <Table.Tr key={day.day}>
                <Table.Td>
                  <Text size="xs" fw={600} ta="center">
                    {day.day}
                  </Text>
                </Table.Td>
                {/* Merged over the stage's run, exactly as the crop grid does
                    it — a covered row renders no stage cell at all. */}
                {stageSpans[i]! > 0 && (
                  <Table.Td rowSpan={stageSpans[i]!} style={{ verticalAlign: 'top' }}>
                    <Text size="xs" fw={600} c="primary" lh={1.2}>
                      {stageOf(day.day, plan.stages)?.name ?? ''}
                    </Text>
                  </Table.Td>
                )}
                {plan.columns.map((column) => (
                  <Table.Td key={column.key}>
                    <Text size="xs" lh={1.3} style={{ whiteSpace: 'pre-wrap' }}>
                      {String(day.values[column.key] ?? '')}
                    </Text>
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
    </Stack>
  );
}
