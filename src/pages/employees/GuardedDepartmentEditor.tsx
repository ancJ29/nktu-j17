import type { DepartmentOption, Language } from '@credo/kits/types';
import { ActionIcon, Button, Group, List, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { IconLock, IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function GuardedDepartmentEditor({
  options,
  onChange,
  languages,
  label,
  lockedValues,
  getRemovalBlockers,
}: {
  options: DepartmentOption[];
  onChange: (opts: DepartmentOption[]) => void;
  languages: Language[];
  label: string;

  lockedValues: ReadonlySet<string>;

  getRemovalBlockers: (value: string) => string[];
}) {
  const { t } = useTranslation();
  const langCodes = languages.map((l) => l.code).filter(Boolean);

  const addOption = () => {
    const emptyLabel: Record<string, string> = {};
    for (const code of langCodes) emptyLabel[code] = '';
    onChange([...options, { value: '', label: emptyLabel }]);
  };

  const updateOption = (idx: number, field: 'value' | string, val: string) => {
    onChange(
      options.map((opt, i) => {
        if (i !== idx) return opt;
        if (field === 'value') return { ...opt, value: val };
        return { ...opt, label: { ...opt.label, [field]: val } };
      }),
    );
  };

  const removeOption = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  return (
    <Stack gap="xs">
      <Text fz="sm" fw={500}>
        {label}
      </Text>
      {options.map((opt, idx) => {
        const locked = lockedValues.has(opt.value);
        const blockers = locked ? getRemovalBlockers(opt.value) : [];
        const canRemove = blockers.length === 0;
        return (
          <Group key={idx} align="flex-end" gap="xs">
            <TextInput
              label={idx === 0 ? t('employees.org.optionValue') : undefined}
              placeholder="value"
              value={opt.value}
              onChange={(e) => updateOption(idx, 'value', e.currentTarget.value)}
              size="sm"
              w={140}
              disabled={locked}
              rightSection={
                locked ? (
                  <Tooltip label={t('employees.org.valueLockedHint')} withArrow>
                    <IconLock size={14} style={{ opacity: 0.5 }} />
                  </Tooltip>
                ) : undefined
              }
            />
            {langCodes.map((code) => (
              <TextInput
                key={code}
                label={idx === 0 ? code.toUpperCase() : undefined}
                placeholder={code}
                value={opt.label[code] ?? ''}
                onChange={(e) => updateOption(idx, code, e.currentTarget.value)}
                size="sm"
                style={{ flex: 1 }}
              />
            ))}
            <Tooltip
              label={
                <Stack gap={2}>
                  <Text fz="xs" fw={600}>
                    {t('employees.org.cannotRemove')}
                  </Text>
                  <List size="xs" spacing={0}>
                    {blockers.map((b, i) => (
                      <List.Item key={i}>{b}</List.Item>
                    ))}
                  </List>
                </Stack>
              }
              disabled={canRemove}
              withArrow
              multiline
            >
              <ActionIcon
                variant="light"
                color="red"
                size="lg"
                disabled={!canRemove}
                onClick={() => removeOption(idx)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        );
      })}
      <Button
        variant="light"
        size="xs"
        leftSection={<IconPlus size={14} />}
        onClick={addOption}
        w="fit-content"
      >
        {t('employees.org.addOption')}
      </Button>
    </Stack>
  );
}
