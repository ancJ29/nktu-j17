import { Badge, Button, Group, Select, Stack, Table, Text, TextInput } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveModal } from '@/components/ResponsiveModal';
import { useMaterialStore } from '@/stores/useMaterialStore';
import { columnMaterialCode, columnUnit } from '@/utils/cropSheetModel';
import { materialUnitOptions, unitAfterMaterialChange } from '@/components/materialLineUnits';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';
import { getMaterialUnitCategory } from '@/utils/materialConfig';
import type { CropColumnChoice, SheetColumn } from '@/types';

type Props = {
  readonly opened: boolean;
  readonly onClose: () => void;

  readonly columns: SheetColumn[];

  readonly value: Record<string, CropColumnChoice>;
  readonly onChange: (next: Record<string, CropColumnChoice>) => void;
  readonly editable: boolean;
};

export function CropSheetMaterialsModal({
  opened,
  onClose,
  columns,
  value,
  onChange,
  editable,
}: Props) {
  const { t } = useTranslation();

  const materials = useMaterialStore((s) => s.items);
  const initialized = useMaterialStore((s) => s.initialized);
  const loadAll = useMaterialStore((s) => s.loadAll);
  useEffect(() => {
    if (opened && !initialized) loadAll();
  }, [opened, initialized, loadAll]);

  const options = useMemo(
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

  const configurable = useMemo(() => columns.filter((c) => c.kind === 'ratio'), [columns]);

  const set = (key: string, choice: CropColumnChoice) => {
    const next = { ...value };

    if (choice.materialCode || choice.unit) next[key] = choice;
    else delete next[key];
    onChange(next);
  };

  const pickMaterial = (column: SheetColumn, code: string | null) => {
    const units = code ? (unitsOf.get(code) ?? []) : [];
    set(column.key, {
      ...(code && { materialCode: code }),

      ...(() => {
        const unit = unitAfterMaterialChange(columnUnit(column, { columnMaterials: value }), units);
        return unit ? { unit } : {};
      })(),
    });
  };

  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={t('crops.sheet.materialConfig')}
    >
      <Stack gap="sm">
        <Text size="xs" c="dimmed">
          {t('crops.sheet.materialsHint')}
        </Text>

        {configurable.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('crops.sheet.materialsNoColumns')}
          </Text>
        ) : (
          <Table verticalSpacing={6} horizontalSpacing={6}>
            <Table.Tbody>
              {configurable.map((column) => {
                const materialCode = columnMaterialCode(column, { columnMaterials: value });
                const unit = columnUnit(column, { columnMaterials: value });
                return (
                  <Table.Tr key={column.key}>
                    <Table.Td w={180}>
                      <Group gap={6} wrap="wrap">
                        <Text size="sm" fw={600}>
                          {column.label || column.key}
                        </Text>
                        {column.group && (
                          <Badge size="xs" radius="sm" variant="light" tt="none">
                            {column.group}
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {
                        <Group gap="xs" wrap="nowrap" align="flex-start">
                          <Select
                            size="xs"
                            searchable
                            clearable
                            style={{ flex: 1 }}
                            disabled={!editable}
                            placeholder={t('crops.sheet.materialsPlaceholder')}
                            data={options}

                            value={columnMaterialCode(column, { columnMaterials: value }) ?? null}
                            onChange={(code) => pickMaterial(column, code)}
                            comboboxProps={{ withinPortal: true }}
                          />
                          {materialCode ? (
                            <Select
                              size="xs"
                              w={110}
                              disabled={!editable}
                              placeholder={t('crops.sheet.materialsUnit')}

                              data={materialUnitOptions(
                                unitsOf.get(materialCode) ?? [],
                                unit,
                                (u) => lookupLabelOf(unitLabels, u, u),
                              )}
                              value={unit ?? null}
                              onChange={(next) =>
                                set(column.key, {
                                  materialCode,
                                  ...(next && { unit: next }),
                                })
                              }
                              comboboxProps={{ withinPortal: true }}
                            />
                          ) : (
                            <TextInput
                              size="xs"
                              w={110}
                              disabled={!editable}
                              placeholder="lít"
                              value={unit ?? ''}
                              onChange={(e) =>
                                set(column.key, {
                                  ...(e.currentTarget.value && { unit: e.currentTarget.value }),
                                })
                              }
                            />
                          )}
                        </Group>
                      }
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}

        <Group justify="flex-end">
          <Button size="sm" variant="default" onClick={onClose}>
            {t('__new__.01-common.actions.close')}
          </Button>
        </Group>
      </Stack>
    </ResponsiveModal>
  );
}
