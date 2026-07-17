import type { Language } from '@credo/kits/types';
import { ActionIcon, Button, Group, Select, Stack, TextInput } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { memo } from 'react';

export const LanguagesSection = memo(function LanguagesSection({
  languages,
  defaultLanguage,
  onLanguagesChange,
  onDefaultChange,
}: {
  languages: Language[];
  defaultLanguage: string;
  onLanguagesChange: (langs: Language[]) => void;
  onDefaultChange: (code: string) => void;
}) {
  const addLanguage = () => {
    onLanguagesChange([...languages, { code: '', label: '', flag: '' }]);
  };

  const updateLanguage = (idx: number, partial: Partial<Language>) => {
    const updated = languages.map((lang, i) => (i === idx ? { ...lang, ...partial } : lang));
    onLanguagesChange(updated);
  };

  const removeLanguage = (idx: number) => {
    onLanguagesChange(languages.filter((_, i) => i !== idx));
  };

  const langOptions = languages
    .filter((l) => l.code)
    .map((l) => ({ value: l.code, label: `${l.flag} ${l.label} (${l.code})` }));

  return (
    <Stack gap="sm">
      {languages.map((lang, idx) => (
        <Group key={idx} align="flex-end" gap="sm">
          <TextInput
            label="Code"
            value={lang.code}
            onChange={(e) => updateLanguage(idx, { code: e.currentTarget.value })}
            size="sm"
            w={80}
          />
          <TextInput
            label="Label"
            value={lang.label}
            onChange={(e) => updateLanguage(idx, { label: e.currentTarget.value })}
            size="sm"
            style={{ flex: 1 }}
          />
          <TextInput
            label="Flag"
            value={lang.flag}
            onChange={(e) => updateLanguage(idx, { flag: e.currentTarget.value })}
            size="sm"
            w={60}
          />
          <ActionIcon
            variant="light"
            color="red"
            size="lg"
            onClick={() => removeLanguage(idx)}
            title="Remove"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}

      <Button
        variant="light"
        size="xs"
        leftSection={<IconPlus size={14} />}
        onClick={addLanguage}
        w="fit-content"
      >
        Add Language
      </Button>

      <Select
        label="Default Language"
        data={langOptions}
        value={defaultLanguage}
        onChange={(v) => v && onDefaultChange(v)}
        size="sm"
        maw={300}
      />
    </Stack>
  );
});
