import { ActionIcon, Button, Group, Select, Stack, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMaterialStore } from '@/stores/useMaterialStore';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';
import { getMaterialUnitCategory } from '@/utils/materialConfig';
import { materialUnitOptions, unitAfterMaterialChange } from './materialLineUnits';
import type { MaterialLine } from '@/types';
import { NumberField } from '@/components/NumberField';

type Props = {
  readonly value: MaterialLine[];
  readonly onChange: (lines: MaterialLine[]) => void;

  readonly disabled?: boolean;

  readonly disabledHint?: string;
};

export function MaterialLinesEditor({ value, onChange, disabled, disabledHint }: Props) {
  const { t } = useTranslation();

  const materials = useMaterialStore((s) => s.items);
  const materialsInitialized = useMaterialStore((s) => s.initialized);
  const loadMaterials = useMaterialStore((s) => s.loadAll);
  useEffect(() => {
    if (!materialsInitialized) loadMaterials();
  }, [materialsInitialized, loadMaterials]);

  const materialOptions = useMemo(
    () =>
      materials
        .filter((m) => !m.extra?.isDeleted)
        .map((m) => ({ value: m.code, label: `${m.name} (${m.code})` })),
    [materials],
  );
  const unitsOf = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of materials) map.set(m.code, m.extra?.units ?? []);
    return map;
  }, [materials]);

  const unitLabels = useLookupV2Labels(getMaterialUnitCategory());

  const unitOptionsFor = (line: MaterialLine) =>
    materialUnitOptions(unitsOf.get(line.materialCode) ?? [], line.unit, (unit) =>
      lookupLabelOf(unitLabels, unit, unit),
    );

  const patchLine = (i: number, patch: Partial<MaterialLine>) =>
    onChange(value.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const addLine = () => onChange([...value, { materialCode: '' }]);
  const removeLine = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const onPickMaterial = (i: number, code: string | null) => {
    const cur = value[i];
    const unit = unitAfterMaterialChange(cur.unit, code ? (unitsOf.get(code) ?? []) : []);
    patchLine(i, { materialCode: code ?? '', ...(unit !== cur.unit && { unit }) });
  };

  return (
    <Stack gap={6}>
      <Group justify="space-between">
        <Text size="xs" c="dimmed" fw={600}>
          {t('cropDiaryTemplates.form.materialsLabel')}
        </Text>
        {disabled ? (
          disabledHint && (
            <Text size="xs" c="dimmed">
              {disabledHint}
            </Text>
          )
        ) : (
          <Button
            size="compact-xs"
            variant="subtle"
            leftSection={<IconPlus size={13} />}
            onClick={addLine}
          >
            {t('cropDiaryTemplates.form.addMaterial')}
          </Button>
        )}
      </Group>
      {value.length === 0 ? (
        <Text size="xs" c="dimmed">
          {t('cropDiaryTemplates.noMaterials')}
        </Text>
      ) : (
        value.map((m, i) => (
          <Group key={i} gap="xs" wrap="nowrap" align="flex-end">
            <Select
              disabled={disabled}
              style={{ flex: 1 }}
              placeholder={t('cropDiaryTemplates.form.materialPlaceholder')}
              data={materialOptions}
              searchable
              value={m.materialCode || null}
              onChange={(v) => onPickMaterial(i, v)}
            />
            <NumberField
              disabled={disabled}
              w={110}
              placeholder={t('cropDiaryTemplates.form.quantityPlaceholder')}
              min={0}
              allowNegative={false}
              value={m.quantity}
              onChange={(quantity) => patchLine(i, { quantity })}
            />
            <Select
              disabled={disabled || !m.materialCode}
              w={110}
              placeholder={t('cropDiaryTemplates.form.unitPlaceholder')}
              data={unitOptionsFor(m)}
              allowDeselect={false}
              comboboxProps={{ withinPortal: true }}
              value={m.unit ?? null}
              onChange={(unit) => patchLine(i, { unit: unit ?? undefined })}
            />
            <ActionIcon
              variant="subtle"
              color="red"
              size="lg"
              disabled={disabled}
              onClick={() => removeLine(i)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))
      )}
    </Stack>
  );
}
