import { Badge, Card, Group, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { lookupLabelOf, type useLookupV2Labels } from '@/hooks';
import { isDefaultLocation } from '@/types';

// `useTranslation` powers the default-location label only; the negative-state
// label is passed in so each section can supply its own existing i18n key.

type Props = {
  readonly locationCode: string;
  readonly onHand: number;
  readonly baseUnit: string;
  readonly baseUnitLabel: string;
  readonly unitLabels: ReturnType<typeof useLookupV2Labels>;
  readonly locationsEnabled: boolean;
  /** Resolved location record (or null when the row sits on the default sentinel). */
  readonly locationName?: string;
  /** Sparse per-unit breakdown — typically `row.extra?.onHandByUnit`. */
  readonly onHandByUnit?: Record<string, number>;
  /** When false, the breakdown badge row is skipped even if entries exist. */
  readonly showBreakdown: boolean;
  readonly clickable: boolean;
  readonly onClick?: () => void;
  /**
   * Optional dimmed caption under the location line (e.g. the inventory row's
   * `lastNote` on the product section).
   */
  readonly caption?: string;
  /**
   * Override color of the on-hand number. `undefined` lets the number render
   * in the default text color. Sections that flag low/negative stock pass
   * `'red'` / `'orange'` here.
   */
  readonly onHandColor?: string;
  /**
   * Extra inline badges shown next to the on-hand number — e.g. a "low"
   * badge that product wants but material doesn't. The negative-stock badge
   * is handled internally so both modules share the same red treatment.
   */
  readonly trailingBadges?: ReactNode;
  /** Localized "back-ordered"/"âm" label for the auto-rendered negative badge. */
  readonly negativeStateLabel: string;
};

/**
 * Per-row card for a section's inventory list. Used by both
 * `ProductInventorySection` and `MaterialInventorySection`. Renders a clickable
 * card with:
 *
 *  - location name (or a "Default" badge when the row sits on the sentinel)
 *  - optional caption (e.g. `lastNote` on product rows)
 *  - on-hand number + base-unit label
 *  - optional trailing badges (caller-supplied, e.g. product's low badge)
 *  - the universal red "Negative" badge when `onHand < 0`
 *  - per-unit breakdown badges (filtered to non-zero entries) when the
 *    entity has multiple units configured
 *
 * Module-specific state (low-stock thresholds, lastNote presence, etc.) is
 * computed by the section page and threaded in via the slot props — the row
 * card itself stays a layout primitive with no business logic.
 */
export function InventoryRowCard({
  locationCode,
  onHand,
  baseUnit,
  baseUnitLabel,
  unitLabels,
  locationsEnabled,
  locationName,
  onHandByUnit,
  showBreakdown,
  clickable,
  onClick,
  caption,
  onHandColor,
  trailingBadges,
  negativeStateLabel,
}: Props) {
  const { t } = useTranslation();
  const isEmpty = isDefaultLocation(locationCode);
  const isNegative = onHand < 0;
  const resolvedColor = onHandColor ?? (isNegative ? 'red' : undefined);

  const breakdownEntries =
    showBreakdown && onHandByUnit ? Object.entries(onHandByUnit).filter(([, q]) => q !== 0) : [];

  return (
    <Card
      withBorder
      radius="sm"
      padding="sm"
      style={{ cursor: clickable ? 'pointer' : undefined }}
      onClick={onClick}
    >
      <Stack gap={6}>
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={2}>
            {locationsEnabled && (
              <Group gap={6} wrap="nowrap">
                {isEmpty ? (
                  <Badge variant="light" color="gray" size="sm" radius="sm" tt="none">
                    {t('common.labels.defaultLocation')}
                  </Badge>
                ) : (
                  <Text size="sm" fw={500}>
                    {locationName ?? locationCode}
                  </Text>
                )}
              </Group>
            )}
            {caption && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {caption}
              </Text>
            )}
          </Stack>
          <Group gap={6} wrap="nowrap" align="baseline">
            <Text size="lg" fw={700} c={resolvedColor}>
              {onHand.toLocaleString()}
            </Text>
            <Text size="xs" c="dimmed">
              {baseUnitLabel}
            </Text>
            {isNegative && (
              <Badge size="xs" variant="filled" color="red" radius="sm">
                {negativeStateLabel}
              </Badge>
            )}
            {trailingBadges}
          </Group>
        </Group>
        {breakdownEntries.length > 0 && (
          <Group gap={6} wrap="wrap">
            {breakdownEntries.map(([u, q]) => (
              <Badge
                key={u}
                variant="light"
                color={u === baseUnit ? 'blue' : 'gray'}
                size="sm"
                radius="sm"
                tt="none"
              >
                {q.toLocaleString()} {lookupLabelOf(unitLabels, u)}
              </Badge>
            ))}
          </Group>
        )}
      </Stack>
    </Card>
  );
}
