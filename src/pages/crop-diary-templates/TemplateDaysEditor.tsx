import { Card, Group, Stack, Text, TextInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconDroplet } from '@tabler/icons-react';
import { MaterialLinesEditor } from '@/components/MaterialLinesEditor';
import type { TemplateDay } from '@/types';
import { NumberField } from '@/components/NumberField';

type Props = {
  readonly days: TemplateDay[];
  readonly onChange: (days: TemplateDay[]) => void;

  readonly waterUnit?: string;
};

export function TemplateDaysEditor({ days, onChange, waterUnit }: Props) {
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
            {/* Water rides the day's title line, not the field row below: it is
                the one figure scanned down the column ("what does day 12 need"),
                and a third input beside activity + note crowded both. */}
            <Group justify="space-between" align="center" wrap="nowrap">
              <Text fw={700} size="sm" c="primary">
                {t('cropDiaryTemplates.dayLabel', { day: day.day })}
              </Text>
              <NumberField
                w={150}
                size="xs"
                min={0}
                step={0.1}
                decimalScale={3}
                hideControls
                leftSection={<IconDroplet size={14} />}
                rightSection={
                  waterUnit ? (
                    <Text size="xs" c="dimmed" pr={6} style={{ whiteSpace: 'nowrap' }}>
                      {waterUnit}
                    </Text>
                  ) : undefined
                }
                rightSectionWidth={waterUnit ? 44 : undefined}
                placeholder={t('cropDiaryTemplates.watering.dayPlaceholder')}
                aria-label={t('cropDiaryTemplates.watering.dayLabel')}
                value={day.water}
                onChange={(water) => patchDay(i, { water })}
              />
            </Group>

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
