import { ActionIcon, Group, Select, Stack, Table, Text, TextInput, Button } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@tabler/icons-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SheetColumn, SheetColumnKind } from '@/types';

type Props = {
  readonly columns: SheetColumn[];
  readonly onChange: (columns: SheetColumn[]) => void;
};

export const ProcessColumnsEditor = memo(function ProcessColumnsEditor({
  columns,
  onChange,
}: Props) {
  const { t } = useTranslation();

  const kindOptions: { value: SheetColumnKind; label: string }[] = useMemo(
    () => [
      { value: 'ratio', label: t('cropDiaryTemplates.plan.kind.ratio') },
      { value: 'activity', label: t('cropDiaryTemplates.plan.kind.activity') },
      { value: 'text', label: t('cropDiaryTemplates.plan.kind.text') },
    ],
    [t],
  );

  const patch = useCallback(
    (index: number, next: Partial<SheetColumn>) =>
      onChange(columns.map((c, i) => (i === index ? { ...c, ...next } : c))),
    [columns, onChange],
  );

  const move = useCallback(
    (index: number, by: number) => {
      const target = index + by;
      if (target < 0 || target >= columns.length) return;
      const next = [...columns];
      [next[index], next[target]] = [next[target], next[index]];
      onChange(next);
    },
    [columns, onChange],
  );

  const remove = useCallback(
    (index: number) => onChange(columns.filter((_, i) => i !== index)),
    [columns, onChange],
  );

  const add = useCallback(() => {
    const used = new Set(columns.map((c) => c.key));
    let n = columns.length + 1;
    while (used.has(`c${n}`)) n++;
    onChange([...columns, { key: `c${n}`, kind: 'ratio', label: '' }]);
  }, [columns, onChange]);

  return (
    <Stack gap="sm">
      {columns.length === 0 ? (
        <Text size="xs" c="dimmed">
          {t('cropDiaryTemplates.plan.noColumns')}
        </Text>
      ) : (
        <Table striped withTableBorder verticalSpacing={4} horizontalSpacing={6}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={190}>{t('cropDiaryTemplates.plan.columnLabel')}</Table.Th>
              <Table.Th w={140}>{t('cropDiaryTemplates.plan.columnKind')}</Table.Th>
              <Table.Th w={110}>{t('cropDiaryTemplates.plan.columnGroup')}</Table.Th>
              <Table.Th w={96} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {columns.map((column, index) => (
              <Table.Tr key={column.key}>
                <Table.Td>
                  <TextInput
                    size="xs"
                    placeholder={t('cropDiaryTemplates.plan.columnLabelPlaceholder')}
                    value={column.label}
                    onChange={(e) => patch(index, { label: e.currentTarget.value })}
                  />
                </Table.Td>
                <Table.Td>
                  <Select
                    size="xs"
                    data={kindOptions}
                    allowDeselect={false}
                    value={column.kind}
                    onChange={(value) =>
                      value &&
                      patch(index, {
                        kind: value as SheetColumnKind,

                        ...(value !== 'ratio' && { materialCode: undefined }),
                      })
                    }
                  />
                </Table.Td>
                <Table.Td>
                  {/* Free text, not a lookup category: a new lookup category
                      ships hidden to this client (their enabledCategories is a
                      subset), so it would arrive with no vocabulary at all.
                      Open to every kind — a sheet groups its measurements and
                      its prose under headings as readily as its tanks. */}
                  <TextInput
                    size="xs"
                    placeholder={column.kind === 'ratio' ? 'Bồn A' : ''}
                    value={column.group ?? ''}
                    onChange={(e) => patch(index, { group: e.currentTarget.value || undefined })}
                  />
                </Table.Td>
                <Table.Td>
                  <Group gap={2} wrap="nowrap" justify="flex-end">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      disabled={index === 0}
                      aria-label={t('cropDiaryTemplates.plan.moveUp')}
                      onClick={() => move(index, -1)}
                    >
                      <IconArrowUp size={14} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      disabled={index === columns.length - 1}
                      aria-label={t('cropDiaryTemplates.plan.moveDown')}
                      onClick={() => move(index, 1)}
                    >
                      <IconArrowDown size={14} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      aria-label={t('__new__.01-common.actions.remove')}
                      onClick={() => remove(index)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
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
          {t('cropDiaryTemplates.plan.addColumn')}
        </Button>
      </Group>
    </Stack>
  );
});
