import { Table, Text } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMaterialStore } from '@/stores/useMaterialStore';
import { formatNumber } from '@/utils/number';
import type { CropMaterialTotal } from '@/utils/cropMaterialSummary';

type Props = {
  readonly summary: CropMaterialTotal[];
};

export function MaterialSummaryTable({ summary }: Props) {
  const { t } = useTranslation();
  const materials = useMaterialStore((s) => s.items);
  const materialsInit = useMaterialStore((s) => s.initialized);
  const loadMaterials = useMaterialStore((s) => s.loadAll);
  useEffect(() => {
    if (!materialsInit) loadMaterials();
  }, [materialsInit, loadMaterials]);

  const materialName = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of materials) map.set(m.code, m.name);
    return (code: string) => map.get(code) ?? code;
  }, [materials]);

  if (summary.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t('cropDiaries.materialSummaryEmpty')}
      </Text>
    );
  }

  return (
    <Table.ScrollContainer minWidth={360}>
      <Table striped highlightOnHover verticalSpacing="xs" horizontalSpacing="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('cropDiaries.materialTable.material')}</Table.Th>
            <Table.Th ta="right">{t('cropDiaries.materialTable.quantity')}</Table.Th>
            <Table.Th>{t('cropDiaries.materialTable.unit')}</Table.Th>
            <Table.Th ta="right">{t('cropDiaries.materialTable.times')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {summary.map((s) => (
            <Table.Tr key={`${s.materialCode}·${s.unit ?? ''}`}>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {materialName(s.materialCode)}
                </Text>
                <Text size="xs" c="dimmed" ff="monospace">
                  {s.materialCode}
                </Text>
              </Table.Td>
              <Table.Td ta="right">
                {typeof s.quantity === 'number' ? formatNumber(s.quantity) : '—'}
              </Table.Td>
              <Table.Td>{s.unit ?? '—'}</Table.Td>
              <Table.Td ta="right">{s.lineCount}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
