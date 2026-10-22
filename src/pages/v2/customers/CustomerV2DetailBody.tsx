import { Grid, Stack } from '@mantine/core';
import { IconAddressBook, IconInfoCircle, IconMapPin } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { AddressWithMapLink } from '@/components/AddressWithMapLink';
import { DetailField } from '@/components/DetailField';
import { SectionCard } from '@/components/SectionCard';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks/useLookupV2Options';
import type { CustomerV2Row } from '@/types';
import { CUSTOMER_TYPE_CATEGORY } from './customerV2Form';

export function CustomerV2DetailBody({ row }: { readonly row: CustomerV2Row }) {
  const { t } = useTranslation();
  const typeLabels = useLookupV2Labels(CUSTOMER_TYPE_CATEGORY);
  const customerType = row.extra?.customerType;

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
          {customerType ? (
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <DetailField label={t('customersV2.form.customerType')}>
                {lookupLabelOf(typeLabels, customerType)}
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
