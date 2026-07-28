import {
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconBan,
  IconCircleCheck,
  IconEdit,
  IconMapPin,
  IconPhone,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { ActiveBadge } from '@/components/badges';
import { asyncDeduplicator, device } from '@credo/base-ui/utils';
import { FieldLabel } from '@credo/base-ui/components';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DangerAction } from '@/components/DangerAction';
import { DangerZoneCard } from '@/components/DangerZoneCard';
import { DetailField } from '@/components/DetailField';
import { NotFoundState } from '@/components/NotFoundState';
import { useLocationStore } from '@/stores/useLocationStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { formatDateTime } from '@/utils/dateFormat';
import { perms } from '@/utils/permission';
import type { Location, LocationExtra } from '@/types';

const isMobile = device.isMobile;
const canEdit = perms.location.canEdit();
const canDelete = perms.location.canDelete();

export function LocationDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const forceRefresh = useLocationStore((s) => s.forceRefresh);

  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);
  const [deleting, setDeleting] = useState(false);

  const [toggleModalOpened, { open: openToggleModal, close: closeToggleModal }] =
    useDisclosure(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!id) return;
    const cached = useLocationStore.getState().getById(id) as Location | undefined;
    if (cached) {
      setLocation(cached);
      setLoading(false);
      return;
    }
    setLoading(true);

    asyncDeduplicator.call(`location:${id}`, async () => {
      await cMngtConnector
        .getLocationById<LocationExtra>({ id })
        .then((res) => setLocation(res.location))
        .catch(() => {
          notifications.show({
            color: 'red',
            message: t('locations.notifications.fetchError'),
          });
          setLocation(null);
        })
        .finally(() => setLoading(false));
    });
  }, [id, t]);

  const handleDelete = useCallback(async () => {
    if (!id || !location) return;
    setDeleting(true);
    try {
      await useLocationStore.getState().deleteSafely({ id, version: location.version });
      notifications.show({
        color: 'green',
        message: t('locations.notifications.deleteSuccess'),
      });
      forceRefresh();
      navigate(ROUTES.LOCATIONS.LIST);
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) setLocation(err.latest as Location);
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        closeDeleteModal();
      } else {
        notifications.show({
          color: 'red',
          message: t('locations.notifications.deleteError'),
        });
      }
    } finally {
      setDeleting(false);
    }
  }, [id, location, t, navigate, forceRefresh, closeDeleteModal]);

  const handleToggleStatus = useCallback(async () => {
    if (!id || !location) return;
    const nextActive = !location.isActive;
    setToggling(true);
    try {
      const updated = await useLocationStore.getState().updateSafely({
        id,
        version: location.version,
        patch: { isActive: nextActive },
      });
      setLocation(updated);
      notifications.show({
        color: 'green',
        message: t(
          nextActive
            ? 'locations.notifications.enableSuccess'
            : 'locations.notifications.disableSuccess',
        ),
      });
      closeToggleModal();
      forceRefresh();
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) setLocation(err.latest as Location);
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        closeToggleModal();
      } else {
        notifications.show({
          color: 'red',
          message: t('locations.notifications.toggleError'),
        });
      }
    } finally {
      setToggling(false);
    }
  }, [id, location, t, closeToggleModal, forceRefresh]);

  if (loading) return null;
  if (!location) {
    return (
      <NotFoundState
        title={t('common.notFound.title')}
        message={t('common.notFound.message')}
        backTo={ROUTES.LOCATIONS.LIST}
        backLabel={t('common.notFound.backToList')}
      />
    );
  }

  const extra = location.extra ?? {};

  const headerCard = (
    <Card
      withBorder
      radius="md"
      padding={isMobile ? 'md' : 'lg'}
      style={{
        background:
          'linear-gradient(180deg, var(--mantine-color-body), var(--mantine-color-default-hover))',
      }}
    >
      <Group gap={isMobile ? 'sm' : 'lg'} wrap="nowrap" align="flex-start">
        <ThemeIcon size={isMobile ? 56 : 80} radius={12} variant="light" color="primary">
          <IconMapPin size={isMobile ? 28 : 40} stroke={1.5} />
        </ThemeIcon>
        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={8} wrap="wrap" align="center">
            <Title order={isMobile ? 5 : 3} lh={1.2}>
              {location.name}
            </Title>
            <ActiveBadge
              isActive={location.isActive}
              activeLabel={t('__new__.01-common.labels.active')}
              inactiveLabel={t('common.status.inactive')}
              size="sm"
            />
          </Group>
          <Group gap={8} wrap="wrap">
            <Text size="xs" ff="monospace" c="dimmed" tt="uppercase" fw={500}>
              {location.code}
            </Text>
            {extra.kind && (
              <Badge variant="default" size="sm" radius="sm" tt="none">
                {extra.kind}
              </Badge>
            )}
          </Group>
          {location.address && (
            <Group gap={6} wrap="nowrap">
              <IconMapPin size={14} color="var(--mantine-color-dimmed)" />
              <Text size="sm" c="dimmed">
                {location.address}
              </Text>
            </Group>
          )}
        </Stack>
      </Group>
    </Card>
  );

  const desktopTopActions = (
    <Group justify="space-between">
      <Button
        onClick={() => window.history.back()}
        variant="subtle"
        size="compact-sm"
        leftSection={<IconArrowLeft size={16} />}
      >
        {t('__new__.01-common.actions.back')}
      </Button>
      <Group gap="xs">
        {canEdit && (
          <Button
            variant="light"
            color={location.isActive ? 'orange' : 'green'}
            size="compact-sm"
            leftSection={location.isActive ? <IconBan size={14} /> : <IconCircleCheck size={14} />}
            onClick={openToggleModal}
          >
            {location.isActive
              ? t('__new__.01-common.dangerZone.disableButton')
              : t('__new__.01-common.dangerZone.enableButton')}
          </Button>
        )}
        {canEdit && (
          <Button
            component={Link}
            to={ROUTES.LOCATIONS.EDIT.replace(':id', location.id)}
            variant="light"
            size="compact-sm"
            leftSection={<IconEdit size={14} />}
          >
            {t('__new__.01-common.actions.edit')}
          </Button>
        )}
      </Group>
    </Group>
  );

  const detailsBlock = (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <DetailField label={t('common.labels.name')}>{location.name}</DetailField>
        <DetailField label={t('common.labels.code')}>
          <Text span ff="monospace" fw={500} tt="uppercase">
            {location.code}
          </Text>
        </DetailField>
        <DetailField label={t('locations.columns.kind')}>{extra.kind || '—'}</DetailField>
        <DetailField label={t('common.labels.address')}>{location.address || '—'}</DetailField>
      </SimpleGrid>
      <DetailField label={t('common.labels.description')}>
        {location.description ? (
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {location.description}
          </Text>
        ) : (
          '—'
        )}
      </DetailField>

      {(extra.contactName || extra.contactPhone) && (
        <>
          <Divider />
          <Stack gap="sm">
            <Group gap={6}>
              <IconUser size={14} color="var(--mantine-color-dimmed)" />
              <FieldLabel>{t('locations.form.contactSection')}</FieldLabel>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DetailField label={t('locations.form.contactNameLabel')}>
                {extra.contactName || '—'}
              </DetailField>
              <DetailField label={t('locations.form.contactPhoneLabel')}>
                {extra.contactPhone ? (
                  <Group gap={4} wrap="nowrap">
                    <IconPhone size={14} color="var(--mantine-color-dimmed)" />
                    <Text span>{extra.contactPhone}</Text>
                  </Group>
                ) : (
                  '—'
                )}
              </DetailField>
            </SimpleGrid>
          </Stack>
        </>
      )}

      {extra.notes && (
        <>
          <Divider />
          <DetailField label={t('__new__.01-common.labels.note')}>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {extra.notes}
            </Text>
          </DetailField>
        </>
      )}

      <Divider />
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <DetailField label={t('common.labels.createdAt')}>
          {formatDateTime(location.createdAt)}
        </DetailField>
        <DetailField label={t('common.labels.updatedAt')}>
          {formatDateTime(location.updatedAt)}
        </DetailField>
      </SimpleGrid>
    </Stack>
  );

  const detailsContent = (
    <Card withBorder radius="md" padding={isMobile ? 'md' : 'lg'}>
      <Grid gutter="xl">
        <Grid.Col span={{ base: 12, md: 8 }}>{detailsBlock}</Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          {canDelete && (
            <DangerZoneCard title={t('__new__.01-common.dangerZone.title')}>
              <DangerAction
                title={t('__new__.07-entities.locations.dangerZone.deleteItem')}
                description={t('__new__.07-entities.locations.dangerZone.deleteItemDesc')}
                buttonLabel={t('__new__.01-common.actions.remove')}
                buttonIcon={<IconTrash size={14} />}
                onClick={openDeleteModal}
                buttonColor="red"
              />
            </DangerZoneCard>
          )}
        </Grid.Col>
      </Grid>
    </Card>
  );

  return (
    <>
      <Stack gap={isMobile ? 'md' : 'lg'}>
        {!isMobile && desktopTopActions}
        {headerCard}
        {isMobile && canEdit && (
          <Button
            variant="light"
            color={location.isActive ? 'orange' : 'green'}
            size="sm"
            leftSection={location.isActive ? <IconBan size={16} /> : <IconCircleCheck size={16} />}
            onClick={openToggleModal}
            fullWidth
          >
            {location.isActive
              ? t('__new__.01-common.dangerZone.disableButton')
              : t('__new__.01-common.dangerZone.enableButton')}
          </Button>
        )}
        {detailsContent}
      </Stack>

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title={t('locations.deleteConfirm.title')}
        message={t('__new__.07-entities.locations.dangerZone.deleteConfirm')}
        loading={deleting}
      />
      <ConfirmModal
        opened={toggleModalOpened}
        onClose={closeToggleModal}
        onConfirm={handleToggleStatus}
        title={
          location.isActive
            ? t('__new__.07-entities.locations.dangerZone.disableItem')
            : t('__new__.07-entities.locations.dangerZone.enableItem')
        }
        message={
          location.isActive
            ? t('__new__.07-entities.locations.dangerZone.disableConfirm')
            : t('__new__.07-entities.locations.dangerZone.enableConfirm')
        }
        confirmLabel={
          location.isActive
            ? t('__new__.01-common.dangerZone.disableButton')
            : t('__new__.01-common.dangerZone.enableButton')
        }
        confirmColor={location.isActive ? 'orange' : 'green'}
        loading={toggling}
      />
    </>
  );
}
