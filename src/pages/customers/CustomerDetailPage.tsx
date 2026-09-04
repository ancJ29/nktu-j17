import {
  Accordion,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  SimpleGrid,
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
  IconChartBar,
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
import EntitySalesPanel from '@/pages/reports/EntitySalesPanel';
import { useCanAccessReports } from '@/pages/reports/reportAccess';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCustomerStore, fetchCustomerById } from '@/stores/useCustomerStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import {
  perms,
  hasShippingAddressForCustomers,
  isActivityLoggingEnabled,
} from '@/utils/permission';
import { logActivity } from '@/utils/activityLogger';
import { deepDiff } from '@/utils/deepDiff';
import type {
  Customer,
  CustomerContact,
  CustomerExtra,
  CustomerNote,
  CustomerShippingAddress,
} from '@/types';

const isMobile = device.isMobile;
const canEdit = perms.customer.canEdit();
const canDelete = perms.customer.canDelete();
const hasShippingAddress = hasShippingAddressForCustomers();
const activityEnabled = isActivityLoggingEnabled();
const activityTabVisible = !isMobile && activityEnabled;

function newNoteId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CustomerDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const forceRefresh = useCustomerStore((s) => s.forceRefresh);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);
  const [deleting, setDeleting] = useState(false);
  const [toggleModalOpened, { open: openToggleModal, close: closeToggleModal }] =
    useDisclosure(false);
  const [toggling, setToggling] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('details');

  const canSeeSales = useCanAccessReports();

  useEffect(() => {
    if (!id) return;
    const cached = useCustomerStore.getState().getById(id) as Customer | undefined;
    if (cached) {
      if (cached.extra?.isDeleted) {
        navigate(ROUTES.CUSTOMERS.LIST, { replace: true });
        return;
      }

      setCustomer(cached);
      setLoading(false);
      return;
    }
    setLoading(true);

    asyncDeduplicator.call(`customer:${id}`, async () => {
      await fetchCustomerById(id)
        .then((c) => {
          if (c.extra?.isDeleted) {
            navigate(ROUTES.CUSTOMERS.LIST, { replace: true });
            return;
          }
          setCustomer(c);
        })
        .catch(() => {
          notifications.show({ color: 'red', message: t('customers.notifications.fetchError') });
          setCustomer(null);
        })
        .finally(() => setLoading(false));
    });
  }, [id, t, navigate]);

  const handleDelete = useCallback(async () => {
    if (!id || !customer) return;
    setDeleting(true);
    try {
      await useCustomerStore.getState().updateSafely({
        id,
        version: customer.version,
        patch: {
          isActive: false,
          extra: { ...customer.extra, isDeleted: true },
        },
      });
      logActivity('customer.delete', id);
      notifications.show({ color: 'green', message: t('customers.notifications.deleteSuccess') });
      forceRefresh();
      navigate(ROUTES.CUSTOMERS.LIST);
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) setCustomer(err.latest as Customer);
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        closeDeleteModal();
      } else {
        notifications.show({ color: 'red', message: t('customers.notifications.deleteError') });
      }
    } finally {
      setDeleting(false);
    }
  }, [id, customer, t, navigate, forceRefresh, closeDeleteModal]);

  const handleToggleStatus = useCallback(async () => {
    if (!id || !customer) return;
    const nextActive = !customer.isActive;
    setToggling(true);
    try {
      const updated = await useCustomerStore.getState().updateSafely({
        id,
        version: customer.version,
        patch: { isActive: nextActive },
      });
      setCustomer(updated as Customer);
      logActivity(
        'customer.toggleStatus',
        id,
        deepDiff({ isActive: customer.isActive }, { isActive: nextActive }),
      );
      notifications.show({
        color: 'green',
        message: t(
          nextActive
            ? 'customers.notifications.enableSuccess'
            : 'customers.notifications.disableSuccess',
        ),
      });
      closeToggleModal();
      forceRefresh();
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) setCustomer(err.latest as Customer);
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        closeToggleModal();
      } else {
        notifications.show({ color: 'red', message: t('customers.notifications.toggleError') });
      }
    } finally {
      setToggling(false);
    }
  }, [id, customer, t, closeToggleModal, forceRefresh]);

  const writeNotes = useCallback(
    async (nextNotes: CustomerNote[]) => {
      if (!id || !customer) return;
      try {
        const updated = await useCustomerStore.getState().updateSafely({
          id,
          version: customer.version,
          patch: { extra: { ...customer.extra, notes: nextNotes.length ? nextNotes : undefined } },
        });
        setCustomer(updated as Customer);
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setCustomer(err.latest as Customer);
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
    [id, customer, t],
  );

  const handleAddNote = useCallback(
    async (text: string) => {
      if (!customer) return;

      const user = useAuthStore.getState().user;
      const newNote: CustomerNote = {
        id: newNoteId(),
        text,
        createdAt: Date.now(),
        createdBy: user?.email ?? 'unknown',
        ...(user?.name ? { createdByName: user.name } : {}),
      };
      const existing = Array.isArray(customer.extra?.notes) ? (customer.extra?.notes ?? []) : [];
      try {
        await writeNotes([...existing, newNote]);
        logActivity('customer.addNote', customer.id);
        notifications.show({ color: 'green', message: t('common.detail.notes.addSuccess') });
      } catch (err) {
        if (!(err instanceof EntityConflictError)) {
          notifications.show({ color: 'red', message: t('common.detail.notes.addError') });
        }
      }
    },
    [customer, writeNotes, t],
  );

  const handleRemoveNote = useCallback(
    async (noteId: string) => {
      if (!customer) return;
      const existing = Array.isArray(customer.extra?.notes) ? (customer.extra?.notes ?? []) : [];
      try {
        await writeNotes(existing.filter((n) => n.id !== noteId));
        logActivity('customer.removeNote', customer.id);
        notifications.show({ color: 'green', message: t('common.detail.notes.removeSuccess') });
      } catch (err) {
        if (!(err instanceof EntityConflictError)) {
          notifications.show({ color: 'red', message: t('common.detail.notes.removeError') });
        }
      }
    },
    [customer, writeNotes, t],
  );

  if (loading) return null;
  if (!customer) {
    return (
      <NotFoundState
        title={t('common.notFound.title')}
        message={t('common.notFound.message')}
        backTo={ROUTES.CUSTOMERS.LIST}
        backLabel={t('common.notFound.backToList')}
      />
    );
  }

  const extra = customer.extra ?? ({} as CustomerExtra);
  const shortName = extra.shortName || customer.code;
  const contacts: CustomerContact[] = extra.contacts ?? [];

  const shippingAddresses: CustomerShippingAddress[] = hasShippingAddress
    ? (extra.shippingAddresses ?? [])
    : [];
  const notes: CustomerNote[] = Array.isArray(extra.notes) ? extra.notes : [];

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
            color={customer.isActive ? 'orange' : 'green'}
            size="compact-sm"
            leftSection={customer.isActive ? <IconBan size={14} /> : <IconCircleCheck size={14} />}
            onClick={openToggleModal}
          >
            {customer.isActive
              ? t('__new__.07-entities.customers.dangerZone.disableButton')
              : t('__new__.01-common.dangerZone.enableButton')}
          </Button>
        )}
        {canEdit && (
          <Button
            component={Link}
            to={ROUTES.CUSTOMERS.EDIT.replace(':id', customer.id)}
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
            {customer.name}
          </Title>
          <Group gap="xs" wrap="wrap">
            <Text size="sm" fw={600} c="dimmed" ff="monospace">
              {customer.code}
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
              isActive={customer.isActive}
              activeLabel={t('__new__.01-common.labels.active')}
              inactiveLabel={t('__new__.01-common.labels.inactive')}
              size="sm"
            />
          </Group>
        </Stack>
      </Group>
      {!isMobile && (
        <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
          <TimestampLine updatedAt={customer.updatedAt} createdAt={customer.createdAt} />
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
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <DetailField label={t('common.labels.name')}>{customer.name}</DetailField>
        <DetailField label={t('common.labels.shortName')}>{extra.shortName || '-'}</DetailField>
        <DetailField label={t('common.labels.code')}>
          <Text size="sm" fw={500} ff="monospace">
            {customer.code}
          </Text>
        </DetailField>
        <DetailField label={t('common.labels.taxCode')}>{extra.taxCode || '-'}</DetailField>
      </SimpleGrid>
    </SectionCard>
  );

  const contactsCard = (
    <SectionCard
      icon={<IconAddressBook size={14} />}
      title={t('customers.contacts.section')}
      padding="md"
    >
      <Stack gap="md">
        {(customer.contactPerson || customer.phone) && (
          <Card withBorder padding="sm" radius="md">
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                <EmployeeAvatar
                  name={customer.contactPerson || customer.phone || '—'}
                  size={32}
                  initialSize="11px"
                />
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={600}>
                    {customer.contactPerson || t('customers.notSet')}
                  </Text>
                  {customer.phone && (
                    <PhoneNumber
                      value={customer.phone}
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
        {customer.address ? (
          <Card withBorder padding="sm" radius="md">
            <Stack gap={4}>
              <Badge variant="light" color="blue" radius="sm" size="sm" w="fit-content">
                {t('customers.detail.billingAddress')}
              </Badge>
              <AddressWithMapLink
                address={customer.address}
                googleMapUrl={extra.addressGoogleMapUrl}
                iconLabel={t('__new__.01-common.actions.openInMaps')}
              />
            </Stack>
          </Card>
        ) : null}

        {shippingAddresses.length === 0 && !customer.address ? (
          <Text size="sm" c="dimmed">
            {t('customers.detail.noShippingAddresses')}
          </Text>
        ) : null}

        {shippingAddresses.map((sa) => (
          <Card key={sa.id} withBorder padding="sm" radius="md">
            <Stack gap={4}>
              <Badge variant="light" color="indigo" radius="sm" size="sm" w="fit-content">
                {t('customers.detail.shippingAddress')}
              </Badge>
              <AddressWithMapLink
                address={sa.address}
                googleMapUrl={sa.googleMapUrl}
                iconLabel={t('__new__.01-common.actions.openInMaps')}
              />
              {sa.deliveryHours && (
                <Text size="xs" c="dimmed">
                  {t('customers.detail.receivingHours')}: {sa.deliveryHours}
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
              customer.isActive
                ? t('__new__.07-entities.customers.dangerZone.disableItem')
                : t('__new__.07-entities.customers.dangerZone.enableItem')
            }
            description={t(
              customer.isActive
                ? '__new__.07-entities.customers.dangerZone.disableItemDesc'
                : '__new__.07-entities.customers.dangerZone.enableItemDesc',
            )}
            buttonLabel={
              customer.isActive
                ? t('__new__.07-entities.customers.dangerZone.disableButton')
                : t('__new__.01-common.dangerZone.enableButton')
            }
            buttonIcon={customer.isActive ? <IconBan size={14} /> : <IconCircleCheck size={14} />}
            onClick={openToggleModal}
            buttonColor={customer.isActive ? 'orange' : 'green'}
          />
        )}
        {canEdit && canDelete && <Divider variant="dashed" />}
        {canDelete && (
          <DangerAction
            title={t('__new__.07-entities.customers.dangerZone.deleteItem')}
            description={t('__new__.07-entities.customers.dangerZone.deleteItemDesc')}
            buttonLabel={t('__new__.01-common.actions.remove')}
            buttonIcon={<IconTrash size={14} />}
            buttonColor="danger"
            onClick={openDeleteModal}
          />
        )}
      </DangerZoneCard>
    ) : null;

  const salesTabVisible = canSeeSales && !!customer.code;

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
          {t('customers.contacts.section')}
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
      {salesTabVisible && (
        <Accordion.Item value="sales">
          <Accordion.Control icon={<IconChartBar size={16} />}>
            {t('report.entityTab.title')}
          </Accordion.Control>
          <Accordion.Panel>
            <EntitySalesPanel
              target={{ kind: 'customer', code: customer.code, name: customer.name }}
            />
          </Accordion.Panel>
        </Accordion.Item>
      )}
      {activityEnabled && (
        <Accordion.Item value="activity">
          <Accordion.Control icon={<IconHistory size={16} />}>
            {t('customers.detail.tab.activity')}
          </Accordion.Control>
          <Accordion.Panel>
            <ActivityByTargetPanel targetId={customer.id} i18nNamespace="customers.detail" />
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
        ) : activityTabVisible || salesTabVisible ? (
          <Tabs value={activeTab} onChange={(v) => v && setActiveTab(v)}>
            <Tabs.List>
              <Tabs.Tab value="details" leftSection={<IconInfoCircle size={16} />}>
                {t('customers.detail.tab.details')}
              </Tabs.Tab>
              {salesTabVisible && (
                <Tabs.Tab value="sales" leftSection={<IconChartBar size={16} />}>
                  {t('report.entityTab.title')}
                </Tabs.Tab>
              )}
              {activityTabVisible && (
                <Tabs.Tab value="activity" leftSection={<IconHistory size={16} />}>
                  {t('customers.detail.tab.activity')}
                </Tabs.Tab>
              )}
            </Tabs.List>
            <Tabs.Panel value="details" pt="md">
              {body}
            </Tabs.Panel>
            {salesTabVisible && (
              <Tabs.Panel value="sales" pt="md">
                {/* Lazy-mount: only load the report chunk + store when selected. */}
                {activeTab === 'sales' && (
                  <EntitySalesPanel
                    target={{ kind: 'customer', code: customer.code, name: customer.name }}
                  />
                )}
              </Tabs.Panel>
            )}
            {activityTabVisible && (
              <Tabs.Panel value="activity" pt="md">
                {/* Lazy-mount: only fetch when this tab is selected. */}
                {activeTab === 'activity' && (
                  <ActivityByTargetPanel targetId={customer.id} i18nNamespace="customers.detail" />
                )}
              </Tabs.Panel>
            )}
          </Tabs>
        ) : (
          body
        )}
      </Stack>

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title={t('customers.deleteConfirm.title')}
        message={t('customers.deleteConfirm.message')}
        loading={deleting}
      />
      <ConfirmModal
        opened={toggleModalOpened}
        onClose={closeToggleModal}
        onConfirm={handleToggleStatus}
        title={
          customer.isActive
            ? t('__new__.07-entities.customers.dangerZone.disableItem')
            : t('__new__.07-entities.customers.dangerZone.enableItem')
        }
        message={
          customer.isActive
            ? t('__new__.07-entities.customers.dangerZone.disableConfirm')
            : t('__new__.07-entities.customers.dangerZone.enableConfirm')
        }
        confirmLabel={
          customer.isActive
            ? t('__new__.07-entities.customers.dangerZone.disableButton')
            : t('__new__.01-common.dangerZone.enableButton')
        }
        confirmColor={customer.isActive ? 'orange' : 'green'}
        loading={toggling}
      />
    </>
  );
}
