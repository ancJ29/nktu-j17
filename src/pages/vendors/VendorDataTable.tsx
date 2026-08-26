import { useMemo, type Ref } from 'react';
import { Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { Vendor } from '@/types';
import { PhoneNumber } from '@credo/base-ui/components';
import { ListDataTable } from '@/components/ListDataTable';
import { ActiveBadge } from '@/components/badges';
import { AddressWithMapLink } from '@/components/AddressWithMapLink';
import { VendorOriginBadge } from './VendorOriginBadge';
import type { VendorOriginLabels } from './vendorOriginLabels';

type VendorDataTableProps = {
  readonly vendors: Vendor[];
  readonly isLoading?: boolean;

  readonly showAddress?: boolean;

  readonly origin?: VendorOriginLabels;
  readonly viewportRef?: Ref<HTMLDivElement>;
};

export function VendorDataTable({
  vendors,
  isLoading,
  showAddress = false,
  origin,
  viewportRef,
}: VendorDataTableProps) {
  const { t } = useTranslation();

  const columns = useMemo(
    () => [
      {
        key: 'shortName',
        width: '250px',
        header: t('common.labels.shortName'),
        render: (item: Vendor) => (
          <Stack gap={2}>
            <Text fz="md" fw={600}>
              {item.extra?.shortName || item.name}
            </Text>
            <Text size="xs" c="dimmed">
              {item.code}
            </Text>
          </Stack>
        ),
      },
      {
        key: 'name',
        header: t('common.labels.name'),
        render: (item: Vendor) => (
          <Text fz="md" fw={500}>
            {item.name}
          </Text>
        ),
      },
      {
        key: 'contactPerson',
        header: t('common.columns.contactPerson'),
        accessor: 'contactPerson' as keyof Vendor,
      },
      {
        key: 'phone',
        header: t('common.labels.phone'),
        render: (item: Vendor) =>
          item.phone ? (
            <PhoneNumber
              value={item.phone}
              size="sm"
              c="dimmed"
              copyTooltip={t('__new__.01-common.actions.copy')}
              copiedTooltip={t('common.labels.copied')}
            />
          ) : (
            <Text size="sm">-</Text>
          ),
      },
      ...(origin
        ? [
            {
              key: 'origin',
              width: '120px',
              header: t('vendors.form.originLabel'),
              render: (item: Vendor) => (
                <VendorOriginBadge isDomestic={item.extra?.isDomestic ?? true} labels={origin} />
              ),
            },
          ]
        : []),
      ...(showAddress
        ? [
            {
              key: 'address',
              width: '280px',
              header: t('common.labels.address'),
              render: (item: Vendor) => (
                <AddressWithMapLink
                  address={item.address}
                  googleMapUrl={item.extra?.addressGoogleMapUrl}
                />
              ),
            },
          ]
        : []),
      {
        key: 'status',
        header: t('__new__.01-common.labels.status'),
        render: (item: Vendor) => (
          <ActiveBadge
            isActive={item.isActive}
            activeLabel={t('vendors.status.cooperating')}
            inactiveLabel={t('vendors.status.paused')}
            size="sm"
          />
        ),
      },
    ],
    [t, origin, showAddress],
  );

  return (
    <ListDataTable
      data={vendors}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('vendors.noItems')}
      detailRoute={ROUTES.VENDORS.DETAIL}
      viewportRef={viewportRef}
    />
  );
}
