import { Badge, Card, Divider, Group, Skeleton, Stack, Text } from '@mantine/core';
import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useVendorStore } from '@/stores/useVendorStore';
import type { DeliveryRequest, DeliveryRequestExtra } from '@/types';
import { DeliveryRequestKindBadge } from './DeliveryRequestKindBadge';
import { deliveryRequestPartyIsCustomer } from './deliveryRequestParty';
import { createCustomerShortNameResolver } from '@/utils/customerDisplay';
import { formatDate } from '@/utils/dateFormat';
import { type ResolvedStatusOption } from '@/utils/permission';
import { resolveDeliveryRequestRowBg } from './urgencyRowBg';

type DeliveryRequestCardListProps = {
  readonly requests: DeliveryRequest[];
  readonly isLoading?: boolean;
  readonly resolveStatus: (value: string | undefined | null) => ResolvedStatusOption;
};

function DeliveryRequestCardSkeleton() {
  return (
    <Card withBorder padding="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Skeleton h={22} w="55%" />
          <Skeleton h={26} w={80} radius="xl" />
        </Group>
        <Stack gap={6}>
          <Skeleton h={14} w="75%" />
          <Skeleton h={14} w="65%" />
          <Skeleton h={14} w="80%" />
        </Stack>
      </Stack>
    </Card>
  );
}

function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Group gap="xs" wrap="nowrap" align="baseline">
      <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
        {label}:
      </Text>
      <Text size="sm" fw={500} style={{ minWidth: 0, wordBreak: 'break-word' }}>
        {value}
      </Text>
    </Group>
  );
}

export function DeliveryRequestCardList({
  requests,
  isLoading,
  resolveStatus,
}: DeliveryRequestCardListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  
  
  const customers = useCustomerStore((s) => s.items);
  const getVendorByCode = useVendorStore((s) => s.getByCode);
  const resolveCustomerShortName = useMemo(
    () => createCustomerShortNameResolver(customers),
    [customers],
  );

  if (isLoading) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 5 }, (_, i) => (
          <DeliveryRequestCardSkeleton key={i} />
        ))}
      </Stack>
    );
  }

  if (requests.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl" size="sm">
        {t('deliveryRequests.noItems')}
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {requests.map((req) => {
        const status = resolveStatus((req.extra as { status?: string })?.status);
        
        const partyIsCustomer = deliveryRequestPartyIsCustomer(req);
        const drExtra = (req.extra ?? {}) as DeliveryRequestExtra;
        const isUrgent = drExtra.isUrgent === true;
        const cardBg = resolveDeliveryRequestRowBg(isUrgent, status.stage);
        const vendor =
          !partyIsCustomer && req.vendorCode ? getVendorByCode(req.vendorCode) : undefined;
        const partyName = partyIsCustomer
          ? resolveCustomerShortName(req.customerName)
          : vendor?.extra?.shortName?.trim() || vendor?.name || req.vendorName;

        return (
          <Card
            key={req.id}
            withBorder
            radius="md"
            padding="md"
            bg={cardBg}
            onClick={() => navigate(ROUTES.DELIVERY.DETAIL.replace(':id', req.id))}
            style={{ cursor: 'pointer' }}
          >
            <Stack gap="sm">
              <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
                <Text fw={700} size="lg" style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                  {req.requestNumber}
                </Text>
              </Group>

              <Stack gap={4}>
                {partyName && (
                  <FieldRow
                    label={
                      partyIsCustomer
                        ? t('common.labels.customer')
                        : t('deliveryRequests.detail.vendorLabel')
                    }
                    value={partyName}
                  />
                )}
                {drExtra.assignedDriverName && (
                  <FieldRow
                    label={t('deliveryRequests.detail.driverLabel')}
                    value={drExtra.assignedDriverName}
                  />
                )}
                {req.scheduledDate && (
                  <FieldRow
                    label={t('deliveryRequests.columns.scheduledDate')}
                    value={formatDate(req.scheduledDate)}
                  />
                )}
                {drExtra.deliveryTimestamp && (
                  <FieldRow
                    label={t('deliveryRequests.columns.completedDate')}
                    value={formatDate(drExtra.deliveryTimestamp)}
                  />
                )}
                <Divider variant="dashed" my="xs" />
                <Group gap={6} wrap="wrap">
                  <Badge color={status.color} variant="light" size="sm">
                    {status.label}
                  </Badge>
                  <DeliveryRequestKindBadge dr={req} variant="light" size="sm" />
                </Group>
              </Stack>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
