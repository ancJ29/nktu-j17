import {
  Button,
  Card,
  Divider,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconBucketDroplet, IconHash } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { useOilTankStore, OIL_TANK_RECORD_TARGET } from '@/stores/useOilTankStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { device } from '@credo/base-ui/utils';
import { DatePickerField } from '@/components/DatePickerField';
import { useInitFormFromFetch } from '@/hooks';
import { logActivity } from '@/utils/activityLogger';
import { deepDiff } from '@/utils/deepDiff';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { perms } from '@/utils/permission';
import type { OilTankExtra, OilTankRow } from '@/types';
import { buildNextOilTankCode } from './oilTankCode';
import { Form } from '@/components/Form';

const isMobile = device.isMobile;

type OilTankFormValues = {
  name: string;
  code: string;
  fuelType: string;
  location: string;
  capacity: number | string;
  openingLevel: number | string;
  openingDate: string;
  note: string;
  isActive: boolean;
};

export function OilTankFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  useEffect(() => {
    if (
      isMobile ||
      (isEdit && !perms.oilTank.canEdit()) ||
      (!isEdit && !perms.oilTank.canCreate())
    ) {
      navigate(ROUTES.OIL_TANKS.LIST, { replace: true });
    }
  }, [navigate, isEdit]);

  const [loading, setLoading] = useState(false);
  const snapshotRef = useRef<OilTankRow | null>(null);

  const tanks = useOilTankStore((s) => s.items);
  const initialized = useOilTankStore((s) => s.initialized);
  const loadAll = useOilTankStore((s) => s.loadAll);
  useEffect(() => {
    if (!initialized) loadAll();
  }, [initialized, loadAll]);

  const nextCode = useMemo(
    () => buildNextOilTankCode((tanks as OilTankRow[]).map((row) => row.code)),
    [tanks],
  );

  const form = useForm<OilTankFormValues>({
    initialValues: {
      name: '',
      code: '',
      fuelType: '',
      location: '',
      capacity: '',
      openingLevel: '',
      openingDate: todayInVnDateString(),
      note: '',
      isActive: true,
    },
    validate: {
      name: (v) => (v.trim() ? null : t('common.validation.nameRequired')),
      capacity: (v) =>
        v === '' || Number(v) >= 0 ? null : t('oilTanks.validation.capacityInvalid'),
      openingLevel: (v) =>
        v === '' || Number(v) >= 0 ? null : t('oilTanks.validation.levelInvalid'),
    },
  });

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (id) => {
      const res = await cMngtConnector.getSingleRecordById(OIL_TANK_RECORD_TARGET, { id });
      const tank = res.item as OilTankRow;
      snapshotRef.current = tank;
      const e = tank.extra ?? {};
      return {
        name: tank.name,
        code: tank.code,
        fuelType: e.fuelType ?? '',
        location: e.location ?? '',
        capacity: e.capacity ?? '',
        openingLevel: e.openingLevel ?? '',
        openingDate: e.openingDate ?? '',
        note: e.note ?? '',
        isActive: tank.isActive,
      };
    },
    () => {
      notifications.show({ color: 'red', message: t('oilTanks.notifications.fetchError') });
      navigate(ROUTES.OIL_TANKS.LIST);
    },
  );

  const handleSubmit = useCallback(
    async (values: OilTankFormValues) => {
      setLoading(true);

      const buildExtra = (base?: OilTankExtra): OilTankExtra => {
        const extra: OilTankExtra = { ...(base ?? {}) };
        for (const key of ['fuelType', 'location', 'note'] as const) {
          const raw = values[key].trim();
          if (raw) extra[key] = raw;
          else delete extra[key];
        }

        if (values.capacity === '' || !Number.isFinite(Number(values.capacity))) {
          delete extra.capacity;
        } else {
          extra.capacity = Number(values.capacity);
        }
        return extra;
      };

      try {
        const core = { name: values.name.trim(), isActive: values.isActive };

        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Oil tank snapshot missing');
          const patchExtra = buildExtra(snapshot.extra);
          const updated = await useOilTankStore.getState().updateSafely({
            id,
            version: snapshot.version,

            patch: { ...core, extra: patchExtra },
          });
          snapshotRef.current = updated as OilTankRow;
          const diff = deepDiff(
            { name: snapshot.name, isActive: snapshot.isActive, ...(snapshot.extra ?? {}) },
            { name: core.name, isActive: core.isActive, ...patchExtra },
          );

          const onlyIsActive = Object.keys(diff ?? {}).length === 1 && 'isActive' in (diff ?? {});
          logActivity(onlyIsActive ? 'oilTank.toggleStatus' : 'oilTank.update', id, diff);
          notifications.show({
            color: 'green',
            message: t('oilTanks.notifications.updateSuccess'),
          });
          navigate(ROUTES.OIL_TANKS.DETAIL.replace(':id', id));
        } else {
          const opening =
            values.openingLevel === '' || !Number.isFinite(Number(values.openingLevel))
              ? 0
              : Number(values.openingLevel);
          const extra = buildExtra();
          extra.openingLevel = opening;
          extra.openingDate = values.openingDate || todayInVnDateString();
          extra.currentLevel = opening;

          const created = await useOilTankStore.getState().createSafely({
            patch: { ...core, code: nextCode, isActive: true, extra },
          });
          logActivity('oilTank.create', created.id);
          notifications.show({
            color: 'green',
            message: t('oilTanks.notifications.createSuccess'),
          });
          navigate(ROUTES.OIL_TANKS.DETAIL.replace(':id', created.id));
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as OilTankRow;
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: isEdit
              ? t('oilTanks.notifications.updateError')
              : t('oilTanks.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, nextCode, t, navigate],
  );

  const navigateToList = useCallback(() => navigate(ROUTES.OIL_TANKS.LIST), [navigate]);

  if (fetching) return null;

  const pageTitle = isEdit ? t('oilTanks.editItem') : t('oilTanks.addItem');

  return (
    <Stack gap="lg">
      {!isMobile && (
        <Group gap="sm">
          <Button
            onClick={() => window.history.back()}
            variant="subtle"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('__new__.01-common.actions.back')}
          </Button>
        </Group>
      )}

      <Title order={isMobile ? 4 : 3}>{pageTitle}</Title>

      {}
      <Form form={form} onSubmit={handleSubmit}>
        <Stack gap="md">
          <Card withBorder radius="md" padding="lg">
            <Group gap="xs" mb="xs">
              <ThemeIcon size={28} radius="md" variant="light" color="primary">
                <IconBucketDroplet size={16} stroke={1.75} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                {t('oilTanks.form.primarySection')}
              </Text>
            </Group>
            <Divider mb="md" />
            <Stack gap="md">
              <TextInput
                label={t('common.labels.name')}
                placeholder={t('oilTanks.form.namePlaceholder')}
                withAsterisk
                size="md"
                {...form.getInputProps('name')}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {/* Auto-allocated and locked, like the truck code — the operator
                    never picks it, and an editable field would invite a
                    duplicate the server would then reject at save. */}
                <TextInput
                  label={t('common.labels.code')}
                  description={t('oilTanks.form.codeAuto')}
                  leftSection={<IconHash size={14} />}
                  variant="filled"
                  readOnly
                  styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
                  value={isEdit ? form.values.code : nextCode}
                />
                <NumberInput
                  label={t('oilTanks.form.capacityLabel')}
                  placeholder={t('oilTanks.form.capacityPlaceholder')}
                  description={t('oilTanks.form.capacityHint')}
                  min={0}
                  thousandSeparator=","
                  suffix=" L"
                  {...form.getInputProps('capacity')}
                />
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label={t('oilTanks.form.fuelTypeLabel')}
                  placeholder={t('oilTanks.form.fuelTypePlaceholder')}
                  {...form.getInputProps('fuelType')}
                />
                <TextInput
                  label={t('oilTanks.form.locationLabel')}
                  placeholder={t('oilTanks.form.locationPlaceholder')}
                  {...form.getInputProps('location')}
                />
              </SimpleGrid>
              <Textarea
                label={t('__new__.01-common.labels.note')}
                placeholder={t('oilTanks.form.notePlaceholder')}
                autosize
                minRows={2}
                maxRows={6}
                {...form.getInputProps('note')}
              />
            </Stack>
          </Card>

          {/* Create-only. On edit these are read-only on the detail page: the
              opening balance anchors every later figure, so restating it after
              movements exist would silently rewrite the tank's whole history. */}
          {!isEdit && (
            <Card withBorder radius="md" padding="lg">
              <Text fw={600} size="sm" mb="xs">
                {t('oilTanks.form.openingSection')}
              </Text>
              <Text size="xs" c="dimmed" mb="md">
                {t('oilTanks.form.openingHint')}
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <NumberInput
                  label={t('oilTanks.form.openingLevelLabel')}
                  placeholder={t('oilTanks.form.openingLevelPlaceholder')}
                  min={0}
                  thousandSeparator=","
                  suffix=" L"
                  {...form.getInputProps('openingLevel')}
                />
                <DatePickerField
                  label={t('oilTanks.form.openingDateLabel')}
                  clearable={false}
                  {...form.getInputProps('openingDate')}
                  value={String(form.values.openingDate)}
                />
              </SimpleGrid>
            </Card>
          )}

          {isEdit && (
            <Card withBorder radius="md" padding="lg">
              <Switch
                label={t('__new__.01-common.labels.active')}
                {...form.getInputProps('isActive', { type: 'checkbox' })}
              />
            </Card>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="sm" disabled={loading} onClick={navigateToList}>
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button type="submit" loading={loading} size="sm">
              {isEdit ? t('__new__.01-common.actions.save') : t('oilTanks.form.createButton')}
            </Button>
          </Group>
        </Stack>
      </Form>
    </Stack>
  );
}
