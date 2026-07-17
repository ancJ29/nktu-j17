import {
  Button,
  Card,
  Divider,
  Group,
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
import {
  IconArrowLeft,
  IconHash,
  IconLock,
  IconMapPin,
  IconPhone,
  IconSettings,
  IconUser,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { appConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { useLocationStore } from '@/stores/useLocationStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { isListVersionConflict, readListHash } from '@/utils/listVersionConflict';
import { device } from '@credo/base-ui/utils';
import { useInitFormFromFetch } from '@/hooks';
import { perms } from '@/utils/permission';
import type { Location, LocationExtra } from '@/types';

const isMobile = device.isMobile;

type LocationFormValues = {
  name: string;
  code: string;
  description: string;
  address: string;
  isActive: boolean;
  kind: string;
  contactName: string;
  contactPhone: string;
  notes: string;
};

function buildNextLocationCode(n: number): string {
  const { codePrefix, codePadLength } = appConfig.features.locations;
  return `${codePrefix}${n.toString().padStart(Math.max(0, codePadLength), '0')}`;
}

export function LocationFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const forceRefresh = useLocationStore((s) => s.forceRefresh);
  const totalLocations = useLocationStore((s) => s.items.length);

  useEffect(() => {
    if (
      isMobile ||
      (isEdit && !perms.location.canEdit()) ||
      (!isEdit && !perms.location.canCreate())
    ) {
      navigate(ROUTES.LOCATIONS.LIST, { replace: true });
    }
  }, [navigate, isEdit]);

  const [loading, setLoading] = useState(false);
  const snapshotRef = useRef<Location | null>(null);

  const form = useForm<LocationFormValues>({
    initialValues: {
      name: '',
      code: isEdit ? '' : buildNextLocationCode(totalLocations + 1),
      description: '',
      address: '',
      isActive: true,
      kind: '',
      contactName: '',
      contactPhone: '',
      notes: '',
    },
    validate: {
      name: (v) => (v.trim() ? null : t('common.validation.nameRequired')),
      code: (v) => (v.trim() ? null : t('common.validation.codeRequired')),
    },
  });

  
  
  
  
  
  
  
  useEffect(() => {
    if (isEdit) return;
    form.setFieldValue('code', buildNextLocationCode(totalLocations + 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, totalLocations]);

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (id) => {
      const res = await cMngtConnector.getLocationById<LocationExtra>({ id });
      const l = res.location as Location;
      snapshotRef.current = l;
      return {
        name: l.name,
        code: l.code,
        description: l.description || '',
        address: l.address || '',
        isActive: l.isActive,
        kind: l.extra?.kind ?? '',
        contactName: l.extra?.contactName ?? '',
        contactPhone: l.extra?.contactPhone ?? '',
        notes: l.extra?.notes ?? '',
      };
    },
    () => {
      notifications.show({ color: 'red', message: t('locations.notifications.fetchError') });
      navigate(ROUTES.LOCATIONS.LIST);
    },
  );

  const handleSubmit = useCallback(
    async (values: LocationFormValues) => {
      setLoading(true);
      try {
        const core = {
          name: values.name,
          code: values.code,
          description: values.description,
          address: values.address,
          isActive: values.isActive,
        };
        const extra: LocationExtra = {
          ...(values.kind.trim() && { kind: values.kind.trim() }),
          ...(values.contactName.trim() && { contactName: values.contactName.trim() }),
          ...(values.contactPhone.trim() && { contactPhone: values.contactPhone.trim() }),
          ...(values.notes.trim() && { notes: values.notes.trim() }),
        };

        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Location snapshot missing');
          const updated = await useLocationStore
            .getState()
            .updateSafely({ id, version: snapshot.version, patch: { ...core, extra } });
          snapshotRef.current = updated;
          notifications.show({
            color: 'green',
            message: t('locations.notifications.updateSuccess'),
          });
          navigate(ROUTES.LOCATIONS.DETAIL.replace(':id', id));
        } else {
          const expectedListHash = readListHash(useLocationStore, 'locations');
          const res = await cMngtConnector.createLocation<LocationExtra>({
            ...core,
            extra,
            ...(expectedListHash && { expectedListHash }),
          });
          
          
          forceRefresh();
          notifications.show({
            color: 'green',
            message: t('locations.notifications.createSuccess'),
          });
          navigate(ROUTES.LOCATIONS.DETAIL.replace(':id', res.location.id));
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as Location;
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else if (!isEdit && isListVersionConflict(err)) {
          
          
          
          
          await useLocationStore.getState().forceRefresh();
          const newCode = buildNextLocationCode(useLocationStore.getState().items.length + 1);
          form.setFieldValue('code', newCode);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('locations.notifications.listConflictMessage', { code: newCode }),
            autoClose: 10000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: isEdit
              ? t('locations.notifications.updateError')
              : t('locations.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, t, navigate, forceRefresh, form],
  );

  const navigateToList = useCallback(() => navigate(ROUTES.LOCATIONS.LIST), [navigate]);

  if (fetching) return null;

  const pageTitle = isEdit ? t('locations.editItem') : t('locations.addItem');

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
          {/* Primary */}
          <Card withBorder radius="md" padding="lg">
            <Group gap="xs" mb="xs">
              <ThemeIcon size={28} radius="md" variant="light" color="primary">
                <IconMapPin size={16} stroke={1.75} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                {t('locations.form.primarySection')}
              </Text>
            </Group>
            <Divider mb="md" />
            <Stack gap="md">
              <TextInput
                label={t('common.labels.name')}
                placeholder={t('locations.form.namePlaceholder')}
                withAsterisk
                size="md"
                {...form.getInputProps('name')}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label={t('common.labels.code')}
                  placeholder={t('locations.form.codePlaceholder')}
                  leftSection={<IconHash size={14} />}
                  rightSection={<IconLock size={14} color="var(--mantine-color-dimmed)" />}
                  readOnly
                  styles={{
                    input: {
                      fontFamily: 'var(--mantine-font-family-monospace)',
                      backgroundColor: 'var(--mantine-color-default-hover)',
                      cursor: 'not-allowed',
                    },
                  }}
                  {...form.getInputProps('code')}
                />
                <TextInput
                  label={t('locations.form.kindLabel')}
                  placeholder={t('locations.form.kindPlaceholder')}
                  {...form.getInputProps('kind')}
                />
              </SimpleGrid>
              <TextInput
                label={t('common.labels.address')}
                placeholder={t('locations.form.addressPlaceholder')}
                leftSection={<IconMapPin size={14} />}
                {...form.getInputProps('address')}
              />
              <Textarea
                label={t('common.labels.description')}
                placeholder={t('locations.form.descriptionPlaceholder')}
                autosize
                minRows={2}
                maxRows={6}
                {...form.getInputProps('description')}
              />
            </Stack>
          </Card>

          {/* Contact */}
          <Card withBorder radius="md" padding="lg">
            <Group gap="xs" mb="xs">
              <ThemeIcon size={28} radius="md" variant="light" color="cyan">
                <IconUser size={16} stroke={1.75} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                {t('locations.form.contactSection')}
              </Text>
            </Group>
            <Divider mb="md" />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label={t('locations.form.contactNameLabel')}
                leftSection={<IconUser size={14} />}
                {...form.getInputProps('contactName')}
              />
              <TextInput
                label={t('locations.form.contactPhoneLabel')}
                leftSection={<IconPhone size={14} />}
                {...form.getInputProps('contactPhone')}
              />
            </SimpleGrid>
          </Card>

          {/* Operations */}
          <Card withBorder radius="md" padding="lg">
            <Group gap="xs" mb="xs">
              <ThemeIcon size={28} radius="md" variant="light" color="teal">
                <IconSettings size={16} stroke={1.75} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                {t('locations.form.operationsSection')}
              </Text>
            </Group>
            <Divider mb="md" />
            <Textarea
              label={t('__new__.01-common.labels.note')}
              placeholder={t('locations.form.notesPlaceholder')}
              autosize
              minRows={2}
              maxRows={6}
              {...form.getInputProps('notes')}
            />
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
              {isEdit ? t('locations.form.updateButton') : t('locations.form.createButton')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
