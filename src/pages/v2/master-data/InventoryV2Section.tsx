import { Badge, Button, Card, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBuildingWarehouse, IconPackage, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import { InventoryRowCard } from '@/components/inventory/InventoryRowCard';
import { InventorySecondaryStatusBadge } from '@/components/inventory/InventorySecondaryStatusBadge';
import { DEFAULT_LOCATION_CODE } from '@/types';
import { formatNumber } from '@/utils/number';
import type { InventoryV2Store } from '@/stores/createInventoryV2Store';
import { InventoryV2UpdateModal } from './InventoryV2UpdateModal';
import { stockLevelOf } from './stockLevel';
import { useInventoryV2 } from './useInventoryV2';

const isMobile = device.isMobile;

export function InventoryV2Section({
  row,
  useStore,
  canManage,
  unit,
  minStock,
  alertsOff = false,
}: {
  readonly row: { readonly id: string; readonly name: string };
  readonly useStore: InventoryV2Store;

  readonly canManage: boolean;

  readonly unit?: string | undefined;

  readonly minStock?: number | undefined;

  readonly alertsOff?: boolean;
}) {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);

  const canWrite = canManage && !isMobile;

  const { byItemId, loading } = useInventoryV2(useStore, true);
  const forceRefresh = useStore((s) => s.forceRefresh);
  const stock = byItemId.get(row.id);

  const level = stock ? stockLevelOf({ stock, min: minStock, alertsOff }) : undefined;

  return (
    <>
      <Card withBorder radius="md" padding="md">
        <Stack gap="md">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size={28} radius="md" variant="light" color="teal">
                <IconBuildingWarehouse size={16} stroke={1.75} />
              </ThemeIcon>
              <Stack gap={0}>
                {/* No on-hand line here — the row card two lines down IS that
                    number, and the card saying it twice was the noisier copy.
                    What rides the title instead is what the figure alone cannot
                    say: inbound, the threshold, and the warning. */}
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    {t('inventoryV2.title')}
                  </Text>
                  {/* One slot, two answers: the level it earned, or the badge
                      saying it is not being judged. Never both, and never
                      neither — an empty slot on an opted-out item reads as a
                      healthy one. */}
                  {alertsOff ? (
                    <Badge size="xs" variant="light" color="orange" radius="sm">
                      {t('inventoryV2.alertsOff')}
                    </Badge>
                  ) : (
                    level &&
                    level !== 'ok' && <InventorySecondaryStatusBadge status={level} size="xs" />
                  )}
                </Group>
                {/* Drawn only when something is inbound — the figure is the sum
                    of this item's open goods-receipt drafts, so a zero is not a
                    reading but an absence of one. */}
                {!!stock?.incoming && (
                  <Text size="xs" fw={600} c="blue">
                    {t('inventoryV2.incoming')}: +{formatNumber(stock.incoming)}
                    {unit ? ` ${unit}` : ''}
                  </Text>
                )}
                {/* The locked mirror, on the same data-gates-it rule. */}
                {!!stock?.outgoing && (
                  <Text size="xs" fw={600} c="orange">
                    {t('inventoryV2.outgoing')}: {formatNumber(stock.outgoing)}
                    {unit ? ` ${unit}` : ''}
                  </Text>
                )}
                {minStock !== undefined && stock && (
                  <Text size="xs" fw={600} c="dimmed">
                    {t('inventoryV2.minStock')}: {formatNumber(minStock)}
                    {unit ? ` ${unit}` : ''}
                  </Text>
                )}
              </Stack>
            </Group>
            {canWrite && stock && (
              <Button variant="light" size="compact-sm" onClick={open}>
                {t('inventoryV2.updateStock')}
              </Button>
            )}
          </Group>

          {/* An item never counted has no row, which is not the same as a
              counted zero — the empty state is where that can be acted on. */}
          {!stock ? (
            <Stack align="center" gap="sm" py="md">
              <ThemeIcon size={40} radius="xl" variant="light" color="gray">
                <IconPackage size={20} stroke={1.5} />
              </ThemeIcon>
              {/* Silent until the register has answered: "never counted" is a
                  claim about the data, and a first read is not evidence for it. */}
              {!loading && (
                <Text size="sm" c="dimmed">
                  {t('inventoryV2.neverCounted')}
                </Text>
              )}
              {canWrite && !loading && (
                <Button
                  variant="light"
                  size="compact-sm"
                  leftSection={<IconPlus size={14} />}
                  onClick={open}
                >
                  {t('common.detail.inventoryTab.addFirst')}
                </Button>
              )}
            </Stack>
          ) : (
            <Stack gap="xs">
              <InventoryRowCard
                locationCode={DEFAULT_LOCATION_CODE}
                onHand={stock.onHand}
                baseUnit=""
                baseUnitLabel={unit ?? ''}
                unitLabels={new Map()}
                locationsEnabled={false}
                showBreakdown={false}
                clickable={canWrite}
                onClick={canWrite ? open : undefined}
                caption={stock.note}
                negativeStateLabel={t('inventoryV2.negative')}
              />
              <Text
                size="xs"
                c="dimmed"
                ta="right"
                fs="italic"
                style={{ cursor: 'pointer' }}
                onClick={() => void forceRefresh()}
              >
                {t('common.detail.inventoryTab.refresh')}
              </Text>
            </Stack>
          )}
        </Stack>
      </Card>

      {/* Keyed on the stored row so the form starts from what IS stored — a
          count landing while this is closed must not be edited against a
          number the modal captured earlier. */}
      {canWrite && (
        <InventoryV2UpdateModal
          key={stock?.version ?? 'uncounted'}
          opened={opened}
          onClose={close}
          row={stock}
          itemId={row.id}
          itemName={row.name}
          unit={unit}
          useStore={useStore}
        />
      )}
    </>
  );
}
