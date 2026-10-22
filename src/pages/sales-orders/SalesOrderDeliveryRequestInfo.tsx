

import { Anchor, Badge, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconArrowBackUp, IconCalendar, IconTruckDelivery } from '@tabler/icons-react';
import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { DeliveryRequest, DeliveryRequestExtra } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { deliveryRequestStatusOptions } from '@/pages/delivery-requests/useDeliveryRequestStatusOptions';
import { EmployeeLink } from '@/components/EmployeeLink';

const { resolveStatus } = deliveryRequestStatusOptions;

type SalesOrderDeliveryRequestInfoProps = {
  readonly requests: DeliveryRequest[];
  
  readonly compact?: boolean;
};

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
        {label}:
      </Text>
      <div style={{ minWidth: 0 }}>{value}</div>
    </Group>
  );
}

export function SalesOrderDeliveryRequestInfo({
  requests,
  compact = false,
}: SalesOrderDeliveryRequestInfoProps) {
  const { t } = useTranslation();

  if (requests.length === 0) return null;

  
  
  const ordered = [...requests].sort((a, b) => {
    const aAdd = (a.extra as DeliveryRequestExtra | undefined)?.isAdditional ? 1 : 0;
    const bAdd = (b.extra as DeliveryRequestExtra | undefined)?.isAdditional ? 1 : 0;
    return aAdd - bAdd;
  });

  
  
  const cols = compact || ordered.length < 2 ? 1 : { base: 1, sm: 2 };

  return (
    <SimpleGrid cols={cols} spacing="sm">
      {ordered.map((dr) => {
        const extra = (dr.extra ?? {}) as DeliveryRequestExtra;
        const status = resolveStatus(extra.status);
        
        
        const isReturn = dr.direction === 'inbound' && extra.inboundKind === 'customer-return';
        const color = isReturn
          ? 'var(--mantine-color-orange-6)'
          : extra.isAdditional
            ? 'var(--mantine-color-teal-6)'
            : 'var(--mantine-color-blue-6)';
        const title = isReturn
          ? t('salesOrders.detail.returnShipmentInfoTitle')
          : extra.isAdditional
            ? t('salesOrders.detail.additionalDeliveryRequestInfoTitle')
            : t('salesOrders.detail.drInfoTitle');
        const TitleIcon = isReturn ? IconArrowBackUp : IconTruckDelivery;
        return (
          <Card key={dr.id} withBorder radius="md" padding={compact ? 'sm' : 'md'}>
            <Stack gap={compact ? 6 : 'xs'}>
              <Group gap="xs" align="center" wrap="nowrap">
                <TitleIcon
                  size={compact ? 18 : 20}
                  stroke={1.75}
                  color={color}
                  style={{ flexShrink: 0 }}
                />
                <Text fw={600} c={color} size={compact ? 'sm' : 'md'}>
                  {title}
                </Text>
              </Group>

              <InfoRow
                label={t('salesOrders.detail.drInfoCode')}
                value={
                  <Anchor
                    c={color}
                    component={Link}
                    to={ROUTES.DELIVERY.DETAIL.replace(':id', dr.id)}
                    fw={600}
                    size="sm"
                  >
                    {dr.requestNumber}
                  </Anchor>
                }
              />

              <InfoRow
                label={t('__new__.01-common.labels.status')}
                value={
                  <Badge color={status.color} variant="filled" size="sm">
                    {status.label}
                  </Badge>
                }
              />

              {extra.assignedDriverId && (
                <InfoRow
                  label={t('deliveryRequests.detail.driverLabel')}
                  value={<EmployeeLink id={extra.assignedDriverId} />}
                />
              )}

              {dr.scheduledDate && (
                <InfoRow
                  label={t('deliveryRequests.columns.scheduledDate')}
                  value={
                    <Group gap={6} wrap="nowrap" align="center">
                      <IconCalendar size={15} stroke={1.75} style={{ flexShrink: 0 }} />
                      <Text size="sm" fw={500}>
                        {formatDate(dr.scheduledDate)}
                      </Text>
                    </Group>
                  }
                />
              )}
            </Stack>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
