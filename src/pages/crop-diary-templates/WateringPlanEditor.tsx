import { Badge, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconDroplet } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyWateringRange, summarizeWatering } from '@/utils/cropDiaryTemplateModel';
import type { CropTemplateWatering, TemplateDay, WateringRange } from '@/types';
import { NumberField } from '@/components/NumberField';

type Props = {
  readonly value: CropTemplateWatering;
  readonly onChange: (watering: CropTemplateWatering) => void;

  readonly days: TemplateDay[];
  readonly onDaysChange: (days: TemplateDay[]) => void;
};

export function WateringPlanEditor({ value, onChange, days, onDaysChange }: Props) {
  const { t } = useTranslation();
  const totalDays = days.length;
  const unit = value.unit?.trim();

  const [range, setRange] = useState<WateringRange>({ fromDay: 1, toDay: 0, perPlant: 0 });
  const toDay = range.toDay || totalDays;

  const runs = summarizeWatering(days);

  return (
    <Stack gap="md">
      <TextInput
        maw={360}
        label={t('cropDiaryTemplates.watering.activityLabel')}
        placeholder={t('cropDiaryTemplates.watering.activityPlaceholder')}
        value={value.activity}
        onChange={(e) => onChange({ ...value, activity: e.currentTarget.value })}
      />

      {/* One sentence: from day N to day M, this much per plant. */}
      <Group gap="xs" align="flex-end" wrap="wrap">
        <NumberField
          w={104}
          min={1}
          max={Math.max(1, totalDays)}
          label={t('cropDiaryTemplates.watering.fromDayLabel')}
          value={range.fromDay}
          emptyValue={1}
          onChange={(fromDay) => setRange((r) => ({ ...r, fromDay }))}
        />
        <NumberField
          w={104}
          min={1}
          max={Math.max(1, totalDays)}
          label={t('cropDiaryTemplates.watering.toDayLabel')}
          value={toDay}
          emptyValue={0}
          onChange={(nextToDay) => setRange((r) => ({ ...r, toDay: nextToDay }))}
        />
        <NumberField
          w={130}
          min={0}
          step={0.1}
          decimalScale={3}
          label={t('cropDiaryTemplates.watering.perPlantLabel')}
          value={range.perPlant}
          emptyValue={0}
          onChange={(perPlant) => setRange((r) => ({ ...r, perPlant }))}
        />
        <TextInput
          w={90}
          label={t('cropDiaryTemplates.watering.unitLabel')}
          placeholder={t('cropDiaryTemplates.watering.unitPlaceholder')}
          value={value.unit ?? ''}
          onChange={(e) => onChange({ ...value, unit: e.currentTarget.value })}
        />
        <Button
          size="sm"
          variant="light"
          onClick={() => onDaysChange(applyWateringRange(days, { ...range, toDay }))}
          disabled={totalDays === 0}
        >
          {t('cropDiaryTemplates.watering.fill')}
        </Button>
      </Group>

      {/* What the days actually hold now — the fill button's only feedback, and
          the answer to "is this plan right" without scrolling 60 cards. */}
      {runs.length === 0 ? (
        <Text size="xs" c="dimmed">
          {t('cropDiaryTemplates.watering.empty')}
        </Text>
      ) : (
        <Group gap="xs" wrap="wrap">
          <IconDroplet size={14} color="var(--mantine-color-dimmed)" />
          {runs.map((run) => (
            <Badge key={run.fromDay} variant="light" color="primary" radius="sm" tt="none">
              {run.fromDay === run.toDay
                ? t('cropDiaryTemplates.dayLabel', { day: run.fromDay })
                : t('cropDiaryTemplates.watering.window', { from: run.fromDay, to: run.toDay })}
              {` · ${run.perPlant}${unit ? ` ${unit}` : ''}`}
            </Badge>
          ))}
        </Group>
      )}
    </Stack>
  );
}
