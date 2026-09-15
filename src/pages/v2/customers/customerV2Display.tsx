import { Stack, Text } from '@mantine/core';
import { ColorBadge, PhoneNumber, type DataTableColumn } from '@credo/base-ui/components';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AddressWithMapLink } from '@/components/AddressWithMapLink';
import { lookupLabelOf, useLookupV2Labels, useLookupV2Options } from '@/hooks/useLookupV2Options';
import type { CustomerV2Row } from '@/types';
import type { MasterDataHeaderText } from '../master-data';
import { CUSTOMER_TYPE_CATEGORY } from './customerV2Form';

export function useCustomerV2Columns(
  rows: readonly CustomerV2Row[],
): Array<DataTableColumn<CustomerV2Row>> {
  const { t } = useTranslation();
  const typeOptions = useLookupV2Options(CUSTOMER_TYPE_CATEGORY);
  const typeLabels = useLookupV2Labels(CUSTOMER_TYPE_CATEGORY);
  const showType = typeOptions.length > 0 || rows.some((c) => Boolean(c.extra?.customerType));

  return useMemo(
    () => [
      ...(showType
        ? [
            {
              key: 'customerType',
              width: '160px',
              header: t('customersV2.form.customerType'),

              render: (item: CustomerV2Row) => (
                <ColorBadge label={lookupLabelOf(typeLabels, item.extra?.customerType)} size="sm" />
              ),
            },
          ]
        : []),
      {
        key: 'contact',
        width: '220px',
        header: t('common.labels.contact'),
        render: (item: CustomerV2Row) =>
          item.contactPerson || item.phone ? (
            <Stack gap={2}>
              {item.contactPerson ? <Text size="sm">{item.contactPerson}</Text> : null}
              {item.phone ? (
                <PhoneNumber
                  value={item.phone}
                  size="sm"
                  c="dimmed"
                  copyTooltip={t('common.actions.copy')}
                  copiedTooltip={t('common.labels.copied')}
                />
              ) : null}
            </Stack>
          ) : (
            <Text size="sm">-</Text>
          ),
      },
      {
        key: 'address',
        header: t('common.labels.address'),
        render: (item: CustomerV2Row) => (
          <AddressWithMapLink
            maxWidth="300px"
            address={item.address}
            googleMapUrl={item.extra?.addressGoogleMapUrl}
          />
        ),
      },
    ],
    [t, showType, typeLabels],
  );
}

export function useCustomerV2HeaderText(row: CustomerV2Row): MasterDataHeaderText {
  const typeLabels = useLookupV2Labels(CUSTOMER_TYPE_CATEGORY);
  const customerType = row.extra?.customerType;
  return {
    secondary: row.extra?.shortName,
    tag: customerType ? lookupLabelOf(typeLabels, customerType) : undefined,
  };
}
