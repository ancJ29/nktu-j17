import { Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconBellOff } from '@tabler/icons-react';
import type { DataTableColumn } from '@credo/base-ui/components';
import type { InventoryV2Row } from '@/types';
import { formatNumber } from '@/utils/number';
import { QuantityWithUnit } from './QuantityWithUnit';
import { forecastOf, stockLevelOf } from './stockLevel';

export function inventoryV2Column<Row extends { id: string }>(config: {
  readonly byItemId: ReadonlyMap<string, InventoryV2Row>;
  readonly header: string;

  readonly forecastLabel: string;

  readonly minOf?: (row: Row) => number | undefined;

  readonly alertsOffOf?: (row: Row) => boolean;

  readonly alertsOffTooltip?: string;

  readonly unitOf?: (row: Row) => string | undefined;
}): DataTableColumn<Row> {
  const { byItemId, header, forecastLabel, minOf, alertsOffOf, alertsOffTooltip, unitOf } = config;
  return {
    key: 'onHand',

    width: '160px',
    ta: 'right' as const,
    header,
    render: (row: Row) => {
      const stock = byItemId.get(row.id);
      const onHand = stock?.onHand ?? 0;
      const forecasted = forecastOf(stock);
      const alertsOff = alertsOffOf?.(row) === true;
      const level = stockLevelOf({ stock, min: minOf?.(row), alertsOff });
      return (
        <Stack gap={0} align="flex-end">
          <Group gap={4} wrap="nowrap" justify="flex-end">
            {alertsOff && alertsOffTooltip ? (
              <Tooltip label={alertsOffTooltip} withArrow multiline w={240}>
                <IconBellOff size={14} stroke={1.75} color="var(--mantine-color-dimmed)" />
              </Tooltip>
            ) : null}
            <QuantityWithUnit
              value={formatNumber(onHand)}
              unit={unitOf?.(row)}
              color={level === 'outOfStock' ? 'red' : level === 'mustOrder' ? 'orange' : undefined}
            />
          </Group>
          {forecasted !== onHand && (
            <Tooltip label={forecastLabel} withArrow>
              <Text size="xs" c="dimmed" ta="right">
                → {formatNumber(forecasted)}
              </Text>
            </Tooltip>
          )}
        </Stack>
      );
    },
  };
}

export function incomingV2Column<Row extends { id: string }>(config: {
  readonly byItemId: ReadonlyMap<string, InventoryV2Row>;
  readonly header: string;
  readonly unitOf?: (row: Row) => string | undefined;
}): DataTableColumn<Row> {
  const { byItemId, header, unitOf } = config;
  return {
    key: 'incoming',
    width: '140px',
    ta: 'right' as const,
    header,
    render: (row: Row) => {
      const incoming = byItemId.get(row.id)?.incoming ?? 0;
      if (incoming <= 0) return null;
      return (
        <QuantityWithUnit value={`+${formatNumber(incoming)}`} unit={unitOf?.(row)} color="blue" />
      );
    },
  };
}

export function outgoingV2Column<Row extends { id: string }>(config: {
  readonly byItemId: ReadonlyMap<string, InventoryV2Row>;
  readonly header: string;
  readonly unitOf?: (row: Row) => string | undefined;
}): DataTableColumn<Row> {
  const { byItemId, header, unitOf } = config;
  return {
    key: 'outgoing',
    width: '140px',
    ta: 'right' as const,
    header,
    render: (row: Row) => {
      const outgoing = byItemId.get(row.id)?.outgoing ?? 0;
      if (outgoing <= 0) return null;
      return (
        <QuantityWithUnit
          value={`−${formatNumber(outgoing)}`}
          unit={unitOf?.(row)}
          color="orange"
        />
      );
    },
  };
}
