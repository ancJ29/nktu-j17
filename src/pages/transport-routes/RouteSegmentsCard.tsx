import { Button, Group, NumberInput, Table, Text } from '@mantine/core';
import { IconPlus, IconRoute } from '@tabler/icons-react';
import type { UseFormReturnType } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/components/SectionCard';
import { blankSegment, type RouteFormValues } from './routeFormValues';
import { routeDistanceTotal } from './routeCosting';
import { RoutePlaceInput, RouteRowRemove } from './RouteFormRow';

type Props = {
  readonly form: UseFormReturnType<RouteFormValues>;
  readonly suggestions: string[];
};

/**
 * QUÃNG ĐƯỜNG TỪNG ĐOẠN — the measured stretches of a **single-leg** route.
 *
 * Rendered on that shape only. A multi-leg route has legs to mirror
 * (`RouteLegsCard` owns its km column), whereas a one-leg run genuinely has
 * more measured stretches than its three named stops — "Bãi xe → Cảng → Bến
 * Lức" is one commercial leg and two measurements. That is the whole reason
 * `segments` is not `trips`.
 */
export function RouteSegmentsCard({ form, suggestions }: Props) {
  const { t } = useTranslation();
  const segments = form.values.segments;

  return (
    <SectionCard
      icon={<IconRoute size={14} />}
      title={t('transportRoutes.form.segmentsTitle')}
      actions={
        <Button
          size="compact-sm"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={() => form.insertListItem('segments', blankSegment())}
        >
          {t('transportRoutes.form.addSegment')}
        </Button>
      }
    >
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('transportRoutes.form.segmentFrom')}</Table.Th>
            <Table.Th>{t('transportRoutes.form.segmentTo')}</Table.Th>
            <Table.Th w={140}>{t('transportRoutes.form.distanceKm')}</Table.Th>
            <Table.Th w={40} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {segments.map((seg, i) => (
            <Table.Tr key={i}>
              <Table.Td>
                {/* The same suggestions the legs use — a segment is measured
                    between places the client already hauls to, so typing them
                    fresh would only mint spelling variants. */}
                <RoutePlaceInput
                  suggestions={suggestions}
                  title={seg.from || undefined}
                  {...form.getInputProps(`segments.${i}.from`)}
                />
              </Table.Td>
              <Table.Td>
                <RoutePlaceInput
                  suggestions={suggestions}
                  title={seg.to || undefined}
                  {...form.getInputProps(`segments.${i}.to`)}
                />
              </Table.Td>
              <Table.Td>
                <NumberInput
                  min={0}
                  decimalScale={1}
                  thousandSeparator=","
                  {...form.getInputProps(`segments.${i}.distanceKm`)}
                />
              </Table.Td>
              <Table.Td>
                <RouteRowRemove
                  disabled={segments.length === 1}
                  onClick={() => form.removeListItem('segments', i)}
                />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Group justify="flex-end" gap="md">
        <Text fw={600}>{t('transportRoutes.form.distanceTotal')}</Text>
        <Text fw={700}>
          {routeDistanceTotal({ segments }).toLocaleString('vi-VN')}{' '}
          {t('transportRoutes.costing.km')}
        </Text>
      </Group>
    </SectionCard>
  );
}
