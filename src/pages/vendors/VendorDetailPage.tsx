import {
  Accordion,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAddressBook,
  IconArrowLeft,
  IconBan,
  IconCircleCheck,
  IconEdit,
  IconHistory,
  IconInfoCircle,
  IconMapPin,
  IconNote,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { Tabs } from '@credo/base-ui/components';
import { asyncDeduplicator, device } from '@credo/base-ui/utils';
import { PhoneNumber } from '@credo/base-ui/components';
import { AddressWithMapLink } from '@/components/AddressWithMapLink';
import { ActiveBadge } from '@/components/badges';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DangerAction } from '@/components/DangerAction';
import { DangerZoneCard } from '@/components/DangerZoneCard';
import { DetailField } from '@/components/DetailField';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { NotFoundState } from '@/components/NotFoundState';
import { NotesSection } from '@/components/NotesSection';
import { SectionCard } from '@/components/SectionCard';
import { TimestampLine } from '@/components/TimestampLine';
import { ActivityByTargetPanel } from '@/components/activity/ActivityByTargetPanel';
import { VendorOriginBadge } from './VendorOriginBadge';
import { VENDOR_ORIGIN_LABELS } from './vendorOriginLabels';
import { useAuthStore } from '@/stores/useAuthStore';
import { useVendorStore, fetchVendorById } from '@/stores/useVendorStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { perms, isActivityLoggingEnabled } from '@/utils/permission';
import { logActivity } from '@/utils/activityLogger';
import { deepDiff } from '@/utils/deepDiff';
import type { Vendor, VendorContact, VendorExtra, VendorNote, VendorPickupAddress } from '@/types';

const isMobile = device.isMobile;
const canEdit = perms.vendor.canEdit();
const canDelete = perms.vendor.canDelete();
const activityEnabled = isActivityLoggingEnabled();
const activityTabVisible = !isMobile && activityEnabled;

function newNoteId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function VendorDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const forceRefresh = useVendorStore((s) => s.forceRefresh);

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);
  const [deleting, setDeleting] = useState(false);
  const [toggleModalOpened, { open: openToggleModal, close: closeToggleModal }] =
    useDisclosure(false);
  const [toggling, setToggling] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('details');

  useEffect(() => {
    if (!id) return;
    const cached = useVendorStore.getState().getById(id) as Vendor | undefined;
    if (cached) {
      if (cached.extra?.isDeleted) {
        navigate(ROUTES.VENDORS.LIST, { replace: true });
        return;
      }

      setVendor(cached);
      setLoading(false);
      return;
    }
    setLoading(true);

    asyncDeduplicator.call(`vendor:${id}`, async () => {
      await fetchVendorById(id)
        .then((v) => {
          if (v.extra?.isDeleted) {
            navigate(ROUTES.VENDORS.LIST, { replace: true });
            return;
          }
          setVendor(v);
        })
        .catch(() => {
          notifications.show({ color: 'red', message: t('vendors.notifications.fetchError') });
          setVendor(null);
        })
        .finally(() => setLoading(false));
    });
  }, [id, t, navigate]);

  const handleDelete = useCallback(async () => {
    if (!id || !vendor) return;
    setDeleting(true);
    try {
      await useVendorStore.getState().updateSafely({
        id,
        version: vendor.version,
        patch: {
          isActive: false,
          extra: { ...vendor.extra, isDeleted: true },
        },
      });
      logActivity('vendor.delete', id);
      notifications.show({ color: 'green', message: t('vendors.notifications.deleteSuccess') });
      forceRefresh();
      navigate(ROUTES.VENDORS.LIST);
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) setVendor(err.latest as Vendor);
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        closeDeleteModal();
      } else {
        notifications.show({ color: 'red', message: t('vendors.notifications.deleteError') });
      }
    } finally {
      setDeleting(false);
    }
  }, [id, vendor, t, navigate, forceRefresh, closeDeleteModal]);

  const handleToggleStatus = useCallback(async () => {
    if (!id || !vendor) return;
    const nextActive = !vendor.isActive;
    setToggling(true);
    try {
      const updated = await useVendorStore.getState().updateSafely({
        id,
        version: vendor.version,
        patch: { isActive: nextActive },
      });
      setVendor(updated as Vendor);
      logActivity(
        'vendor.toggleStatus',
        id,
        deepDiff({ isActive: vendor.isActive }, { isActive: nextActive }),
      );
      notifications.show({
        color: 'green',
        message: t(
          nextActive
            ? 'vendors.notifications.enableSuccess'
            : 'vendors.notifications.disableSuccess',
        ),
      });
      closeToggleModal();
      forceRefresh();
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) setVendor(err.latest as Vendor);
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        closeToggleModal();
      } else {
        notifications.show({ color: 'red', message: t('vendors.notifications.toggleError') });
      }
    } finally {
      setToggling(false);
    }
  }, [id, vendor, t, closeToggleModal, forceRefresh]);

  const writeNotes = useCallback(
    async (nextNotes: VendorNote[]) => {
      if (!id || !vendor) return;
      try {
        const updated = await useVendorStore.getState().updateSafely({
          id,
          version: vendor.version,
          patch: { extra: { ...vendor.extra, notes: nextNotes.length ? nextNotes : undefined } },
        });
        setVendor(updated as Vendor);
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setVendor(err.latest as Vendor);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
          throw err;
        }
        throw err;
      }
    },
    [id, vendor, t],
  );

  const handleAddNote = useCallback(
    async (text: string) => {
      if (!vendor) return;
      const user = useAuthStore.getState().user;
      const newNote: VendorNote = {
        id: newNoteId(),
        text,
        createdAt: Date.now(),
        createdBy: user?.email ?? 'unknown',
        ...(user?.name ? { createdByName: user.name } : {}),
      };
      const existing = Array.isArray(vendor.extra?.notes) ? (vendor.extra?.notes ?? []) : [];
      try {
        await writeNotes([...existing, newNote]);
        logActivity('vendor.addNote', vendor.id);
        notifications.show({ color: 'green', message: t('common.detail.notes.addSuccess') });
      } catch (err) {
        if (!(err instanceof EntityConflictError)) {
          notifications.show({ color: 'red', message: t('common.detail.notes.addError') });
        }
      }
    },
    [vendor, writeNotes, t],
  );

  const handleRemoveNote = useCallback(
    async (noteId: string) => {
      if (!vendor) return;
      const existing = Array.isArray(vendor.extra?.notes) ? (vendor.extra?.notes ?? []) : [];
      try {
        await writeNotes(existing.filter((n) => n.id !== noteId));
        logActivity('vendor.removeNote', vendor.id);
        notifications.show({ color: 'green', message: t('common.detail.notes.removeSuccess') });
      } catch (err) {
        if (!(err instanceof EntityConflictError)) {
          notifications.show({ color: 'red', message: t('common.detail.notes.removeError') });
        }
      }
    },
    [vendor, writeNotes, t],
  );

  if (loading) return null;
  if (!vendor) {
    return (
      <NotFoundState
        title={t('common.notFound.title')}
        message={t('common.notFound.message')}
        backTo={ROUTES.VENDORS.LIST}
        backLabel={t('common.notFound.backToList')}
      />
    );
  }

  const extra = vendor.extra ?? ({} as VendorExtra);
  const shortName = extra.shortName || vendor.code;
  const isDomestic = extra.isDomestic ?? true;
  const contacts: VendorContact[] = extra.contacts ?? [];
  const pickupAddresses: VendorPickupAddress[] = extra.pickupAddresses ?? [];
  const notes: VendorNote[] = Array.isArray(extra.notes) ? extra.notes : [];

  const topActions = isMobile ? null : (
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
            color={vendor.isActive ? 'orange' : 'green'}
            size="compact-sm"
            leftSection={vendor.isActive ? <IconBan size={14} /> : <IconCircleCheck size={14} />}
            onClick={openToggleModal}
          >
            {vendor.isActive
              ? t('__new__.07-entities.vendors.dangerZone.disableButton')
              : t('__new__.01-common.dangerZone.enableButton')}
          </Button>
        )}
        {canEdit && (
          <Button
            component={Link}
            to={ROUTES.VENDORS.EDIT.replace(':id', vendor.id)}
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

  const headerRow = (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <Group gap="md" wrap="nowrap" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
        <EmployeeAvatar
          name={shortName}
          size={isMobile ? 48 : 56}
          radius="xl"
          initialSize={isMobile ? '16px' : '20px'}
          initialWeight={700}
        />
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Title order={isMobile ? 5 : 3} lh={1.2}>
            {vendor.name}
          </Title>
          <Group gap="xs" wrap="wrap">
            <Text size="sm" fw={600} c="dimmed" ff="monospace">
              {vendor.code}
            </Text>
            {extra.shortName && (
              <>
                <Text size="xs" c="dimmed">
                  ·
                </Text>
                <Text size="sm" c="dimmed">
                  {extra.shortName}
                </Text>
              </>
            )}
            <ActiveBadge
              isActive={vendor.isActive}
              activeLabel={t('vendors.status.cooperating')}
              inactiveLabel={t('vendors.status.paused')}
              size="sm"
            />
            <VendorOriginBadge isDomestic={isDomestic} labels={VENDOR_ORIGIN_LABELS} />
          </Group>
        </Stack>
      </Group>
      {!isMobile && (
        <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
          <TimestampLine updatedAt={vendor.updatedAt} createdAt={vendor.createdAt} />
        </Stack>
      )}
    </Group>
  );

  const basicInfoCard = (
    <SectionCard
      icon={<IconInfoCircle size={14} />}
      title={t('common.labels.basicInfo')}
      padding="md"
    >
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <DetailField label={t('common.labels.name')}>{vendor.name}</DetailField>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <DetailField label={t('common.labels.shortName')}>{extra.shortName || '-'}</DetailField>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <DetailField label={t('common.labels.code')}>
            <Text size="sm" fw={500} ff="monospace">
              {vendor.code}
            </Text>
          </DetailField>
        </Grid.Col>
      </Grid>
    </SectionCard>
  );

  const contactsCard = (
    <SectionCard
      icon={<IconAddressBook size={14} />}
      title={t('vendors.contacts.section')}
      padding="md"
    >
      <Stack gap="md">
        {(vendor.contactPerson || vendor.phone) && (
          <Card withBorder padding="sm" radius="md">
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                <EmployeeAvatar
                  name={vendor.contactPerson || vendor.phone || '—'}
                  size={32}
                  initialSize="11px"
                />
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={600}>
                    {vendor.contactPerson || t('vendors.notSet')}
                  </Text>
                  {vendor.phone && (
                    <PhoneNumber
                      value={vendor.phone}
                      size="xs"
                      c="dimmed"
                      copyTooltip={t('__new__.01-common.actions.copy')}
                      copiedTooltip={t('common.labels.copied')}
                    />
                  )}
                </Stack>
              </Group>
              <Badge variant="light" color="teal" radius="sm" size="sm">
                {t('common.labels.primaryContact')}
              </Badge>
            </Group>
          </Card>
        )}

        {contacts.length === 0 ? null : (
          <Stack gap="sm">
            {contacts.map((c) => (
              <Card key={c.id} withBorder padding="sm" radius="md">
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <EmployeeAvatar name={c.name} size={32} initialSize="11px" />
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={600}>
                        {c.name}
                      </Text>
                      {c.role && (
                        <Text size="xs" c="dimmed">
                          {c.role}
                        </Text>
                      )}
                      {c.phone && (
                        <PhoneNumber
                          value={c.phone}
                          size="xs"
                          c="dimmed"
                          copyTooltip={t('__new__.01-common.actions.copy')}
                          copiedTooltip={t('common.labels.copied')}
                        />
                      )}
                    </Stack>
                  </Group>
                  {c.isPrimary && (
                    <Badge variant="light" color="teal" radius="sm" size="sm">
                      {t('common.labels.primaryContact')}
                    </Badge>
                  )}
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );

  const addressesCard = (
    <SectionCard icon={<IconMapPin size={14} />} title={t('common.labels.addresses')} padding="md">
      <Stack gap="sm">
        {vendor.address ? (
          <Card withBorder padding="sm" radius="md">
            <Stack gap={4}>
              <Badge variant="light" color="blue" radius="sm" size="sm" w="fit-content">
                {t('vendors.detail.billingAddress')}
              </Badge>
              <AddressWithMapLink
                address={vendor.address}
                googleMapUrl={extra.addressGoogleMapUrl}
              />
            </Stack>
          </Card>
        ) : null}

        {pickupAddresses.length === 0 && !vendor.address ? (
          <Text size="sm" c="dimmed">
            {t('vendors.detail.noPickupAddresses')}
          </Text>
        ) : null}

        {pickupAddresses.map((pa) => (
          <Card key={pa.id} withBorder padding="sm" radius="md">
            <Stack gap={4}>
              <Badge variant="light" color="indigo" radius="sm" size="sm" w="fit-content">
                {t('vendors.detail.pickupAddress')}
              </Badge>
              <AddressWithMapLink address={pa.address} googleMapUrl={pa.googleMapUrl} />
              {pa.deliveryHours && (
                <Text size="xs" c="dimmed">
                  {t('vendors.detail.receivingHours')}: {pa.deliveryHours}
                </Text>
              )}
            </Stack>
          </Card>
        ))}
      </Stack>
    </SectionCard>
  );

  const notesCard = (
    <NotesSection
      notes={notes}
      canEdit={canEdit}
      onAdd={handleAddNote}
      onRemove={handleRemoveNote}
    />
  );

  const dangerZone =
    !isMobile && (canEdit || canDelete) ? (
      <DangerZoneCard title={t('__new__.01-common.dangerZone.title')}>
        {canEdit && (
          <DangerAction
            title={
              vendor.isActive
                ? t('__new__.07-entities.vendors.dangerZone.disableItem')
                : t('__new__.07-entities.vendors.dangerZone.enableItem')
            }
            description={t(
              vendor.isActive
                ? '__new__.07-entities.vendors.dangerZone.disableItemDesc'
                : '__new__.07-entities.vendors.dangerZone.enableItemDesc',
            )}
            buttonLabel={
              vendor.isActive
                ? t('__new__.07-entities.vendors.dangerZone.disableButton')
                : t('__new__.01-common.dangerZone.enableButton')
            }
            buttonIcon={vendor.isActive ? <IconBan size={14} /> : <IconCircleCheck size={14} />}
            onClick={openToggleModal}
            buttonColor={vendor.isActive ? 'orange' : 'green'}
          />
        )}
        {canEdit && canDelete && <Divider variant="dashed" />}
        {canDelete && (
          <DangerAction
            title={t('__new__.07-entities.vendors.dangerZone.deleteItem')}
            description={t('__new__.07-entities.vendors.dangerZone.deleteItemDesc')}
            buttonLabel={t('__new__.01-common.actions.remove')}
            buttonIcon={<IconTrash size={14} />}
            buttonColor="danger"
            onClick={openDeleteModal}
          />
        )}
      </DangerZoneCard>
    ) : null;

  const body = (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, md: 7 }}>
        <Stack gap="md">
          {basicInfoCard}
          {contactsCard}
          {addressesCard}
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Stack gap="md">
          {notesCard}
          {dangerZone}
        </Stack>
      </Grid.Col>
    </Grid>
  );

  const mobileContent = (
    <Accordion defaultValue="info" variant="separated">
      <Accordion.Item value="info">
        <Accordion.Control icon={<IconInfoCircle size={16} />}>
          {t('common.labels.basicInfo')}
        </Accordion.Control>
        <Accordion.Panel>{basicInfoCard}</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="contacts">
        <Accordion.Control icon={<IconAddressBook size={16} />}>
          {t('vendors.contacts.section')}
        </Accordion.Control>
        <Accordion.Panel>{contactsCard}</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="addresses">
        <Accordion.Control icon={<IconMapPin size={16} />}>
          {t('common.labels.addresses')}
        </Accordion.Control>
        <Accordion.Panel>{addressesCard}</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="notes">
        <Accordion.Control icon={<IconNote size={16} />}>
          {t('common.detail.notes.title')}
        </Accordion.Control>
        <Accordion.Panel>{notesCard}</Accordion.Panel>
      </Accordion.Item>
      {activityEnabled && (
        <Accordion.Item value="activity">
          <Accordion.Control icon={<IconHistory size={16} />}>
            {t('vendors.detail.tab.activity')}
          </Accordion.Control>
          <Accordion.Panel>
            <ActivityByTargetPanel targetId={vendor.id} i18nNamespace="vendors.detail" />
          </Accordion.Panel>
        </Accordion.Item>
      )}
    </Accordion>
  );

  return (
    <>
      <Stack gap={isMobile ? 'md' : 'lg'}>
        {topActions}
        {headerRow}
        <Divider />
        {isMobile ? (
          mobileContent
        ) : activityTabVisible ? (
          <Tabs value={activeTab} onChange={(v) => v && setActiveTab(v)}>
            <Tabs.List>
              <Tabs.Tab value="details" leftSection={<IconInfoCircle size={16} />}>
                {t('vendors.detail.tab.details')}
              </Tabs.Tab>
              <Tabs.Tab value="activity" leftSection={<IconHistory size={16} />}>
                {t('vendors.detail.tab.activity')}
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="details" pt="md">
              {body}
            </Tabs.Panel>
            <Tabs.Panel value="activity" pt="md">
              {/* Lazy-mount: only fetch when this tab is selected. */}
              {activeTab === 'activity' && (
                <ActivityByTargetPanel targetId={vendor.id} i18nNamespace="vendors.detail" />
              )}
            </Tabs.Panel>
          </Tabs>
        ) : (
          body
        )}
      </Stack>

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title={t('vendors.deleteConfirm.title')}
        message={t('vendors.deleteConfirm.message')}
        loading={deleting}
      />
      <ConfirmModal
        opened={toggleModalOpened}
        onClose={closeToggleModal}
        onConfirm={handleToggleStatus}
        title={
          vendor.isActive
            ? t('__new__.07-entities.vendors.dangerZone.disableItem')
            : t('__new__.07-entities.vendors.dangerZone.enableItem')
        }
        message={
          vendor.isActive
            ? t('__new__.07-entities.vendors.dangerZone.disableConfirm')
            : t('__new__.07-entities.vendors.dangerZone.enableConfirm')
        }
        confirmLabel={
          vendor.isActive
            ? t('__new__.07-entities.vendors.dangerZone.disableButton')
            : t('__new__.01-common.dangerZone.enableButton')
        }
        confirmColor={vendor.isActive ? 'orange' : 'green'}
        loading={toggling}
      />
    </>
  );
}
