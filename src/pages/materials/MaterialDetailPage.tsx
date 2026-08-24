import {
  Accordion,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Image,
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
  IconBox,
  IconCategory,
  IconCircleCheck,
  IconEdit,
  IconHistory,
  IconListDetails,
  IconPhoto,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { FieldLabel, Tabs } from '@credo/base-ui/components';
import { ActiveBadge } from '@/components/badges';
import { asyncDeduplicator, device } from '@credo/base-ui/utils';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DangerAction } from '@/components/DangerAction';
import { DangerZoneCard } from '@/components/DangerZoneCard';
import { DetailField } from '@/components/DetailField';
import { SectionCard } from '@/components/SectionCard';
import { ImageUploadPanel, type PhotoEntry } from '@/components/ImageUploadPanel';
import { ImageZoomModal } from '@/components/ImageZoomModal';
import { ActivityByTargetPanel } from '@/components/activity/ActivityByTargetPanel';
import { NotFoundState } from '@/components/NotFoundState';
import { useMaterialStore, MATERIAL_RECORD_TARGET } from '@/stores/useMaterialStore';
import { useMaterialInventoryStore } from '@/stores/useMaterialInventoryStore';
import { useMyEmployee } from '@/hooks/useMyEmployee';
import { EntityConflictError } from '@/stores/createEntityStore';
import { formatDateTime } from '@/utils/dateFormat';
import { buildUploadDirectory, buildUploadFileName } from '@/utils/uploadPath';
import { logActivity } from '@/utils/activityLogger';
import { perms, isActivityLoggingEnabled } from '@/utils/permission';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';
import {
  getMaterialUnitCategory,
  hasMaterialAttributes,
  hasMaterialDescription,
  hasMaterialImages,
  hasMaterialMemo,
  hasMaterialMinimumStock,
  hasMaterialPricing,
  hasMaterialSpecification,
  hasMaterialTags,
  MATERIAL_CATEGORY_LOOKUP,
} from '@/utils/materialConfig';
import type { Material } from '@/types';

import { MaterialInventorySection } from './MaterialInventorySection';

const isMobile = device.isMobile;
const canEdit = perms.material.canEdit();
const canDelete = perms.material.canDelete();
const canManageInventory = perms.material.canManageInventory();
const hasDescription = hasMaterialDescription();
const hasSpecification = hasMaterialSpecification();
const hasMemo = hasMaterialMemo();
const hasPricing = hasMaterialPricing();
const hasMinimumStock = hasMaterialMinimumStock();
const hasTags = hasMaterialTags();
const hasAttributes = hasMaterialAttributes();
const hasImages = hasMaterialImages();
const activityEnabled = isActivityLoggingEnabled();
const activityTabVisible = !isMobile && activityEnabled;

export function MaterialDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const forceRefresh = useMaterialStore((s) => s.forceRefresh);

  const unitLabels = useLookupV2Labels(getMaterialUnitCategory());
  const categoryLabels = useLookupV2Labels(MATERIAL_CATEGORY_LOOKUP);

  const invRows = useMaterialInventoryStore((s) => s.items);
  const invInitialized = useMaterialInventoryStore((s) => s.initialized);
  const loadInventory = useMaterialInventoryStore((s) => s.loadAll);
  useEffect(() => {
    if (canManageInventory && !invInitialized) loadInventory();
  }, [invInitialized, loadInventory]);

  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);
  const [deleting, setDeleting] = useState(false);

  const [toggleModalOpened, { open: openToggleModal, close: closeToggleModal }] =
    useDisclosure(false);
  const [toggling, setToggling] = useState(false);

  const [activeTab, setActiveTab] = useState<string>('details');
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const cached = useMaterialStore.getState().getById(id);
    if (cached) {
      setMaterial(cached);
      setLoading(false);
      return;
    }
    setLoading(true);

    asyncDeduplicator.call(`material:${id}`, async () => {
      await cMngtConnector
        .getSingleRecordById(MATERIAL_RECORD_TARGET, { id })
        .then((res) => setMaterial(res.item as Material))
        .catch(() => {
          notifications.show({ color: 'red', message: t('materials.notifications.fetchError') });
          setMaterial(null);
        })
        .finally(() => setLoading(false));
    });
  }, [id, t]);

  const handleDelete = useCallback(async () => {
    if (!id || !material) return;
    setDeleting(true);
    try {
      await useMaterialStore.getState().deleteSafely({ id, version: material.version });
      logActivity('material.delete', id);
      notifications.show({ color: 'green', message: t('materials.notifications.deleteSuccess') });
      forceRefresh();
      navigate(ROUTES.MATERIALS.LIST);
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) setMaterial(err.latest as Material);
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        closeDeleteModal();
      } else {
        notifications.show({ color: 'red', message: t('materials.notifications.deleteError') });
      }
    } finally {
      setDeleting(false);
    }
  }, [id, material, t, navigate, forceRefresh, closeDeleteModal]);

  const handleToggleStatus = useCallback(async () => {
    if (!id || !material) return;
    const nextActive = !material.isActive;
    setToggling(true);
    try {
      const updated = await useMaterialStore.getState().updateSafely({
        id,
        version: material.version,
        patch: { isActive: nextActive },
      });
      setMaterial(updated as Material);
      logActivity(nextActive ? 'material.enable' : 'material.disable', id);
      notifications.show({
        color: 'green',
        message: t(
          nextActive
            ? 'materials.notifications.enableSuccess'
            : 'materials.notifications.disableSuccess',
        ),
      });
      closeToggleModal();
      forceRefresh();
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) setMaterial(err.latest as Material);
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        closeToggleModal();
      } else {
        notifications.show({ color: 'red', message: t('materials.notifications.toggleError') });
      }
    } finally {
      setToggling(false);
    }
  }, [id, material, t, closeToggleModal, forceRefresh]);

  const handleImagesChange = useCallback(
    async (entries: PhotoEntry[]) => {
      if (!material) return;
      const urls = entries.filter((e) => !e.isDeleted).map((e) => e.url);
      const nextExtra = { ...material.extra, images: urls.map((url) => ({ url })) };
      try {
        const updated = await useMaterialStore.getState().updateSafely({
          id: material.id,
          version: material.version,
          patch: { extra: nextExtra },
        });
        setMaterial(updated as Material);
        logActivity('material.updateImages', material.id);
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setMaterial(err.latest as Material);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({ color: 'red', message: t('materials.notifications.updateError') });
        }
      }
    },
    [material, t],
  );

  const me = useMyEmployee();

  if (loading) return null;
  if (!material) {
    return (
      <NotFoundState
        title={t('common.notFound.title')}
        message={t('common.notFound.message')}
        backTo={ROUTES.MATERIALS.LIST}
        backLabel={t('common.notFound.backToList')}
      />
    );
  }

  const units = material.extra?.units ?? [];
  const category = material.extra?.category ?? '';
  const baseUnit = units[0] ?? '';
  const invRow = invRows.find((r) => r.itemCode === material.code) ?? null;
  const description = material.extra?.description ?? '';
  const specification = material.extra?.specification ?? '';
  const memo = material.extra?.memo ?? '';
  const costPrice = material.extra?.costPrice;
  const minimumStock = material.extra?.minimumStock;
  const tags = material.extra?.tags ?? [];
  const attributes = material.extra?.attributes ?? [];
  const unitConversions = material.extra?.unitConversions ?? [];

  const categoryInUse = categoryLabels.size > 0 || !!category;
  const emptyDash = <Text c="dimmed">—</Text>;

  const images = material.extra?.images ?? [];
  const imageEntries: PhotoEntry[] = images.map((img) => ({ url: img.url, timestamp: '' }));
  const uploadDir = buildUploadDirectory({ type: 'material', id: material.id });

  const imagesContent = (
    <Stack gap="md">
      {canEdit && !isMobile && (
        <Card withBorder radius="md" padding="md">
          <ImageUploadPanel
            section="upload"
            images={imageEntries}
            onChange={handleImagesChange}
            imageDirectory={uploadDir}
            buildFileName={buildUploadFileName}
            marker={material.name || material.code}
            currentUserId={me?.id}
            currentUserName={me?.name}
          />
        </Card>
      )}
      <Card withBorder radius="md" padding={isMobile ? 'md' : 'lg'}>
        {canEdit ? (
          <ImageUploadPanel
            section="grid"
            images={imageEntries}
            onChange={handleImagesChange}
            imageDirectory={uploadDir}
            buildFileName={buildUploadFileName}
            marker={material.name || material.code}
            currentUserId={me?.id}
            currentUserName={me?.name}
          />
        ) : images.length === 0 ? (
          <Stack align="center" gap="sm" py="xl">
            <ThemeIcon size={56} radius="xl" variant="light" color="gray">
              <IconPhoto size={28} stroke={1.5} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              {t('materials.detail.imagesEmpty')}
            </Text>
            <Text size="xs" c="dimmed" ta="center" maw={320}>
              {t('materials.detail.imagesEmptyDesc')}
            </Text>
          </Stack>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
            {images.map((img, i) => (
              <Card
                key={`${img.url}-${i}`}
                withBorder
                padding={0}
                radius="md"
                style={{ cursor: 'zoom-in', overflow: 'hidden', aspectRatio: '1 / 1' }}
                onClick={() => setZoomUrl(img.url)}
              >
                <Image
                  src={img.url}
                  alt={`${material.name} ${i + 1}`}
                  fit="cover"
                  h="100%"
                  w="100%"
                />
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Card>
    </Stack>
  );

  const stockSummary =
    canManageInventory && invInitialized && invRow ? (
      <Stack gap={0} align="flex-end" style={{ flexShrink: 0 }}>
        <FieldLabel>{t('materials.detail.statTotalOnHand')}</FieldLabel>
        <Group gap={4} wrap="nowrap" align="baseline">
          <Text
            size={isMobile ? 'lg' : '28px'}
            fw={800}
            c={invRow.onHand < 0 ? 'red' : undefined}
            lh={1.1}
          >
            {invRow.onHand.toLocaleString()}
          </Text>
          {baseUnit && <FieldLabel>{lookupLabelOf(unitLabels, baseUnit, baseUnit)}</FieldLabel>}
        </Group>
      </Stack>
    ) : null;

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
          <IconBox size={isMobile ? 28 : 40} stroke={1.5} />
        </ThemeIcon>
        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={8} wrap="wrap" align="center">
            <Title order={isMobile ? 5 : 3} lh={1.2}>
              {material.name}
            </Title>
            <ActiveBadge
              isActive={material.isActive}
              activeLabel={t('materials.status.active')}
              inactiveLabel={t('__new__.01-common.labels.inactive')}
              size="sm"
            />
            {category && (
              <Badge variant="light" color="gray" size="sm" radius="sm" tt="none">
                {lookupLabelOf(categoryLabels, category, category)}
              </Badge>
            )}
          </Group>
          <Text size="xs" ff="monospace" c="dimmed" tt="uppercase" fw={500}>
            {material.code}
          </Text>
        </Stack>
        {stockSummary}
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
            color={material.isActive ? 'orange' : 'green'}
            size="compact-sm"
            leftSection={material.isActive ? <IconBan size={14} /> : <IconCircleCheck size={14} />}
            onClick={openToggleModal}
          >
            {material.isActive
              ? t('__new__.01-common.dangerZone.disableButton')
              : t('__new__.01-common.dangerZone.enableButton')}
          </Button>
        )}
        {canEdit && (
          <Button
            component={Link}
            to={ROUTES.MATERIALS.EDIT.replace(':id', material.id)}
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

  const detailsFields = (
    <Stack gap="sm">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <DetailField label={t('common.labels.name')}>{material.name}</DetailField>
        <DetailField label={t('common.labels.code')}>
          <Text span ff="monospace" fw={500} tt="uppercase">
            {material.code}
          </Text>
        </DetailField>
      </SimpleGrid>
      <Divider />
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <DetailField label={t('materials.form.unitLabel')}>
          {units.length > 0 ? (
            <Stack gap={4}>
              <Group gap={6}>
                {units.map((u, i) => (
                  <Badge
                    key={u}
                    size="sm"
                    variant={i === 0 ? 'light' : 'outline'}
                    color={i === 0 ? 'primary' : 'gray'}
                  >
                    {lookupLabelOf(unitLabels, u, u)}
                  </Badge>
                ))}
              </Group>
              {unitConversions.length > 0 && (
                <Stack gap={2}>
                  {unitConversions.map((c, i) => (
                    <Text key={`${c.unit}-${c.baseUnit}-${i}`} size="xs" c="dimmed">
                      1 {lookupLabelOf(unitLabels, c.unit, c.unit)} = {c.quantity.toLocaleString()}{' '}
                      {lookupLabelOf(unitLabels, c.baseUnit, c.baseUnit)}
                    </Text>
                  ))}
                </Stack>
              )}
            </Stack>
          ) : (
            emptyDash
          )}
        </DetailField>
        {categoryInUse && (
          <DetailField label={t('materials.form.categoryLabel')}>
            {category ? (
              <Group gap={6} align="center">
                <IconCategory size={14} />
                {lookupLabelOf(categoryLabels, category, category)}
              </Group>
            ) : (
              emptyDash
            )}
          </DetailField>
        )}
      </SimpleGrid>
      {(hasPricing || hasMinimumStock || hasSpecification) && (
        <>
          <Divider />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {hasPricing && (
              <DetailField label={t('materials.form.priceLabel')}>
                {costPrice != null ? costPrice.toLocaleString() : emptyDash}
              </DetailField>
            )}
            {hasMinimumStock && (
              <DetailField label={t('materials.form.minimumStockLabel')}>
                {minimumStock != null ? (
                  <Text>
                    {minimumStock.toLocaleString()}
                    {baseUnit ? ` ${lookupLabelOf(unitLabels, baseUnit, baseUnit)}` : ''}
                  </Text>
                ) : (
                  emptyDash
                )}
              </DetailField>
            )}
            {hasSpecification && (
              <DetailField label={t('materials.form.packagingSpecLabel')}>
                {specification || emptyDash}
              </DetailField>
            )}
          </SimpleGrid>
        </>
      )}
      {hasDescription && (
        <>
          <Divider />
          <DetailField label={t('common.labels.description')}>
            {description ? (
              <Text style={{ whiteSpace: 'pre-wrap' }}>{description}</Text>
            ) : (
              emptyDash
            )}
          </DetailField>
        </>
      )}
      {hasMemo && (
        <>
          <Divider />
          <DetailField label={t('materials.form.memoLabel')}>
            {memo ? <Text style={{ whiteSpace: 'pre-wrap' }}>{memo}</Text> : emptyDash}
          </DetailField>
        </>
      )}
      {hasTags && (
        <>
          <Divider />
          <DetailField label={t('products.form.tagsLabel')}>
            {tags.length > 0 ? (
              <Group gap={6} wrap="wrap">
                {tags.map((tag) => (
                  <Badge key={tag} variant="light" color="gray" size="sm" radius="sm" tt="none">
                    {tag}
                  </Badge>
                ))}
              </Group>
            ) : (
              emptyDash
            )}
          </DetailField>
        </>
      )}
      {hasAttributes && (
        <>
          <Divider />
          <DetailField label={t('products.form.attributesLabel')}>
            {attributes.length > 0 ? (
              <Stack gap={4}>
                {attributes.map((a, i) => (
                  <Group key={`${a.key}-${i}`} gap={6} wrap="nowrap">
                    <Text size="sm" fw={500} c="dimmed">
                      {a.key}:
                    </Text>
                    <Text size="sm">{a.value}</Text>
                  </Group>
                ))}
              </Stack>
            ) : (
              emptyDash
            )}
          </DetailField>
        </>
      )}
      <Divider />
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <DetailField label={t('common.labels.createdAt')}>
          {formatDateTime(material.createdAt)}
        </DetailField>
        <DetailField label={t('common.labels.updatedAt')}>
          {formatDateTime(material.updatedAt)}
        </DetailField>
      </SimpleGrid>
    </Stack>
  );

  const detailsCard = (
    <SectionCard icon={<IconListDetails size={14} />} title={t('materials.detail.tab.details')}>
      {detailsFields}
    </SectionCard>
  );

  const dangerZone =
    canEdit || canDelete ? (
      <DangerZoneCard title={t('__new__.01-common.dangerZone.title')}>
        {canEdit && (
          <DangerAction
            title={
              material.isActive
                ? t('__new__.07-entities.materials.dangerZone.disableItem')
                : t('__new__.07-entities.materials.dangerZone.enableItem')
            }
            description={t(
              material.isActive
                ? '__new__.07-entities.materials.dangerZone.disableItemDesc'
                : '__new__.07-entities.materials.dangerZone.enableItemDesc',
            )}
            buttonLabel={
              material.isActive
                ? t('__new__.07-entities.materials.dangerZone.disableButton')
                : t('__new__.01-common.dangerZone.enableButton')
            }
            buttonIcon={material.isActive ? <IconBan size={14} /> : <IconCircleCheck size={14} />}
            onClick={openToggleModal}
            buttonColor={material.isActive ? 'orange' : 'green'}
          />
        )}
        {canEdit && canDelete && <Divider variant="dashed" />}
        {canDelete && (
          <DangerAction
            title={t('__new__.07-entities.materials.dangerZone.deleteItem')}
            description={t('__new__.07-entities.materials.dangerZone.deleteItemDesc')}
            buttonLabel={t('__new__.01-common.actions.remove')}
            buttonIcon={<IconTrash size={14} />}
            onClick={openDeleteModal}
            buttonColor="red"
          />
        )}
      </DangerZoneCard>
    ) : null;

  const body = (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, md: 7 }}>
        <Stack gap="md">{detailsCard}</Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Stack gap="md">
          {canManageInventory && <MaterialInventorySection material={material} canManage />}
          {dangerZone}
        </Stack>
      </Grid.Col>
    </Grid>
  );

  const mobileContent = (
    <Stack gap="md">
      <Accordion defaultValue="info" variant="separated">
        <Accordion.Item value="info">
          <Accordion.Control icon={<IconListDetails size={16} />}>
            {t('materials.detail.tab.details')}
          </Accordion.Control>
          <Accordion.Panel>{detailsFields}</Accordion.Panel>
        </Accordion.Item>
        {canManageInventory && (
          <Accordion.Item value="inventory">
            <Accordion.Control icon={<IconBox size={16} />}>
              {t('materialInventory.title')}
            </Accordion.Control>
            <Accordion.Panel>
              <MaterialInventorySection material={material} canManage />
            </Accordion.Panel>
          </Accordion.Item>
        )}
        {hasImages && (
          <Accordion.Item value="images">
            <Accordion.Control icon={<IconPhoto size={16} />}>
              {t('materials.detail.tab.images')}
            </Accordion.Control>
            <Accordion.Panel>{imagesContent}</Accordion.Panel>
          </Accordion.Item>
        )}
        {activityEnabled && (
          <Accordion.Item value="activity">
            <Accordion.Control icon={<IconHistory size={16} />}>
              {t('materials.detail.tab.activity')}
            </Accordion.Control>
            <Accordion.Panel>
              <ActivityByTargetPanel targetId={material.id} i18nNamespace="materials.detail" />
            </Accordion.Panel>
          </Accordion.Item>
        )}
      </Accordion>
      {dangerZone}
    </Stack>
  );

  return (
    <>
      <Stack gap={isMobile ? 'md' : 'lg'}>
        {!isMobile && desktopTopActions}
        {headerCard}
        {/* {isMobile && canEdit && (
          <Button
            variant="light"
            color={material.isActive ? 'orange' : 'green'}
            size="sm"
            leftSection={material.isActive ? <IconBan size={16} /> : <IconCircleCheck size={16} />}
            onClick={openToggleModal}
            fullWidth
          >
            {material.isActive
              ? t('__new__.01-common.dangerZone.disableButton')
              : t('__new__.01-common.dangerZone.enableButton')}
          </Button>
        )} */}
        {isMobile ? (
          mobileContent
        ) : hasImages || activityTabVisible ? (
          <Tabs value={activeTab} onChange={(v) => v && setActiveTab(v)}>
            <Tabs.List>
              <Tabs.Tab value="details" leftSection={<IconListDetails size={16} />}>
                {t('materials.detail.tab.details')}
              </Tabs.Tab>
              {hasImages && (
                <Tabs.Tab
                  value="images"
                  leftSection={<IconPhoto size={16} />}
                  rightSection={
                    images.length > 0 ? (
                      <Badge size="xs" variant="light" color="gray" radius="sm">
                        {images.length}
                      </Badge>
                    ) : null
                  }
                >
                  {t('materials.detail.tab.images')}
                </Tabs.Tab>
              )}
              {activityTabVisible && (
                <Tabs.Tab value="activity" leftSection={<IconHistory size={16} />}>
                  {t('materials.detail.tab.activity')}
                </Tabs.Tab>
              )}
            </Tabs.List>
            <Tabs.Panel value="details" pt="md">
              {body}
            </Tabs.Panel>
            {hasImages && (
              <Tabs.Panel value="images" pt="md">
                {imagesContent}
              </Tabs.Panel>
            )}
            {activityTabVisible && (
              <Tabs.Panel value="activity" pt="md">
                {/* Lazy-mount: only fetch when this tab is selected. */}
                {activeTab === 'activity' && (
                  <ActivityByTargetPanel targetId={material.id} i18nNamespace="materials.detail" />
                )}
              </Tabs.Panel>
            )}
          </Tabs>
        ) : (
          body
        )}
      </Stack>

      <ImageZoomModal
        opened={!!zoomUrl}
        onClose={() => setZoomUrl(null)}
        imageUrl={zoomUrl ?? ''}
      />

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title={t('materials.deleteConfirm.title')}
        message={t('materials.deleteConfirm.message')}
        loading={deleting}
      />
      <ConfirmModal
        opened={toggleModalOpened}
        onClose={closeToggleModal}
        onConfirm={handleToggleStatus}
        title={
          material.isActive
            ? t('__new__.07-entities.materials.dangerZone.disableItem')
            : t('__new__.07-entities.materials.dangerZone.enableItem')
        }
        message={
          material.isActive
            ? t('__new__.07-entities.materials.dangerZone.disableConfirm')
            : t('__new__.07-entities.materials.dangerZone.enableConfirm')
        }
        confirmLabel={
          material.isActive
            ? t('__new__.01-common.dangerZone.disableButton')
            : t('__new__.01-common.dangerZone.enableButton')
        }
        confirmColor={material.isActive ? 'orange' : 'green'}
        loading={toggling}
      />
    </>
  );
}
