import { Badge, Button, Card, Divider, Group, Text, ThemeIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPackages } from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMaterialInventoryStore } from '@/stores/useMaterialInventoryStore';
import { readRowBreakdown } from '@/utils/inventoryMath';
import { materialHasMultipleUnits } from '@/utils/materialPackaging';
import { getMaterialUnitCategory } from '@/utils/materialConfig';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';
import { perms } from '@/utils/permission';
import type { Material } from '@/types';

import { MaterialInventoryFormModal } from '@/pages/material-inventory/MaterialInventoryFormModal';
import { MaterialInventoryUpdateModal } from '@/pages/material-inventory/MaterialInventoryUpdateModal';

type Props = {
  readonly material: Material;

  readonly canManage: boolean;
};

const canDelete = perms.materialInventory.canDelete();

export function MaterialInventorySection({ material, canManage }: Props) {
  const { t } = useTranslation();

  const rows = useMaterialInventoryStore((s) => s.items);
  const initialized = useMaterialInventoryStore((s) => s.initialized);
  const loadAll = useMaterialInventoryStore((s) => s.loadAll);

  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [updateOpened, { open: openUpdate, close: closeUpdate }] = useDisclosure(false);

  const unitLabels = useLookupV2Labels(getMaterialUnitCategory());
  const multiUnit = materialHasMultipleUnits(material);

  useEffect(() => {
    if (!initialized) loadAll();
  }, [initialized, loadAll]);

  const row = useMemo(
    () => rows.find((r) => r.itemCode === material.code) ?? null,
    [rows, material.code],
  );

  const baseUnit = material.extra?.units?.[0] ?? '';
  const breakdown = useMemo(
    () => (row && multiUnit && baseUnit ? readRowBreakdown(row, baseUnit) : {}),
    [row, multiUnit, baseUnit],
  );

  return (
    <Card withBorder radius="md" padding="lg">
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <ThemeIcon size={28} radius="md" variant="light" color="teal">
            <IconPackages size={16} stroke={1.75} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            {t('materialInventory.title')}
          </Text>
        </Group>
        {canManage && (
          <Button size="compact-sm" variant="light" onClick={row ? openUpdate : openAdd}>
            {row
              ? t('materialInventory.form.submitAdjust')
              : t('materialInventory.modal.createTitle')}
          </Button>
        )}
      </Group>
      <Divider my="md" />
      <Group gap={6} align="baseline">
        <Text size="xs" c="dimmed">
          {t('common.labels.onHand')}
        </Text>
        <Text size="xl" fw={700} c={(row?.onHand ?? 0) < 0 ? 'red' : undefined}>
          {row ? row.onHand.toLocaleString() : '—'}
        </Text>
        {row && baseUnit && (
          <Text size="xs" c="dimmed">
            {lookupLabelOf(unitLabels, baseUnit, baseUnit)}
          </Text>
        )}
      </Group>
      {multiUnit && Object.keys(breakdown).length > 0 && (
        <Group gap={6} wrap="wrap" mt="xs">
          {Object.entries(breakdown).map(([u, q]) => (
            <Badge
              key={u}
              variant="light"
              color={u === baseUnit ? 'primary' : 'gray'}
              size="sm"
              radius="sm"
              tt="none"
            >
              {q.toLocaleString()} {lookupLabelOf(unitLabels, u, u)}
            </Badge>
          ))}
        </Group>
      )}

      <MaterialInventoryFormModal
        opened={addOpened}
        onClose={closeAdd}
        available={[]}
        fixedMaterial={material}
      />
      <MaterialInventoryUpdateModal
        opened={updateOpened}
        onClose={closeUpdate}
        row={row}
        material={material}
        materialName={material.name}
        canDelete={canDelete}
      />
    </Card>
  );
}
