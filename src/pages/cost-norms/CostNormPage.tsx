import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Stack,
  Table,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCheck,
  IconGasStation,
  IconInfoCircle,
  IconPencil,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '@credo/base-ui/utils';
import { DatePickerField } from '@/components/DatePickerField';
import { DesktopOnlyGuard } from '@/components/DesktopOnlyGuard';
import { Form } from '@/components/Form';
import { SectionCard } from '@/components/SectionCard';
import { getCurrentEmployeeStamp } from '@/hooks';
import { useAuthStore } from '@/stores/useAuthStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useFuelNormStore } from '@/stores/useFuelNormStore';
import { useFuelPriceStore } from '@/stores/useFuelPriceStore';
import { formatDate } from '@/utils/dateFormat';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { perms } from '@/utils/permission';
import type { FuelNormRow, FuelPriceRow } from '@/types';
import { formatMoney } from '../transport-orders/transportOrderPricing';
import { useTruckTypeOptions } from '../transport-routes/truckType';
import { useTransportRouteStore } from '@/stores/useTransportRouteStore';
import { routeUsesFuelPricing } from '../transport-routes/routeCosting';
import { isScheduledFuelPrice, resolveCurrentFuelPrice, sortFuelPriceHistory } from './fuelPrice';
import { buildUpdatedByStamp, readUpdatedByName } from './updatedBy';

const canEdit = perms.costNorm.canEdit();

function formatDay(value: string | undefined): string {
  if (!value || value.length < 10) return '—';
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

type NormRow = {
  truckType: string;
  label: string;
  norm: FuelNormRow | undefined;

  orphaned: boolean;
};

type PriceFormValues = { price: number; effectiveDate: string; notes: string };

export function CostNormPage() {
  const { t } = useTranslation();

  const normItems = useFuelNormStore((s) => s.items);
  const normsInit = useFuelNormStore((s) => s.initialized);
  const loadNorms = useFuelNormStore((s) => s.loadAll);
  const createNorm = useFuelNormStore((s) => s.createSafely);
  const updateNorm = useFuelNormStore((s) => s.updateSafely);

  const priceItems = useFuelPriceStore((s) => s.items);
  const pricesInit = useFuelPriceStore((s) => s.initialized);
  const loadPrices = useFuelPriceStore((s) => s.loadAll);
  const createPrice = useFuelPriceStore((s) => s.createSafely);

  const routesInit = useTransportRouteStore((s) => s.initialized);
  const loadRoutes = useTransportRouteStore((s) => s.loadAll);

  useEffect(() => {
    if (!normsInit) void loadNorms();
    if (!pricesInit) void loadPrices();
    if (!routesInit) void loadRoutes();
  }, [normsInit, loadNorms, pricesInit, loadPrices, routesInit, loadRoutes]);

  const truckTypeOptions = useTruckTypeOptions();
  const today = todayInVnDateString();

  const history = useMemo(() => sortFuelPriceHistory(priceItems), [priceItems]);
  const current = useMemo(() => resolveCurrentFuelPrice(priceItems, today), [priceItems, today]);

  const [priceModal, priceModalHandlers] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  const priceForm = useForm<PriceFormValues>({
    initialValues: { price: 0, effectiveDate: today, notes: '' },
    validate: {
      price: (v) => (v > 0 ? null : t('costNorms.validation.priceRequired')),
      effectiveDate: (v) =>
        /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : t('costNorms.validation.effectiveDateRequired'),
    },
  });

  const affectedRouteCodes = useCallback((): string[] => {
    const normByType = new Map(
      useFuelNormStore
        .getState()
        .items.filter((n) => !n.extra?.isDeleted)
        .map((n) => [n.truckType, n.litersPer100km || 0]),
    );
    return useTransportRouteStore
      .getState()
      .items.filter((r) => !r.extra?.isDeleted && r.isActive)
      .filter((r) => routeUsesFuelPricing(r, r.truckType ? normByType.get(r.truckType) : undefined))
      .map((r) => r.code);
  }, []);

  const openPriceModal = useCallback(() => {
    priceForm.setValues({ price: current?.price ?? 0, effectiveDate: today, notes: '' });
    priceForm.resetDirty();
    priceModalHandlers.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mantine mints a new `form` object every render.
  }, [current, today, priceModalHandlers]);

  const submitPrice = useCallback(
    async (values: PriceFormValues) => {
      setSaving(true);
      try {
        const stamp = buildUpdatedByStamp(getCurrentEmployeeStamp(), useAuthStore.getState().user);
        const notes = values.notes.trim();
        const affected = affectedRouteCodes();
        await createPrice({
          patch: {
            price: values.price,
            effectiveDate: values.effectiveDate,
            extra: {
              ...stamp,
              ...(notes ? { notes } : {}),

              affectedRouteCodes: affected,
            },
          },
        });
        notifications.show({
          color: 'green',

          message: affected.length
            ? t('costNorms.notifications.priceSavedAffecting', { count: affected.length })
            : t('costNorms.notifications.priceSaved'),
        });
        priceModalHandlers.close();
      } catch (err) {
        logger.error('Fuel price create failed:', err);
        notifications.show({ color: 'red', message: t('costNorms.notifications.priceError') });
      } finally {
        setSaving(false);
      }
    },
    [createPrice, t, priceModalHandlers, affectedRouteCodes],
  );

  const normRows = useMemo<NormRow[]>(() => {
    const live = normItems.filter((n) => !n.extra?.isDeleted);
    const byType = new Map(live.map((n) => [n.truckType, n]));
    const rows: NormRow[] = truckTypeOptions.map((opt) => ({
      truckType: opt.value,
      label: opt.label,
      norm: byType.get(opt.value),
      orphaned: false,
    }));

    const known = new Set(rows.map((r) => r.truckType));
    for (const norm of live) {
      if (known.has(norm.truckType)) continue;
      rows.push({ truckType: norm.truckType, label: norm.truckType, norm, orphaned: true });
    }
    return rows;
  }, [normItems, truckTypeOptions]);

  const [editingType, setEditingType] = useState<string | null>(null);
  const [draftNorm, setDraftNorm] = useState<number>(0);

  const startEdit = (row: NormRow) => {
    setEditingType(row.truckType);
    setDraftNorm(row.norm?.litersPer100km ?? 0);
  };

  const saveNorm = useCallback(
    async (row: NormRow, value: number) => {
      setSaving(true);
      try {
        const stamp = buildUpdatedByStamp(getCurrentEmployeeStamp(), useAuthStore.getState().user);
        if (row.norm) {
          await updateNorm({
            id: row.norm.id,
            version: row.norm.version,

            patch: {
              litersPer100km: value,
              extra: { ...row.norm.extra, ...stamp },
            },
          });
        } else {
          await createNorm({
            patch: { truckType: row.truckType, litersPer100km: value, extra: { ...stamp } },
          });
        }
        notifications.show({ color: 'green', message: t('costNorms.notifications.normSaved') });
        setEditingType(null);
      } catch (err) {
        logger.error('Fuel norm save failed:', err);
        if (err instanceof EntityConflictError) {
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({ color: 'red', message: t('costNorms.notifications.normError') });
        }
      } finally {
        setSaving(false);
      }
    },
    [createNorm, updateNorm, t],
  );

  const missingNormCount = normRows.filter((r) => !r.norm).length;

  return (
    <DesktopOnlyGuard>
      <Stack gap="lg">
        <Group gap="sm" align="center">
          <ThemeIcon variant="light" size="lg" radius="md">
            <IconGasStation size={18} />
          </ThemeIcon>
          <div>
            <Title order={3}>{t('costNorms.title')}</Title>
            <Text size="sm" c="dimmed">
              {t('costNorms.subtitle')}
            </Text>
          </div>
        </Group>

        {/* The headline figure. One card, one button — the whole point of the
            page is that this is the only place a diesel price is typed. */}
        <Card withBorder radius="md" padding="lg">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap={2}>
              <Text size="sm" c="dimmed">
                {t('costNorms.price.currentLabel')}
              </Text>
              <Group gap="xs" align="baseline">
                <Text fz={32} fw={700} lh={1.1}>
                  {current ? formatMoney(current.price) : '—'}
                </Text>
                <Text size="sm" c="dimmed">
                  {t('costNorms.price.perLiter')}
                </Text>
              </Group>
              {current ? (
                <Text size="sm" c="dimmed">
                  {t('costNorms.price.effectiveSince', {
                    date: formatDay(current.effectiveDate),
                  })}
                  {readUpdatedByName(current.extra)
                    ? ` · ${t('costNorms.columns.updatedBy')}: ${readUpdatedByName(current.extra)}`
                    : ''}
                </Text>
              ) : (
                <Text size="sm" c="orange">
                  {t('costNorms.price.none')}
                </Text>
              )}
            </Stack>

            {canEdit && (
              <Button leftSection={<IconGasStation size={16} />} onClick={openPriceModal}>
                {t('costNorms.price.update')}
              </Button>
            )}
          </Group>
        </Card>

        {/* ── ĐỊNH MỨC TIÊU HAO DẦU ───────────────────────────────────────── */}
        <SectionCard icon={<IconGasStation size={14} />} title={t('costNorms.norms.title')}>
          {truckTypeOptions.length === 0 && (
            <Alert color="yellow" variant="light" icon={<IconInfoCircle size={16} />} mb="sm">
              {t('costNorms.norms.noTruckTypes')}
            </Alert>
          )}
          {missingNormCount > 0 && truckTypeOptions.length > 0 && (
            <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />} mb="sm">
              {t('costNorms.norms.missingWarning', { count: missingNormCount })}
            </Alert>
          )}

          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('costNorms.columns.truckType')}</Table.Th>
                <Table.Th w={220}>{t('costNorms.columns.litersPer100km')}</Table.Th>
                <Table.Th w={150}>{t('costNorms.columns.updatedAt')}</Table.Th>
                <Table.Th w={200}>{t('costNorms.columns.updatedBy')}</Table.Th>
                <Table.Th w={110} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {normRows.map((row) => {
                const editing = editingType === row.truckType;
                return (
                  <Table.Tr key={row.truckType}>
                    <Table.Td>
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          {row.label}
                        </Text>
                        {row.orphaned && (
                          <Tooltip label={t('costNorms.norms.orphanedHint')} withArrow>
                            <Badge size="xs" variant="light" color="gray" tt="none" radius="sm">
                              {t('costNorms.norms.orphaned')}
                            </Badge>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {editing ? (
                        <NumberInput
                          size="xs"
                          min={0}
                          decimalScale={2}
                          step={0.5}
                          value={draftNorm}
                          onChange={(v) => setDraftNorm(typeof v === 'number' ? v : 0)}
                          autoFocus
                        />
                      ) : row.norm ? (
                        <Text size="sm">
                          {row.norm.litersPer100km} {t('costNorms.norms.unit')}
                        </Text>
                      ) : (
                        <Text size="sm" c="orange" fs="italic">
                          {t('costNorms.norms.unset')}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {row.norm ? formatDate(row.norm.updatedAt) : '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        {readUpdatedByName(row.norm?.extra) || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {canEdit &&
                        (editing ? (
                          <Group gap={4} wrap="nowrap">
                            <ActionIcon
                              color="green"
                              variant="light"
                              loading={saving}
                              onClick={() => void saveNorm(row, draftNorm)}
                              aria-label={t('__new__.01-common.actions.save')}
                            >
                              <IconCheck size={16} />
                            </ActionIcon>
                            <ActionIcon
                              color="gray"
                              variant="subtle"
                              disabled={saving}
                              onClick={() => setEditingType(null)}
                              aria-label={t('__new__.01-common.actions.cancel')}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </Group>
                        ) : (
                          <Button
                            size="compact-xs"
                            variant="subtle"
                            leftSection={<IconPencil size={14} />}
                            onClick={() => startEdit(row)}
                          >
                            {t('__new__.01-common.actions.edit')}
                          </Button>
                        ))}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {normRows.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text size="sm" c="dimmed" ta="center" py="md">
                      {t('costNorms.norms.empty')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </SectionCard>

        {/* ── LỊCH SỬ THAY ĐỔI GIÁ DẦU ────────────────────────────────────── */}
        <SectionCard icon={<IconGasStation size={14} />} title={t('costNorms.history.title')}>
          <Text size="sm" c="dimmed" mb="sm">
            {t('costNorms.history.hint')}
          </Text>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={170}>{t('costNorms.columns.effectiveDate')}</Table.Th>
                <Table.Th w={180}>{t('costNorms.columns.price')}</Table.Th>
                <Table.Th w={150}>{t('costNorms.columns.updatedAt')}</Table.Th>
                <Table.Th w={200}>{t('costNorms.columns.updatedBy')}</Table.Th>
                <Table.Th w={190}>{t('costNorms.columns.affectedRoutes')}</Table.Th>
                <Table.Th>{t('costNorms.columns.notes')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {history.map((row: FuelPriceRow) => {
                const scheduled = isScheduledFuelPrice(row, today);
                const inForce = current?.id === row.id;
                return (
                  <Table.Tr key={row.id}>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Text size="sm">{formatDay(row.effectiveDate)}</Text>
                        {/* A future-dated entry changes nothing today. Badging it
                            is what keeps "I already updated the price" from
                            reading as a bug when the giá vốn has not moved. */}
                        {scheduled && (
                          <Badge size="xs" variant="light" color="blue" tt="none" radius="sm">
                            {t('costNorms.history.scheduled')}
                          </Badge>
                        )}
                        {inForce && (
                          <Badge size="xs" variant="light" color="green" tt="none" radius="sm">
                            {t('costNorms.history.inForce')}
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={inForce ? 600 : undefined}>
                        {formatMoney(row.price)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {formatDate(row.createdAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        {readUpdatedByName(row.extra) || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {/* Absent means "written before this was recorded", which
                          is not the same as zero — so it reads as an em dash
                          rather than "0 tuyến". */}
                      {row.extra?.affectedRouteCodes ? (
                        <Tooltip
                          multiline
                          w={280}
                          withArrow
                          disabled={row.extra.affectedRouteCodes.length === 0}
                          label={row.extra.affectedRouteCodes.join(', ')}
                        >
                          <Text
                            size="sm"
                            c={row.extra.affectedRouteCodes.length ? undefined : 'dimmed'}
                          >
                            {t('costNorms.history.affectedRoutes', {
                              count: row.extra.affectedRouteCodes.length,
                            })}
                          </Text>
                        </Tooltip>
                      ) : (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={1} title={row.extra?.notes}>
                        {row.extra?.notes || '—'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {history.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text size="sm" c="dimmed" ta="center" py="md">
                      {t('costNorms.history.empty')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </SectionCard>

        <Modal
          opened={priceModal}
          onClose={priceModalHandlers.close}
          title={t('costNorms.price.update')}
          centered
        >
          <Form form={priceForm} onSubmit={submitPrice}>
            <Stack gap="sm">
              <NumberInput
                withAsterisk
                label={t('costNorms.price.newPrice')}
                description={t('costNorms.price.perLiter')}
                thousandSeparator=","
                min={0}
                data-autofocus
                {...priceForm.getInputProps('price')}
              />
              {/* Defaults to today and stays editable, because the client asked
                  for it: a price announced on Friday for Monday is entered on
                  Friday. `resolveCurrentFuelPrice` is what keeps that from
                  re-pricing the weekend. */}
              <DatePickerField
                withAsterisk
                label={t('costNorms.price.effectiveDate')}
                clearable={false}
                {...priceForm.getInputProps('effectiveDate')}
                value={priceForm.values.effectiveDate}
              />
              <Textarea
                label={t('costNorms.price.notes')}
                autosize
                minRows={2}
                {...priceForm.getInputProps('notes')}
              />
              <Group justify="flex-end" gap="sm" mt="xs">
                <Button variant="default" onClick={priceModalHandlers.close} disabled={saving}>
                  {t('__new__.01-common.actions.cancel')}
                </Button>
                <Button type="submit" loading={saving}>
                  {t('__new__.01-common.actions.save')}
                </Button>
              </Group>
            </Stack>
          </Form>
        </Modal>
      </Stack>
    </DesktopOnlyGuard>
  );
}
