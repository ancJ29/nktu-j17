import {
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconCircleCheck,
  IconCopy,
  IconEdit,
  IconInfoCircle,
  IconListDetails,
  IconLock,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { EntityConflictError } from '@/stores/createEntityStore';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DangerAction } from '@/components/DangerAction';
import { DangerZoneCard } from '@/components/DangerZoneCard';
import { DetailField } from '@/components/DetailField';
import { EmployeeLink } from '@/components/EmployeeLink';
import { MaterialLink } from '@/components/MaterialLink';
import { NotFoundState } from '@/components/NotFoundState';
import { SectionCard } from '@/components/SectionCard';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useMaterialStore } from '@/stores/useMaterialStore';
import { useMaterialInventoryStore } from '@/stores/useMaterialInventoryStore';
import { device } from '@credo/base-ui/utils';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';
import { getMaterialUnitCategory } from '@/utils/materialConfig';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import type { Material, MaterialInventoryRow, WarehouseDocRow, WarehouseDocStatus } from '@/types';
import { bundleFor, type WarehouseDocKind } from './kinds';
import { postWarehouseDocInventory } from './posting';

const isMobile = device.isMobile;

export function WarehouseDocDetail({ kind }: { kind: WarehouseDocKind }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const bundle = bundleFor(kind);
  const canCreate = kind.perms.canCreate();
  const canEdit = kind.perms.canEdit();
  const canDelete = kind.perms.canDelete();
  const unitLabels = useLookupV2Labels(getMaterialUnitCategory());

  const docs = bundle.useStore((s) => s.items);
  const initialized = bundle.useStore((s) => s.initialized);
  const loadAll = bundle.useStore((s) => s.loadAll);

  const employeesInitialized = useEmployeeStore((s) => s.initialized);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);
  useEffect(() => {
    if (!employeesInitialized) loadEmployees();
  }, [employeesInitialized, loadEmployees]);

  const postEnabled = kind.postInventoryEnabled();
  const materials = useMaterialStore((s) => s.items);
  const materialsInitialized = useMaterialStore((s) => s.initialized);
  const loadMaterials = useMaterialStore((s) => s.loadAll);
  const inventory = useMaterialInventoryStore((s) => s.items);
  const inventoryInitialized = useMaterialInventoryStore((s) => s.initialized);
  const loadInventory = useMaterialInventoryStore((s) => s.loadAll);
  useEffect(() => {
    if (postEnabled && !materialsInitialized) loadMaterials();
    if (postEnabled && !inventoryInitialized) loadInventory();
  }, [postEnabled, materialsInitialized, loadMaterials, inventoryInitialized, loadInventory]);

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmModalOpened, { open: openConfirmModal, close: closeConfirmModal }] =
    useDisclosure(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!initialized) loadAll();
  }, [initialized, loadAll]);

  const doc = useMemo<WarehouseDocRow | null>(
    () => docs.find((d) => d.id === id) ?? null,
    [docs, id],
  );

  const handleDelete = useCallback(async () => {
    if (!doc) return;
    setDeleting(true);
    try {
      await bundle.deleteSafely({ id: doc.id, version: doc.version, partitionKey: doc.recordDate });
      notifications.show({
        color: 'green',
        message: t('warehouseDoc.notifications.deleteSuccess'),
      });
      navigate(kind.routes.LIST);
    } catch (err) {
      if (err instanceof EntityConflictError) {
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        closeDeleteModal();
      } else {
        notifications.show({ color: 'red', message: t('warehouseDoc.notifications.deleteError') });
      }
    } finally {
      setDeleting(false);
    }
  }, [doc, bundle, kind, t, navigate, closeDeleteModal]);

  const handleConfirm = useCallback(async () => {
    if (!doc) return;
    setConfirming(true);
    try {
      const materialByCode = new Map<string, Material>(materials.map((m) => [m.code, m]));
      const invByCode = new Map<string, MaterialInventoryRow>(
        inventory.map((r) => [r.itemCode, r]),
      );
      await postWarehouseDocInventory(doc, kind.direction, materialByCode, invByCode);

      const flip = (target: WarehouseDocRow) =>
        bundle.updateSafely({
          id: target.id,
          version: target.version,
          partitionKey: target.recordDate,
          patch: { extra: { ...target.extra, status: 'confirmed' } },
        });
      try {
        await flip(doc);
      } catch (flipErr) {
        if (flipErr instanceof EntityConflictError && flipErr.latest) {
          await flip(flipErr.latest as WarehouseDocRow);
        } else {
          throw flipErr;
        }
      }
      notifications.show({
        color: 'green',
        message: t('warehouseDoc.notifications.confirmSuccess'),
      });
      closeConfirmModal();
    } catch (err) {
      if (err instanceof EntityConflictError) {
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        closeConfirmModal();
      } else {
        notifications.show({ color: 'red', message: t('warehouseDoc.notifications.confirmError') });
      }
    } finally {
      setConfirming(false);
    }
  }, [doc, bundle, kind, t, materials, inventory, closeConfirmModal]);

  if (!initialized) return null;
  if (!doc) {
    return (
      <NotFoundState
        title={t('common.notFound.title')}
        message={t('common.notFound.message')}
        backTo={kind.routes.LIST}
        backLabel={t('common.notFound.backToList')}
      />
    );
  }

  const lines = doc.extra.lines ?? [];
  const status: WarehouseDocStatus = doc.extra.status ?? 'draft';
  const isConfirmed = postEnabled && status === 'confirmed';
  const canConfirm = postEnabled && status === 'draft' && canEdit;

  return (
    <>
      <Stack gap={isMobile ? 'md' : 'lg'}>
        {!isMobile && (
          <Group justify="space-between">
            <Button
              onClick={() => window.history.back()}
              variant="subtle"
              size="compact-sm"
              leftSection={<IconArrowLeft size={16} />}
            >
              {t('__new__.01-common.actions.back')}
            </Button>
            <Group gap="sm">
              {canConfirm && (
                <Button
                  color="green"
                  size="compact-sm"
                  leftSection={<IconCircleCheck size={14} />}
                  onClick={openConfirmModal}
                >
                  {t('warehouseDoc.actions.confirm')}
                </Button>
              )}
              {/* Copy → a fresh create form pre-filled from this doc. Daily
                  transactions repeat, so duplicating (incl. a CONFIRMED doc) is
                  the fast path. Desktop-only, matching the create form. */}
              {canCreate && (
                <Button
                  variant="light"
                  color="gray"
                  size="compact-sm"
                  leftSection={<IconCopy size={14} />}
                  onClick={() => navigate(kind.routes.NEW, { state: { copyFrom: doc } })}
                >
                  {t('warehouseDoc.actions.copy')}
                </Button>
              )}
              {canEdit && !isConfirmed && (
                <Button
                  component={Link}
                  to={kind.routes.EDIT.replace(':id', doc.id)}
                  variant="light"
                  size="compact-sm"
                  leftSection={<IconEdit size={14} />}
                >
                  {t('__new__.01-common.actions.edit')}
                </Button>
              )}
            </Group>
          </Group>
        )}

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
              <kind.icon size={isMobile ? 28 : 40} stroke={1.5} />
            </ThemeIcon>
            <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
              <Group gap="sm" wrap="wrap" align="center">
                <Title order={isMobile ? 5 : 3} lh={1.2} ff="monospace">
                  {doc.extra.code}
                </Title>
                {postEnabled && (
                  <Badge
                    color={isConfirmed ? 'green' : 'gray'}
                    variant={isConfirmed ? 'filled' : 'light'}
                    leftSection={isConfirmed ? <IconCircleCheck size={12} /> : undefined}
                  >
                    {t(`warehouseDoc.status.${status}`)}
                  </Badge>
                )}
              </Group>
              <Text size="sm" c="dimmed">
                {formatDate(doc.recordDate)}
              </Text>
            </Stack>
          </Group>
        </Card>

        {/* 8/4 two-column body (mirrors the material detail): line items left,
            document info + danger-zone rail right. Collapses to one col on mobile. */}
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <SectionCard
              icon={<IconListDetails size={14} />}
              title={t('warehouseDoc.form.linesLabel')}
            >
              {lines.length === 0 ? (
                <Text size="sm" c="dimmed" fs="italic">
                  —
                </Text>
              ) : (
                <Table striped withRowBorders={false}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('warehouseDoc.form.materialLabel')}</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>
                        {t('warehouseDoc.form.quantityLabel')}
                      </Table.Th>
                      <Table.Th>{t('warehouseDoc.form.unitLabel')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {lines.map((l, i) => (
                      <Table.Tr key={`${l.itemCode}-${i}`}>
                        <Table.Td>
                          <MaterialLink code={l.itemCode} name={l.itemName} size="sm" />
                          <Text size="xs" c="dimmed" ff="monospace">
                            {l.itemCode}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text fw={600}>{Number(l.quantity).toLocaleString()}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {lookupLabelOf(unitLabels, l.unit)}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </SectionCard>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <SectionCard
                icon={<IconInfoCircle size={14} />}
                title={t('warehouseDoc.form.headerSection')}
              >
                <Stack gap="md">
                  {doc.extra.reference && (
                    <DetailField label={t('common.labels.reference')}>
                      <Text size="sm">{doc.extra.reference}</Text>
                    </DetailField>
                  )}
                  {doc.extra.assignedTo && (
                    <DetailField label={t('common.labels.assignedTo')}>
                      <EmployeeLink id={doc.extra.assignedTo} />
                    </DetailField>
                  )}
                  {doc.extra.note && (
                    <DetailField label={t('__new__.01-common.labels.note')}>
                      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                        {doc.extra.note}
                      </Text>
                    </DetailField>
                  )}
                  <DetailField label={t('common.labels.createdAt')}>
                    {formatDateTime(doc.createdAt)}
                  </DetailField>
                  <DetailField label={t('common.labels.updatedAt')}>
                    {formatDateTime(doc.updatedAt)}
                  </DetailField>
                </Stack>
              </SectionCard>

              {/* Mobile confirm affordance — unlike the desktop-only edit form,
                  confirming is a plain action that works on mobile. */}
              {isMobile && canConfirm && (
                <Button
                  color="green"
                  leftSection={<IconCircleCheck size={16} />}
                  fullWidth
                  onClick={openConfirmModal}
                >
                  {t('warehouseDoc.actions.confirm')}
                </Button>
              )}

              {/* A confirmed doc is final — edit + delete are withdrawn. */}
              {isConfirmed && (
                <Card withBorder radius="md" padding="md">
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon size={32} radius="md" variant="light" color="gray">
                      <IconLock size={16} />
                    </ThemeIcon>
                    <Text size="sm" c="dimmed">
                      {t('warehouseDoc.lockedNote')}
                    </Text>
                  </Group>
                </Card>
              )}

              {canDelete && !isConfirmed && (
                <DangerZoneCard title={t('__new__.01-common.dangerZone.title')}>
                  <DangerAction
                    title={t('warehouseDoc.dangerZone.deleteItem')}
                    description={t('warehouseDoc.dangerZone.deleteItemDesc')}
                    buttonLabel={t('__new__.01-common.actions.remove')}
                    buttonIcon={<IconTrash size={14} />}
                    onClick={openDeleteModal}
                    buttonColor="red"
                  />
                </DangerZoneCard>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title={t('warehouseDoc.deleteConfirm.title')}
        message={t('warehouseDoc.deleteConfirm.message')}
        loading={deleting}
      />

      <ConfirmModal
        opened={confirmModalOpened}
        onClose={closeConfirmModal}
        onConfirm={handleConfirm}
        title={t('warehouseDoc.confirmModal.title')}
        message={t(`warehouseDoc.confirmModal.message_${kind.direction}`)}
        confirmLabel={t('warehouseDoc.actions.confirm')}
        confirmColor="green"
        loading={confirming}
      />
    </>
  );
}
