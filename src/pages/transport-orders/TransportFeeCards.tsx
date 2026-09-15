import {
  ActionIcon,
  Button,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  IconCashBanknote,
  IconPlus,
  IconReceipt,
  IconReceiptTax,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/components/SectionCard';
import { computeTransportOrderTotals, formatMoney } from './transportOrderPricing';
import { feeNameSelectData, useFeeNameOptions } from './feeName';
import { blankFee, type FeeFormValues } from './feeRows';

export function TransportFeeCards<V extends FeeFormValues>({
  form,
}: {
  form: UseFormReturnType<V>;
}) {
  const { t } = useTranslation();

  const feeNameOptions = useFeeNameOptions();
  const fees = form.values.fees;

  const payerSelectData = [
    { value: 'company', label: t('transportOrders.fees.payerCompany') },
    { value: 'customer', label: t('transportOrders.fees.payerCustomer') },
  ];

  const rowsIndexed = fees.map((row, i) => ({ row, i }));
  const serviceRows = rowsIndexed.filter(({ row }) => row.kind !== 'passthrough');
  const passthroughRows = rowsIndexed.filter(({ row }) => row.kind === 'passthrough');

  const totals = computeTransportOrderTotals(
    fees,
    (form.values.vatRatePercent || 0) / 100,
    form.values.advanceAmount || 0,
    form.values.roundDown,
  );

  const totalsRow = (label: string, value: number, dimmed = false) => (
    <Group justify="space-between">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" c={dimmed ? 'dimmed' : undefined}>
        {formatMoney(value)}
      </Text>
    </Group>
  );

  const feeNameSelect = (i: number) => {
    const props = form.getInputProps(`fees.${i}.label`);
    return (
      <Select
        data={feeNameSelectData(feeNameOptions, fees[i]!.label)}
        value={fees[i]!.label || null}
        onChange={(v) => props.onChange(v ?? '')}
        searchable
        error={props.error}
      />
    );
  };

  const deleteButton = (i: number) => (
    <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem('fees', i)}>
      <IconTrash size={16} />
    </ActionIcon>
  );

  return (
    <>
      {/* Service = our own charge (VAT-able, no payer). */}
      <SectionCard
        icon={<IconReceipt size={14} />}
        title={t('transportOrders.fees.kindService')}
        actions={
          <Button
            size="compact-sm"
            variant="light"
            leftSection={<IconPlus size={14} />}

            onClick={() => form.insertListItem('fees', blankFee() as never)}
          >
            {t('transportOrders.fees.add')}
          </Button>
        }
      >
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('transportOrders.fees.label')}</Table.Th>
              <Table.Th w={150}>{t('transportOrders.fees.amount')}</Table.Th>
              <Table.Th w={60} ta="center">
                {t('transportOrders.fees.vatable')}
              </Table.Th>
              <Table.Th w={140}>{t('transportOrders.fees.invoiceNo')}</Table.Th>
              <Table.Th>{t('transportOrders.fees.memo')}</Table.Th>
              <Table.Th w={40} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {serviceRows.map(({ i }) => (
              <Table.Tr key={i}>
                <Table.Td>{feeNameSelect(i)}</Table.Td>
                <Table.Td>
                  <NumberInput
                    thousandSeparator=","
                    min={0}
                    {...form.getInputProps(`fees.${i}.amount`)}
                  />
                </Table.Td>
                <Table.Td ta="center">
                  <Checkbox {...form.getInputProps(`fees.${i}.vatable`, { type: 'checkbox' })} />
                </Table.Td>
                <Table.Td>
                  <TextInput {...form.getInputProps(`fees.${i}.invoiceNo`)} />
                </Table.Td>
                <Table.Td>
                  <TextInput {...form.getInputProps(`fees.${i}.memo`)} />
                </Table.Td>
                <Table.Td>{deleteButton(i)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </SectionCard>

      {/* Chi hộ — a third party's cost. Never VAT-taxed (that VAT is on their
          invoice); `payer` decides whether we bill it. */}
      <SectionCard
        icon={<IconCashBanknote size={14} />}
        title={t('transportOrders.fees.kindPassthrough')}
        actions={
          <Button
            size="compact-sm"
            variant="light"
            leftSection={<IconPlus size={14} />}
            onClick={() =>
              form.insertListItem(
                'fees',
                blankFee({ kind: 'passthrough', vatable: false, payer: 'company' }) as never,
              )
            }
          >
            {t('transportOrders.fees.add')}
          </Button>
        }
      >
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('transportOrders.fees.label')}</Table.Th>
              <Table.Th w={150}>{t('transportOrders.fees.amount')}</Table.Th>
              <Table.Th w={150}>{t('transportOrders.fees.payer')}</Table.Th>
              <Table.Th w={140}>{t('transportOrders.fees.invoiceNo')}</Table.Th>
              <Table.Th>{t('transportOrders.fees.memo')}</Table.Th>
              <Table.Th w={40} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {passthroughRows.map(({ i }) => {
              const payer = form.getInputProps(`fees.${i}.payer`);
              return (
                <Table.Tr key={i}>
                  <Table.Td>{feeNameSelect(i)}</Table.Td>
                  <Table.Td>
                    <NumberInput
                      thousandSeparator=","
                      min={0}
                      {...form.getInputProps(`fees.${i}.amount`)}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Select
                      data={payerSelectData}
                      value={fees[i]!.payer}
                      onChange={(v) => payer.onChange(v ?? 'company')}
                      allowDeselect={false}
                    />
                  </Table.Td>
                  <Table.Td>
                    <TextInput {...form.getInputProps(`fees.${i}.invoiceNo`)} />
                  </Table.Td>
                  <Table.Td>
                    <TextInput {...form.getInputProps(`fees.${i}.memo`)} />
                  </Table.Td>
                  <Table.Td>{deleteButton(i)}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </SectionCard>

      {/* Billing summary — VAT rate + advance settle over BOTH groups, so it
          stands alone rather than under one. */}
      <SectionCard icon={<IconReceiptTax size={14} />} title={t('transportOrders.billing.title')}>
        <Group gap="sm" align="flex-end">
          <NumberInput
            w={160}
            label={t('transportOrders.billing.vatRate')}
            suffix="%"
            min={0}
            max={100}
            {...form.getInputProps('vatRatePercent')}
          />
          {/* TẠM ỨNG sits with the totals it settles — it's only legible next to
              the "còn lại" it produces. */}
          <NumberInput
            w={200}
            label={t('transportOrders.billing.advance')}
            thousandSeparator=","
            min={0}
            {...form.getInputProps('advanceAmount')}
          />
        </Group>

        <Checkbox
          mt="sm"
          label={t('transportOrders.billing.roundDown')}
          description={t('transportOrders.billing.roundDownDescription')}
          {...form.getInputProps('roundDown', { type: 'checkbox' })}
        />

        <Divider my="sm" />
        <Stack gap={4}>
          {/* Subtotalled per kind — our revenue vs a third party's cost we're
              reclaiming are different money, and a freight invoice reads them so. */}
          {totalsRow(t('transportOrders.billing.serviceSubtotal'), totals.serviceSubtotal)}
          {totals.passthroughSubtotal > 0 &&
            totalsRow(t('transportOrders.billing.passthroughSubtotal'), totals.passthroughSubtotal)}
          {totalsRow(
            t('transportOrders.billing.vatAmount', { rate: form.values.vatRatePercent || 0 }),
            totals.vatAmount,
          )}
          {totals.nonBillableTotal > 0 &&
            totalsRow(t('transportOrders.billing.nonBillableTotal'), totals.nonBillableTotal, true)}
          <Group justify="space-between">
            <Text fw={600}>{t('transportOrders.billing.grandTotal')}</Text>
            <Text fw={600}>{formatMoney(totals.grandTotal)}</Text>
          </Group>
          {totals.advanceAmount > 0 && (
            <>
              {totalsRow(t('transportOrders.billing.advance'), -totals.advanceAmount)}
              <Group justify="space-between">
                <Text fw={700}>{t('transportOrders.billing.balanceDue')}</Text>
                <Text fw={700}>{formatMoney(totals.balanceDue)}</Text>
              </Group>
            </>
          )}
        </Stack>
      </SectionCard>
    </>
  );
}
