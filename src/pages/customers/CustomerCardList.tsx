import { Card, Group, Skeleton, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { PhoneNumber } from '@credo/base-ui/components';
import { AddressWithMapLink } from '@/components/AddressWithMapLink';
import { ActiveBadge } from '@/components/badges';
import { ListCardList } from '@/components/ListCardList';
import type { Customer } from '@/types';

type CustomerCardListProps = {
  readonly customers: Customer[];
  readonly isLoading?: boolean;
};

function CustomerCardSkeleton() {
  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap="xs">
        <Group justify="space-between">
          <Skeleton h={16} w="60%" />
          <Skeleton h={20} w={60} radius="xl" />
        </Group>
        <Skeleton h={12} w="40%" />
        <Skeleton h={12} w="50%" />
      </Stack>
    </Card>
  );
}

export function CustomerCardList({ customers, isLoading }: CustomerCardListProps) {
  const { t } = useTranslation();

  return (
    <ListCardList
      data={customers}
      isLoading={isLoading}
      emptyMessage={t('customers.noItems')}
      detailRoute={ROUTES.CUSTOMERS.DETAIL}
      renderSkeleton={() => <CustomerCardSkeleton />}
      renderCard={(item) => {
        const shortName = item.extra?.shortName || item.code;
        return (
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Text fw={700} size="md" truncate>
                {shortName}
              </Text>
              {item.name !== shortName && (
                <Text size="xs" c="dimmed" truncate>
                  {item.name}
                </Text>
              )}
              {item.contactPerson && (
                <Text size="xs" c="dimmed" truncate>
                  {t('common.columns.contactPerson')}: {item.contactPerson}
                </Text>
              )}
              {item.phone && (
                <Group gap={4} wrap="nowrap">
                  <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                    {t('common.labels.phone')}:
                  </Text>
                  <PhoneNumber
                    value={item.phone}
                    size="xs"
                    c="dimmed"
                    copyTooltip={t('__new__.01-common.actions.copy')}
                    copiedTooltip={t('common.labels.copied')}
                  />
                </Group>
              )}
              {/* Card-only condition: unlike the desktop column (self-gated
                  across the whole list) a card shows the row it has, so an
                  address-less one simply omits the line. */}
              {item.address && (
                <AddressWithMapLink
                  address={item.address}
                  googleMapUrl={item.extra?.addressGoogleMapUrl}
                  iconLabel={t('__new__.01-common.actions.openInMaps')}
                  size="xs"
                />
              )}
            </Stack>
            <ActiveBadge
              isActive={item.isActive}
              activeLabel={t('__new__.01-common.labels.active')}
              inactiveLabel={t('__new__.01-common.labels.inactive')}
              style={{ flexShrink: 0 }}
            />
          </Group>
        );
      }}
    />
  );
}
