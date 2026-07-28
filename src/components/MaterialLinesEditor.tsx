import {
  ActionIcon,
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMaterialStore } from '@/stores/useMaterialStore';
import type { TemplateMaterialLine } from '@/types';

type Props = {
  readonly value: TemplateMaterialLine[];
  readonly onChange: (lines: TemplateMaterialLine[]) => void;
};

export function MaterialLinesEditor({ value, onChange }: Props) {
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
  const defaultUnitOf = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const m of materials) map.set(m.code, m.extra?.units?.[0]);
    return map;
  }, [materials]);

  const patchLine = (i: number, patch: Partial<TemplateMaterialLine>) =>
    onChange(value.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const addLine = () => onChange([...value, { materialCode: '' }]);
  const removeLine = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const onPickMaterial = (i: number, code: string | null) => {
    const cur = value[i];
    patchLine(i, {
      materialCode: code ?? '',
      ...(code && !cur.unit && { unit: defaultUnitOf.get(code) }),
    });
  };

  return (
    <Stack gap={6}>
      <Group justify="space-between">
        <Text size="xs" c="dimmed" fw={600}>
          {t('cropDiaryTemplates.form.materialsLabel')}
        </Text>
        <Button
          size="compact-xs"
          variant="subtle"
          leftSection={<IconPlus size={13} />}
          onClick={addLine}
        >
          {t('cropDiaryTemplates.form.addMaterial')}
        </Button>
      </Group>
      {value.length === 0 ? (
        <Text size="xs" c="dimmed">
          {t('cropDiaryTemplates.noMaterials')}
        </Text>
      ) : (
        value.map((m, i) => (
          <Group key={i} gap="xs" wrap="nowrap" align="flex-end">
            <Select
              style={{ flex: 1 }}
              placeholder={t('cropDiaryTemplates.form.materialPlaceholder')}
              data={materialOptions}
              searchable
              value={m.materialCode || null}
              onChange={(v) => onPickMaterial(i, v)}
            />
            <NumberInput
              w={110}
              placeholder={t('cropDiaryTemplates.form.quantityPlaceholder')}
              min={0}
              allowNegative={false}
              value={m.quantity ?? ''}
              onChange={(v) => patchLine(i, { quantity: typeof v === 'number' ? v : undefined })}
            />
            <TextInput
              w={90}
              placeholder={t('cropDiaryTemplates.form.unitPlaceholder')}
              value={m.unit ?? ''}
              onChange={(e) => patchLine(i, { unit: e.currentTarget.value })}
            />
            <ActionIcon variant="subtle" color="red" size="lg" onClick={() => removeLine(i)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))
      )}
    </Stack>
  );
}
