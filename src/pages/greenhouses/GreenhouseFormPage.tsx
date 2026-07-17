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
import { IconArrowLeft, IconBuildingWarehouse, IconHash } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { useGreenhouseStore, GREENHOUSE_RECORD_TARGET } from '@/stores/useGreenhouseStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { device } from '@credo/base-ui/utils';
import { useInitFormFromFetch } from '@/hooks';
import { perms } from '@/utils/permission';
import type { Greenhouse, GreenhouseExtra } from '@/types';

const isMobile = device.isMobile;

type GreenhouseFormValues = {
  name: string;
  code: string;
  description: string;
  area: number | string;
  isActive: boolean;
  notes: string;
};

export function GreenhouseFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  useEffect(() => {
    if (
      isMobile ||
      (isEdit && !perms.greenhouse.canEdit()) ||
      (!isEdit && !perms.greenhouse.canCreate())
    ) {
      navigate(ROUTES.GREENHOUSES.LIST, { replace: true });
    }
  }, [navigate, isEdit]);

  const [loading, setLoading] = useState(false);
  const snapshotRef = useRef<Greenhouse | null>(null);

  const form = useForm<GreenhouseFormValues>({
    initialValues: {
      name: '',
      code: '',
      description: '',
      area: '',
      isActive: true,
      notes: '',
    },
    validate: {
      name: (v) => (v.trim() ? null : t('common.validation.nameRequired')),
      code: (v) => (v.trim() ? null : t('common.validation.codeRequired')),
      area: (v) => (v === '' || Number(v) >= 0 ? null : t('greenhouses.validation.areaInvalid')),
    },
  });

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (id) => {
      const res = await cMngtConnector.getSingleRecordById(GREENHOUSE_RECORD_TARGET, { id });
      const g = res.item as Greenhouse;
      snapshotRef.current = g;
      return {
        name: g.name,
        code: g.code,
        description: g.description || '',
        area: g.area || '',
        isActive: g.isActive,
        notes: g.extra?.notes ?? '',
      };
    },
    () => {
      notifications.show({ color: 'red', message: t('greenhouses.notifications.fetchError') });
      navigate(ROUTES.GREENHOUSES.LIST);
    },
  );

  const handleSubmit = useCallback(
    async (values: GreenhouseFormValues) => {
      setLoading(true);
      
      
      const buildExtra = (base?: GreenhouseExtra): GreenhouseExtra => {
        const extra: GreenhouseExtra = { ...(base ?? {}) };
        if (values.notes.trim()) extra.notes = values.notes.trim();
        else delete extra.notes;
        return extra;
      };
      try {
        const area = values.area === '' ? 0 : Number(values.area);
        const core = {
          name: values.name.trim(),
          code: values.code.trim(),
          description: values.description.trim(),
          area,
          isActive: values.isActive,
        };

        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Greenhouse snapshot missing');
          const updated = await useGreenhouseStore.getState().updateSafely({
            id,
            version: snapshot.version,
            patch: { ...core, extra: buildExtra(snapshot.extra) },
          });
          snapshotRef.current = updated as Greenhouse;
          notifications.show({
            color: 'green',
            message: t('greenhouses.notifications.updateSuccess'),
          });
          navigate(ROUTES.GREENHOUSES.DETAIL.replace(':id', id));
        } else {
          
          
          const created = await useGreenhouseStore.getState().createSafely({
            patch: { ...core, isActive: true, extra: buildExtra() },
          });
          notifications.show({
            color: 'green',
            message: t('greenhouses.notifications.createSuccess'),
          });
          navigate(ROUTES.GREENHOUSES.DETAIL.replace(':id', created.id));
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as Greenhouse;
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
              ? t('greenhouses.notifications.updateError')
              : t('greenhouses.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, t, navigate],
  );

  const navigateToList = useCallback(() => navigate(ROUTES.GREENHOUSES.LIST), [navigate]);

  if (fetching) return null;

  const pageTitle = isEdit ? t('greenhouses.editItem') : t('greenhouses.addItem');

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

      {/* eslint-disable-next-line react-hooks/refs -- Mantine form.onSubmit() builds the submit handler during render by design; the internal ref read is safe. */}
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Card withBorder radius="md" padding="lg">
            <Group gap="xs" mb="xs">
              <ThemeIcon size={28} radius="md" variant="light" color="primary">
                <IconBuildingWarehouse size={16} stroke={1.75} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                {t('greenhouses.form.primarySection')}
              </Text>
            </Group>
            <Divider mb="md" />
            <Stack gap="md">
              <TextInput
                label={t('common.labels.name')}
                placeholder={t('greenhouses.form.namePlaceholder')}
                withAsterisk
                size="md"
                {...form.getInputProps('name')}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label={t('common.labels.code')}
                  placeholder={t('greenhouses.form.codePlaceholder')}
                  leftSection={<IconHash size={14} />}
                  withAsterisk
                  styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
                  disabled={isEdit}
                  {...form.getInputProps('code')}
                />
                <NumberInput
                  label={t('greenhouses.form.areaLabel')}
                  placeholder={t('greenhouses.form.areaPlaceholder')}
                  min={0}
                  suffix=" m²"
                  {...form.getInputProps('area')}
                />
              </SimpleGrid>
              <Textarea
                label={t('common.labels.description')}
                placeholder={t('greenhouses.form.descriptionPlaceholder')}
                autosize
                minRows={2}
                maxRows={6}
                {...form.getInputProps('description')}
              />
              <Textarea
                label={t('__new__.01-common.labels.note')}
                placeholder={t('greenhouses.form.notesPlaceholder')}
                autosize
                minRows={2}
                maxRows={6}
                {...form.getInputProps('notes')}
              />
            </Stack>
          </Card>

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
              {isEdit ? t('__new__.01-common.actions.save') : t('greenhouses.form.createButton')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
