import { ActionIcon, Button, Group, Stack, TextInput } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlanMemo } from '@/types';

type Props = {
  readonly memos: PlanMemo[];
  readonly onChange: (memos: PlanMemo[]) => void;
};

export const ProcessMemosEditor = memo(function ProcessMemosEditor({ memos, onChange }: Props) {
  const { t } = useTranslation();

  const patch = useCallback(
    (index: number, next: Partial<PlanMemo>) =>
      onChange(memos.map((m, i) => (i === index ? { ...m, ...next } : m))),
    [memos, onChange],
  );
  const remove = useCallback(
    (index: number) => onChange(memos.filter((_, i) => i !== index)),
    [memos, onChange],
  );
  const add = useCallback(() => onChange([...memos, { key: '', value: '' }]), [memos, onChange]);

  return (
    <Stack gap="xs">
      {memos.map((memo, index) => (
        <Group key={index} gap="xs" wrap="nowrap">
          <TextInput
            size="xs"
            w={160}
            placeholder={t('cropDiaryTemplates.plan.memoKeyPlaceholder')}
            value={memo.key}
            onChange={(e) => patch(index, { key: e.currentTarget.value })}
          />
          <TextInput
            size="xs"
            style={{ flex: 1 }}
            placeholder={t('cropDiaryTemplates.plan.memoPlaceholder')}
            value={memo.value}
            onChange={(e) => patch(index, { value: e.currentTarget.value })}
          />
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
      ))}
      <Group>
        <Button
          size="compact-sm"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={add}
        >
          {t('cropDiaryTemplates.plan.addMemo')}
        </Button>
      </Group>
    </Stack>
  );
});
