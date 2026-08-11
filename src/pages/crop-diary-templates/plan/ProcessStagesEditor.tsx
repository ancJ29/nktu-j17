import {
  ActionIcon,
  Button,
  Group,
  NumberInput,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { SheetStage } from '@/types';

type Props = {
  readonly stages: SheetStage[];
  readonly totalDays: number;
  readonly onChange: (stages: SheetStage[]) => void;
};

export const ProcessStagesEditor = memo(function ProcessStagesEditor({
  stages,
  totalDays,
  onChange,
}: Props) {
  const { t } = useTranslation();

  const patch = useCallback(
    (index: number, next: Partial<SheetStage>) =>
      onChange(stages.map((s, i) => (i === index ? { ...s, ...next } : s))),
    [stages, onChange],
  );

  const add = useCallback(() => {
    const last = stages[stages.length - 1];
    const from = last ? Math.min(last.toDay + 1, Math.max(1, totalDays)) : 1;
    onChange([...stages, { fromDay: from, toDay: Math.max(from, totalDays), name: '' }]);
  }, [stages, totalDays, onChange]);

  return (
    <Stack gap="sm">
      {stages.length === 0 ? (
        <Text size="xs" c="dimmed">
          {t('cropDiaryTemplates.plan.noStages')}
        </Text>
      ) : (
        <Table withTableBorder verticalSpacing={4} horizontalSpacing={6}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('cropDiaryTemplates.plan.stageName')}</Table.Th>
              <Table.Th w={110}>{t('cropDiaryTemplates.plan.stageFrom')}</Table.Th>
              <Table.Th w={110}>{t('cropDiaryTemplates.plan.stageTo')}</Table.Th>
              <Table.Th w={44} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {stages.map((stage, index) => (
              <Table.Tr key={index}>
                <Table.Td>
                  <TextInput
                    size="xs"
                    value={stage.name}
                    onChange={(e) => patch(index, { name: e.currentTarget.value })}
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    size="xs"
                    min={1}
                    max={Math.max(1, totalDays)}
                    allowDecimal={false}
                    allowNegative={false}
                    value={stage.fromDay}
                    onChange={(v) =>
                      patch(index, { fromDay: Math.max(1, Math.floor(Number(v) || 1)) })
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    size="xs"
                    min={1}
                    max={Math.max(1, totalDays)}
                    allowDecimal={false}
                    allowNegative={false}
                    value={stage.toDay}
                    onChange={(v) =>
                      patch(index, { toDay: Math.max(1, Math.floor(Number(v) || 1)) })
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="red"
                    aria-label={t('__new__.01-common.actions.remove')}
                    onClick={() => onChange(stages.filter((_, i) => i !== index))}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Group>
        <Button
          size="compact-sm"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={add}
        >
          {t('cropDiaryTemplates.plan.addStage')}
        </Button>
      </Group>
    </Stack>
  );
});
