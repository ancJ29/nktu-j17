/**
 * One vendor as a phone card — the register's `spec.mobile.Card`.
 *
 * **What it shows is what identifies the vendor and who to call**: the name,
 * whether it is still being used, its type, and the contact line. Everything
 * else the detail page holds is one tap away.
 *
 * The phone number is plain text here, not `PhoneNumber`. The whole card is
 * the tap target, and a copy affordance inside it races that tap
 * ([mobile-workflow.md](../../../docs/memo/mobile-workflow.md) § 3); the
 * detail page is where the number is acted on.
 */

import { Group, Stack, Text } from '@mantine/core';
import { CodeLabel, ColorBadge } from '@credo/base-ui/components';
import { useTranslation } from 'react-i18next';
import { ActiveBadge } from '@/components/badges';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks/useLookupV2Options';
import type { VendorV2Row } from '@/types';
import { VENDOR_TYPE_CATEGORY } from './vendorV2Form';

export function VendorV2MobileCard({ row }: { readonly row: VendorV2Row }) {
  const { t } = useTranslation();
  const typeLabels = useLookupV2Labels(VENDOR_TYPE_CATEGORY);
  const vendorType = row.extra?.vendorType;

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
        {vendorType ? <ColorBadge label={lookupLabelOf(typeLabels, vendorType)} size="sm" /> : null}
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
    </Stack>
  );
}
