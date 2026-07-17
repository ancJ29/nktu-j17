import { Card, Group, Stack, Text, TextInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { MaterialLinesEditor } from '@/components/MaterialLinesEditor';
import type { TemplateDay } from '@/types';

type Props = {
  readonly days: TemplateDay[];
  readonly onChange: (days: TemplateDay[]) => void;
};

export function TemplateDaysEditor({ days, onChange }: Props) {
  const { t } = useTranslation();

  const patchDay = (i: number, patch: Partial<TemplateDay>) =>
    onChange(days.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  return (
    <Stack gap="sm">
      {days.map((day, i) => (
        <Card
          key={day.day}
          withBorder
          radius="md"
          padding="md"
          bg="var(--mantine-color-default-hover)"
        >
          <Stack gap="sm">
            <Text fw={700} size="sm" c="primary">
              {t('cropDiaryTemplates.dayLabel', { day: day.day })}
            </Text>

            <Group gap="sm" grow align="flex-start">
              <TextInput
                label={t('cropDiaryTemplates.form.activityLabel')}
                placeholder={t('cropDiaryTemplates.form.activityPlaceholder')}
                value={day.activity}
                onChange={(e) => patchDay(i, { activity: e.currentTarget.value })}
              />
              <TextInput
                label={t('__new__.01-common.labels.note')}
                placeholder={t('cropDiaryTemplates.form.memoPlaceholder')}
                value={day.memo ?? ''}
                onChange={(e) => patchDay(i, { memo: e.currentTarget.value })}
              />
            </Group>

            <MaterialLinesEditor
              value={day.materials}
              onChange={(materials) => patchDay(i, { materials })}
            />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
