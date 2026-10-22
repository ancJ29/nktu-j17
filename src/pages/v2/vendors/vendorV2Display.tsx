import { Stack, Text } from '@mantine/core';
import { ColorBadge, PhoneNumber, type DataTableColumn } from '@credo/base-ui/components';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { lookupLabelOf, useLookupV2Labels, useLookupV2Options } from '@/hooks/useLookupV2Options';
import type { VendorV2Row } from '@/types';
import type { MasterDataHeaderText } from '../master-data';
import { VENDOR_TYPE_CATEGORY } from './vendorV2Form';

export function useVendorV2Columns(
  rows: readonly VendorV2Row[],
): Array<DataTableColumn<VendorV2Row>> {
  const { t } = useTranslation();
  const typeOptions = useLookupV2Options(VENDOR_TYPE_CATEGORY);
  const typeLabels = useLookupV2Labels(VENDOR_TYPE_CATEGORY);
  const showType = typeOptions.length > 0 || rows.some((v) => Boolean(v.extra?.vendorType));

  return useMemo(
    () => [
      ...(showType
        ? [
            {
              key: 'vendorType',
              width: '160px',
              header: t('vendorsV2.form.vendorType'),

              render: (item: VendorV2Row) => (
                <ColorBadge label={lookupLabelOf(typeLabels, item.extra?.vendorType)} size="sm" />
              ),
            },
          ]
        : []),
      {
        key: 'contact',
        width: '220px',
        header: t('common.labels.contact'),
        render: (item: VendorV2Row) =>
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
    ],
    [t, showType, typeLabels],
  );
}

export function useVendorV2HeaderText(row: VendorV2Row): MasterDataHeaderText {
  const typeLabels = useLookupV2Labels(VENDOR_TYPE_CATEGORY);
  const vendorType = row.extra?.vendorType;
  return {
    secondary: row.extra?.shortName,
    tag: vendorType ? lookupLabelOf(typeLabels, vendorType) : undefined,
  };
}
