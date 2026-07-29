import { useMemo, type Ref } from 'react';
import { Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { Customer } from '@/types';
import { PhoneNumber } from '@credo/base-ui/components';
import { ListDataTable } from '@/components/ListDataTable';
import { ActiveBadge } from '@/components/badges';

type CustomerDataTableProps = {
  readonly customers: Customer[];
  readonly isLoading?: boolean;
  readonly viewportRef?: Ref<HTMLDivElement>;
};

export function CustomerDataTable({ customers, isLoading, viewportRef }: CustomerDataTableProps) {
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
        key: 'contactPerson',
        header: t('common.columns.contactPerson'),
        accessor: 'contactPerson' as keyof Customer,
      },
      {
        key: 'phone',
        header: t('common.labels.phone'),
        render: (item: Customer) =>
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
      {
        key: 'status',
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
    [t],
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
