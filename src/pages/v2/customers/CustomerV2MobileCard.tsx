/**
 * One customer as a phone card — the register's `spec.mobile.Card`.
 *
 * The vendor card plus the address, which is the column the desktop customer
 * list carries and the vendor list does not. Plain text for both the phone and
 * the address, and for the same reason the vendor card gives: the card is the
 * tap target, so a copy button or a map link inside it races that tap.
 */

import { Group, Stack, Text } from '@mantine/core';
import { CodeLabel, ColorBadge } from '@credo/base-ui/components';
import { IconMapPin } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActiveBadge } from '@/components/badges';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks/useLookupV2Options';
import type { CustomerV2Row } from '@/types';
import { CUSTOMER_TYPE_CATEGORY } from './customerV2Form';

export function CustomerV2MobileCard({ row }: { readonly row: CustomerV2Row }) {
  const { t } = useTranslation();
  const typeLabels = useLookupV2Labels(CUSTOMER_TYPE_CATEGORY);
  const customerType = row.extra?.customerType;

  return (
    <Stack gap={6}>
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="xs">
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Text fz="sm" fw={600} lineClamp={2}>
            {row.name}
          </Text>
          {row.extra?.shortName ? (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {row.extra.shortName}
            </Text>
          ) : null}
        </Stack>
        <ActiveBadge
          isActive={row.isActive}
          activeLabel={t('__new__.01-common.labels.active')}
          inactiveLabel={t('__new__.01-common.labels.inactive')}
          size="sm"
        />
      </Group>

      <Group gap="xs" wrap="wrap">
        <CodeLabel code={row.code} size="sm" fw={600} />
        {customerType ? (
          <ColorBadge label={lookupLabelOf(typeLabels, customerType)} size="sm" />
        ) : null}
      </Group>

      {row.contactPerson || row.phone ? (
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Text size="xs" c="dimmed" lineClamp={1}>
            {row.contactPerson}
          </Text>
          {row.phone ? (
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              {row.phone}
            </Text>
          ) : null}
        </Group>
      ) : null}

      {row.address ? (
        <Group gap={4} wrap="nowrap" align="flex-start">
          <IconMapPin size={13} stroke={1.75} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed" lineClamp={2}>
            {row.address}
          </Text>
        </Group>
      ) : null}
    </Stack>
  );
}
