import { Grid, Stack } from '@mantine/core';
import { IconAddressBook, IconInfoCircle, IconMapPin } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { AddressWithMapLink } from '@/components/AddressWithMapLink';
import { DetailField } from '@/components/DetailField';
import { SectionCard } from '@/components/SectionCard';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks/useLookupV2Options';
import type { VendorV2Row } from '@/types';
import { VENDOR_TYPE_CATEGORY } from './vendorV2Form';

export function VendorV2DetailBody({ row }: { readonly row: VendorV2Row }) {
  const { t } = useTranslation();
  const typeLabels = useLookupV2Labels(VENDOR_TYPE_CATEGORY);
  const vendorType = row.extra?.vendorType;

  return (
    <Stack gap="md">
      <SectionCard
        icon={<IconInfoCircle size={14} />}
        title={t('common.labels.basicInfo')}
        padding="md"
      >
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <DetailField label={t('common.labels.name')}>{row.name}</DetailField>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <DetailField label={t('common.labels.shortName')}>{row.extra?.shortName}</DetailField>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <DetailField label={t('common.labels.code')}>{row.code}</DetailField>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <DetailField label={t('common.labels.taxCode')}>{row.extra?.taxCode}</DetailField>
          </Grid.Col>
          {vendorType ? (
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <DetailField label={t('vendorsV2.form.vendorType')}>
                {lookupLabelOf(typeLabels, vendorType)}
              </DetailField>
            </Grid.Col>
          ) : null}
        </Grid>
      </SectionCard>

      <SectionCard
        icon={<IconAddressBook size={14} />}
        title={t('common.labels.contact')}
        padding="md"
      >
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <DetailField label={t('common.columns.contactPerson')}>{row.contactPerson}</DetailField>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <DetailField label={t('common.labels.phone')}>{row.phone}</DetailField>
          </Grid.Col>
        </Grid>
      </SectionCard>

      <SectionCard icon={<IconMapPin size={14} />} title={t('common.labels.address')} padding="md">
        <DetailField label={t('common.labels.address')}>
          {row.address ? (
            <AddressWithMapLink
              address={row.address}
              googleMapUrl={row.extra?.addressGoogleMapUrl}
            />
          ) : undefined}
        </DetailField>
      </SectionCard>
    </Stack>
  );
}
