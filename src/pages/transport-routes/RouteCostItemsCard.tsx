import { Alert, Button, Group, NumberInput, Table, Text, TextInput } from '@mantine/core';
import { IconCashBanknote, IconInfoCircle, IconPlus } from '@tabler/icons-react';
import type { UseFormReturnType } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/components/SectionCard';
import { formatMoney } from '../transport-orders/transportOrderPricing';
import { blankCostItem, type RouteFormValues } from './routeFormValues';
import { routeCostItemsTotal } from './routeCosting';
import { RouteRowRemove } from './RouteFormRow';

type Props = {
  readonly form: UseFormReturnType<RouteFormValues>;
};

/**
 * HẠNG MỤC CHI PHÍ — everything the run costs us besides fuel and driver pay.
 *
 * Driver pay is deliberately not a row here: the route already stores it and
 * the giá vốn charges that figure, so a second copy would double-count into
 * every breakdown and be free to disagree with what the order actually
 * receives. The table's own column header invites exactly that mistake, which
 * is why the Alert says so out loud rather than trusting the convention.
 */
export function RouteCostItemsCard({ form }: Props) {
  const { t } = useTranslation();
  const costItems = form.values.costItems;

  return (
    <SectionCard
      icon={<IconCashBanknote size={14} />}
      title={t('transportRoutes.form.costItemsTitle')}
      actions={
        <Button
          size="compact-sm"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={() => form.insertListItem('costItems', blankCostItem())}
        >
          {t('transportRoutes.form.addCostItem')}
        </Button>
      }
    >
      <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />} mb="sm">
        {t('transportRoutes.form.costItemsHint')}
      </Alert>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('transportRoutes.form.costItemName')}</Table.Th>
            <Table.Th w={110}>{t('transportRoutes.form.costItemUnit')}</Table.Th>
            <Table.Th w={110}>{t('transportRoutes.form.costItemQuantity')}</Table.Th>
            <Table.Th w={160}>{t('transportRoutes.form.costItemAmount')}</Table.Th>
            <Table.Th>{t('transportRoutes.form.costItemNote')}</Table.Th>
            <Table.Th w={40} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {costItems.map((_, i) => (
            <Table.Tr key={i}>
              <Table.Td>
                <TextInput {...form.getInputProps(`costItems.${i}.name`)} />
              </Table.Td>
              <Table.Td>
                <TextInput {...form.getInputProps(`costItems.${i}.unit`)} />
              </Table.Td>
              <Table.Td>
                <NumberInput min={0} {...form.getInputProps(`costItems.${i}.quantity`)} />
              </Table.Td>
              <Table.Td>
                {/* THÀNH TIỀN is authored, not derived from ĐVT × SL — the
                    client's sheet has no unit-price column, so computing it
                    would invent a precision the source lacks. */}
                <NumberInput
                  thousandSeparator=","
                  min={0}
                  {...form.getInputProps(`costItems.${i}.amount`)}
                />
              </Table.Td>
              <Table.Td>
                <TextInput {...form.getInputProps(`costItems.${i}.note`)} />
              </Table.Td>
              <Table.Td>
                <RouteRowRemove
                  disabled={costItems.length === 1}
                  onClick={() => form.removeListItem('costItems', i)}
                />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Group justify="flex-end" gap="md">
        <Text fw={600}>{t('transportRoutes.costing.itemsTotal')}</Text>
        <Text fw={700}>{formatMoney(routeCostItemsTotal({ costItems }))}</Text>
      </Group>
    </SectionCard>
  );
}
