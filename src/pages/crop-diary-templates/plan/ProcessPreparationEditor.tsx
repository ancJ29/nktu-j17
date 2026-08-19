import {
  ActionIcon,
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlanPreparation } from '@/types';

type Props = {
  readonly preparation: PlanPreparation[];
  readonly onChange: (preparation: PlanPreparation[]) => void;
};

export const ProcessPreparationEditor = memo(function ProcessPreparationEditor({
  preparation,
  onChange,
}: Props) {
  const { t } = useTranslation();

  const patch = useCallback(
    (index: number, next: Partial<PlanPreparation>) =>
      onChange(preparation.map((p, i) => (i === index ? { ...p, ...next } : p))),
    [preparation, onChange],
  );

  const kindOptions = useMemo(
    () => [
      { value: 'work', label: t('cropDiaryTemplates.plan.prepKindWork') },
      { value: 'material', label: t('cropDiaryTemplates.plan.prepKindMaterial') },
    ],
    [t],
  );

  return (
    <Stack gap="sm">
      {preparation.length === 0 ? (
        <Text size="xs" c="dimmed">
          {t('cropDiaryTemplates.plan.noPreparation')}
        </Text>
      ) : (
        <Table withTableBorder verticalSpacing={4} horizontalSpacing={6}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={110}>{t('cropDiaryTemplates.plan.prepOffset')}</Table.Th>
              <Table.Th w={150}>{t('cropDiaryTemplates.plan.prepLabel')}</Table.Th>
              <Table.Th>{t('cropDiaryTemplates.plan.prepActivity')}</Table.Th>
              <Table.Th w={140}>{t('cropDiaryTemplates.plan.prepKind')}</Table.Th>
              <Table.Th w={44} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {preparation.map((job, index) => (
              <Table.Tr key={index}>
                <Table.Td>
                  <NumberInput
                    size="xs"
                    allowDecimal={false}
                    value={job.dayOffset}
                    onChange={(v) => patch(index, { dayOffset: Math.trunc(Number(v) || 0) })}
                  />
                </Table.Td>
                <Table.Td>
                  <TextInput
                    size="xs"
                    placeholder="Chuẩn bị"
                    value={job.label ?? ''}
                    onChange={(e) => patch(index, { label: e.currentTarget.value || undefined })}
                  />
                </Table.Td>
                <Table.Td>
                  <TextInput
                    size="xs"
                    value={job.activity}
                    onChange={(e) => patch(index, { activity: e.currentTarget.value })}
                  />
                </Table.Td>
                <Table.Td>
                  {/* Never empty: a job whose kind was never chosen is labour,
                      which is the ordinary case — an unset select would read as
                      a question the author still owes an answer to. */}
                  <Select
                    size="xs"
                    allowDeselect={false}
                    data={kindOptions}
                    value={job.kind === 'material' ? 'material' : 'work'}
                    onChange={(v) =>
                      patch(index, v === 'material' ? { kind: 'material' } : { kind: undefined })
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="red"
                    aria-label={t('__new__.01-common.actions.remove')}
                    onClick={() => onChange(preparation.filter((_, i) => i !== index))}
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
          onClick={() => onChange([...preparation, { dayOffset: -1, activity: '' }])}
        >
          {t('cropDiaryTemplates.plan.addPreparation')}
        </Button>
      </Group>
    </Stack>
  );
});
