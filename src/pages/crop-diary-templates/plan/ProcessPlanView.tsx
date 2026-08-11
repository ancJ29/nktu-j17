import { Badge, Box, Group, Stack, Table, Text } from '@mantine/core';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/utils/number';
import { seasonTotals, stageOf, makeCropSheetExtra } from '@/utils/cropSheetModel';
import { SHEET_GRID_W, sheetTableMinWidth } from '@/utils/sheetGridLayout';
import type { CropProcessPlan } from '@/types';

type Props = {
  readonly plan: CropProcessPlan;
};

export function ProcessPlanView({ plan }: Props) {
  const { t } = useTranslation();

  const totals = useMemo(() => seasonTotals(makeCropSheetExtra(plan)), [plan]);

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
                {memo}
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
          striped
          withTableBorder
          verticalSpacing={2}
          horizontalSpacing={6}
          miw={sheetTableMinWidth(plan.columns.length, SHEET_GRID_W.day + SHEET_GRID_W.stage)}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={SHEET_GRID_W.day}>{t('cropDiaryTemplates.plan.day')}</Table.Th>
              <Table.Th w={SHEET_GRID_W.stage}>{t('cropDiaryTemplates.plan.stage')}</Table.Th>
              {plan.columns.map((column) => (
                <Table.Th key={column.key} miw={SHEET_GRID_W.column}>
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
            {plan.days.map((day) => {
              const stage = stageOf(day.day, plan.stages);
              return (
                <Table.Tr key={day.day}>
                  <Table.Td>
                    <Text size="xs" fw={600} ta="center">
                      {day.day}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {stage && stage.fromDay === day.day ? (
                      <Text size="xs" fw={600} c="primary" lh={1.2}>
                        {stage.name}
                      </Text>
                    ) : null}
                  </Table.Td>
                  {plan.columns.map((column) => (
                    <Table.Td key={column.key}>
                      <Text size="xs" lh={1.3}>
                        {String(day.values[column.key] ?? '')}
                      </Text>
                    </Table.Td>
                  ))}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>
    </Stack>
  );
}
