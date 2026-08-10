import { Alert, Table, Text } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/utils/number';
import { formatVndMoney } from '@/utils/printDocument';
import { useMaterialStore } from '@/stores/useMaterialStore';
import { sheetCost, type SheetColumnTotal } from '@/utils/cropSheetModel';

type Props = {
  readonly totals: readonly SheetColumnTotal[];
};

export function SheetTotalsTable({ totals }: Props) {
  const { t } = useTranslation();

  const materials = useMaterialStore((s) => s.items);
  const materialsInitialized = useMaterialStore((s) => s.initialized);
  const loadMaterials = useMaterialStore((s) => s.loadAll);
  useEffect(() => {
    if (!materialsInitialized) loadMaterials();
  }, [materialsInitialized, loadMaterials]);

  const cost = useMemo(() => {
    const priceByCode = new Map(materials.map((m) => [m.code, m.extra?.costPrice]));
    return sheetCost([...totals], (code) => priceByCode.get(code) ?? undefined);
  }, [totals, materials]);

  if (!totals.length) {
    return (
      <Text size="sm" c="dimmed">
        {t('crops.sheet.noTotals')}
      </Text>
    );
  }

  return (
    <>
      {/* Named, not swallowed: a total that quietly omits an unpriced material
          reads as complete, and that is the kind of wrong that survives. */}
      {cost.unpriced.length > 0 && (
        <Alert color="yellow" variant="light" mb="sm">
          {t('crops.sheet.unpricedMaterials', { names: cost.unpriced.join(', ') })}
        </Alert>
      )}
      <Table striped withTableBorder verticalSpacing={6} horizontalSpacing={8}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('cropDiaryTemplates.plan.columnLabel')}</Table.Th>
            <Table.Th ta="right">{t('crops.sheet.totalsPlanned')}</Table.Th>
            <Table.Th ta="right">{t('crops.sheet.totalsForCrop')}</Table.Th>
            <Table.Th ta="right">{t('crops.sheet.totalsCost')}</Table.Th>
            <Table.Th ta="right">{t('crops.sheet.totalsDays')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {cost.lines.map((total) => (
            <Table.Tr key={total.columnKey}>
              <Table.Td>
                <Text size="sm" fw={600}>
                  {total.label}
                </Text>
                {total.group && (
                  <Text size="xs" c="dimmed">
                    {total.group}
                  </Text>
                )}
              </Table.Td>
              <Table.Td ta="right">
                <Text size="sm">
                  {formatNumber(Number(total.quantity.toFixed(2)))}
                  {total.unit ? ` ${total.unit}` : ''}
                </Text>
              </Table.Td>
              <Table.Td ta="right">
                <Text size="sm" fw={600}>
                  {total.total === undefined
                    ? '—'
                    : `${formatNumber(Number(total.total.toFixed(2)))}${total.unit ? ` ${total.unit}` : ''}`}
                </Text>
              </Table.Td>
              <Table.Td ta="right">
                <Text size="sm">{total.cost === undefined ? '—' : formatVndMoney(total.cost)}</Text>
              </Table.Td>
              <Table.Td ta="right">
                <Text size="sm" c="dimmed">
                  {total.dayCount}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
        <Table.Tfoot>
          <Table.Tr>
            <Table.Th colSpan={3} ta="right">
              {t('crops.sheet.totalsCostAll')}
            </Table.Th>
            <Table.Th ta="right">{formatVndMoney(cost.total)}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Tfoot>
      </Table>
    </>
  );
}
