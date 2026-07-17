import { useMemo } from 'react';
import { Badge, Card, Group, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconClipboardList } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { WarehouseDocRow } from '@/types';
import { ListCardList } from '@/components/ListCardList';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';
import { getMaterialUnitCategory } from '@/utils/materialConfig';
import { formatDateTime } from '@/utils/dateFormat';
import { formatUnitTotals, totalsByUnit } from './kinds';

type Props = {
  readonly docs: WarehouseDocRow[];
  readonly isLoading?: boolean;
  readonly detailRoute: string;
  readonly showStatus?: boolean;
};

function DocSkeleton() {
  return (
    <Card withBorder padding="sm" radius="md">
      <Stack gap={6}>
        <Skeleton h={14} w="50%" />
        <Skeleton h={10} w="35%" />
      </Stack>
    </Card>
  );
}

export function WarehouseDocCardList({ docs, isLoading, detailRoute, showStatus }: Props) {
  const { t } = useTranslation();
  const unitLabels = useLookupV2Labels(getMaterialUnitCategory());
  const employees = useEmployeeStore((s) => s.items);
  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  return (
    <ListCardList
      data={docs}
      isLoading={isLoading}
      detailRoute={detailRoute}
      renderSkeleton={() => <DocSkeleton />}
      emptyState={
        <Card withBorder padding="xl" radius="md">
          <Stack align="center" gap="sm" py="md">
            <ThemeIcon size={56} radius="xl" variant="light" color="gray">
              <IconClipboardList size={28} stroke={1.5} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              {t('warehouseDoc.emptyTitle')}
            </Text>
            <Text size="xs" c="dimmed" ta="center" maw={260}>
              {t('warehouseDoc.emptyMessage')}
            </Text>
          </Stack>
        </Card>
      }
      renderCard={(d) => {
        const pic = d.extra.assignedTo ? employeeById.get(d.extra.assignedTo)?.name : undefined;
        const confirmed = (d.extra.status ?? 'draft') === 'confirmed';
        return (
          <Stack gap={4}>
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Group gap="xs" wrap="nowrap">
                  <Text fw={700} size="sm" ff="monospace" lh={1.25}>
                    {d.extra.code}
                  </Text>
                  {showStatus && (
                    <Badge
                      size="xs"
                      color={confirmed ? 'green' : 'gray'}
                      variant={confirmed ? 'filled' : 'light'}
                    >
                      {t(`warehouseDoc.status.${confirmed ? 'confirmed' : 'draft'}`)}
                    </Badge>
                  )}
                </Group>
                {d.extra.reference && (
                  <Text size="xs" c="dimmed" ff="monospace" lineClamp={1}>
                    {d.extra.reference}
                  </Text>
                )}
              </Stack>
              <Text fw={700} size="sm" style={{ flexShrink: 0 }}>
                {t('warehouseDoc.columns.itemsCount', { count: d.extra.lines?.length ?? 0 })}
              </Text>
            </Group>
            {(d.extra.lines?.length ?? 0) > 0 && (
              <Text size="xs" c="dimmed">
                {formatUnitTotals(totalsByUnit(d.extra.lines), (u) =>
                  lookupLabelOf(unitLabels, u, u),
                )}
              </Text>
            )}
            <Group gap={8} wrap="wrap" justify="space-between">
              <Text size="xs" c="dimmed">
                {formatDateTime(d.createdAt)}
              </Text>
              {pic && (
                <Text size="xs" c="dimmed">
                  {pic}
                </Text>
              )}
            </Group>
          </Stack>
        );
      }}
    />
  );
}
