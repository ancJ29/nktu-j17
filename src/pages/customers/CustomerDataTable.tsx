import { useMemo, type Ref } from 'react';
import { Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { Customer } from '@/types';
import { PhoneNumber } from '@credo/base-ui/components';
import { ListDataTable } from '@/components/ListDataTable';
import { ActiveBadge } from '@/components/badges';
import { AddressWithMapLink } from '@/components/AddressWithMapLink';

type CustomerDataTableProps = {
  readonly customers: Customer[];
  readonly isLoading?: boolean;

  readonly showAddress?: boolean;
  readonly viewportRef?: Ref<HTMLDivElement>;
};

export function CustomerDataTable({
  customers,
  isLoading,
  showAddress = false,
  viewportRef,
}: CustomerDataTableProps) {
  const { t } = useTranslation();

  const columns = useMemo(
    () => [
      {
        key: 'shortName',
        width: '250px',
        header: t('common.labels.shortName'),
        render: (item: Customer) => (
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
        render: (item: Customer) => (
          <Stack gap={2}>
            <Text fz="md" fw={500}>
              {item.name}
            </Text>
            {item.extra?.taxCode && (
              <Text size="xs" c="dimmed">
                {item.extra.taxCode}
              </Text>
            )}
          </Stack>
        ),
      },
      {
        key: 'phone',
        width: '140px',
        header: t('common.labels.phone'),
        render: (item: Customer) => {
          return (
            <>
              <Text size="sm">{item.contactPerson}</Text>
              {item.phone ? (
                <PhoneNumber
                  value={item.phone}
                  size="sm"
                  c="dimmed"
                  copyTooltip={t('__new__.01-common.actions.copy')}
                  copiedTooltip={t('common.labels.copied')}
                />
              ) : null}
            </>
          );
        },
      },
      ...(showAddress
        ? [
            {
              key: 'address',
              width: '300px',
              header: t('common.labels.address'),
              render: (item: Customer) => (
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
        width: '150px',
        header: t('__new__.01-common.labels.status'),
        render: (item: Customer) => (
          <ActiveBadge
            isActive={item.isActive}
            activeLabel={t('__new__.01-common.labels.active')}
            inactiveLabel={t('__new__.01-common.labels.inactive')}
            size="sm"
          />
        ),
      },
    ],
    [t, showAddress],
  );

  return (
    <ListDataTable
      data={customers}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('customers.noItems')}
      detailRoute={ROUTES.CUSTOMERS.DETAIL}
      viewportRef={viewportRef}
    />
  );
}
