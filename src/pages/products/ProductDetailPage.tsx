import { formatNumber } from '@/utils/number';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Image,
  Select,
  SimpleGrid,
  Stack,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { useClipboard, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBan,
  IconBarcode,
  IconBoxMultiple,
  IconBuildingWarehouse,
  IconCategory,
  IconChartBar,
  IconCheck,
  IconCircleCheck,
  IconCopy,
  IconEdit,
  IconFileDescription,
  IconHistory,
  IconListDetails,
  IconPhoto,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import JsBarcode from 'jsbarcode';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { CodeLabel, FieldLabel, Tabs } from '@credo/base-ui/components';
import { asyncDeduplicator, device } from '@credo/base-ui/utils';
import { ActiveBadge, CategoryBadge, TagBadge, UnitBadge } from '@/components/badges';
import { ConfirmModal } from '@/components/ConfirmModal';
import { CopyValueButton } from '@/components/CopyValueButton';
import { DescriptionText } from '@/components/DescriptionText';
import { EmployeeLink } from '@/components/EmployeeLink';
import { ImageUploadPanel, type PhotoEntry } from '@/components/ImageUploadPanel';
import { SectionCard, type SectionCardEditLabels } from '@/components/SectionCard';
import { buildUploadDirectory, buildUploadFileName } from '@/utils/uploadPath';
import { ImageZoomModal } from '@/components/ImageZoomModal';
import { NotFoundState } from '@/components/NotFoundState';
import { useMyEmployee } from '@/hooks/useMyEmployee';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useProductInventoryStore } from '@/stores/useProductInventoryStore';
import { useProductStore } from '@/stores/useProductStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { formatDateTime } from '@/utils/dateFormat';
import { lookupLabelOf, useLookupV2Labels, useLookupV2Options } from '@/hooks';
import { getItemBaseUnit } from '@/utils/unitConversion';
import {
  hasBarcodeForProducts,
  hasHideFromInventoryListForProducts,
  hasImagesForProducts,
  hasTechnicalSpecsForProducts,
  isActivityLoggingEnabled,
  isLocationsEnabled,
  isPriceManagementEnabled,
  isProductInventoryEnabled,
  perms,
} from '@/utils/permission';
import { logActivity } from '@/utils/activityLogger';
import { deepDiff } from '@/utils/deepDiff';
import type { Product, ProductExtra, ProductImageEntry } from '@/types';
import { ActivityByTargetPanel } from '@/components/activity/ActivityByTargetPanel';
import EntitySalesPanel from '@/pages/reports/EntitySalesPanel';
import { useCanAccessReports } from '@/pages/reports/reportAccess';
import { ProductInventorySection } from './ProductInventorySection';
import { ProductLink } from '@/components/ProductLink';
import { ProductThumb } from './ProductThumb';
import { TimestampLine } from '@/components/TimestampLine';
import { isBreakdownSet, isProductSet } from '@/utils/productSet';
import { ProductSetBadge } from '@/components/ProductSetBadge';
import { findEmployeeByLoginEmail } from '@/utils/loginEmail';

const isMobile = device.isMobile;
const canEdit = perms.product.canEdit();
const canDelete = perms.product.canDelete();
const canCreateInventory = perms.productInventory.canCreate();

const canShowPrice = isPriceManagementEnabled() && perms.product.canManagePrice();
const inventoryEnabled = isProductInventoryEnabled();
const locationsEnabled = isLocationsEnabled();

const activityTabVisible = !isMobile && isActivityLoggingEnabled();
const technicalSpecsEnabled = hasTechnicalSpecsForProducts();
const barcodeEnabled = hasBarcodeForProducts();
const imagesEnabled = hasImagesForProducts();
const hideFromInventoryListEnabled = hasHideFromInventoryListForProducts();

type ClassificationDraft = {
  category: string;
  tags: string[];
  attributes: Array<{ key: string; value: string }>;
};

function useCardEdit<T>() {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);

  const begin = useCallback((initial: T) => {
    setDraft(initial);
    setEditing(true);
  }, []);

  const cancel = useCallback(() => {
    setDraft(null);
    setEditing(false);
  }, []);

  const save = useCallback(
    async (commit: (d: T) => Promise<void>) => {
      if (draft === null) return;
      setSaving(true);
      try {
        await commit(draft);
        setDraft(null);
        setEditing(false);
      } catch {
        // Caller surfaces the error; stay in edit mode.
      } finally {
        setSaving(false);
      }
    },
    [draft],
  );

  return { editing, draft, setDraft, saving, begin, cancel, save };
}

function SpecRow({ label, value }: { readonly label: string; readonly value: React.ReactNode }) {
  return (
    <Group justify="space-between" wrap="wrap" align="baseline" gap="md">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={500} ta="right">
        {value}
      </Text>
    </Group>
  );
}

export function ProductDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const unitLabels = useLookupV2Labels('unit');
  const categoryOptions = useLookupV2Options('product-category');
  const tagOptions = useLookupV2Options('product-tag');
  const editLabels = useMemo<SectionCardEditLabels>(
    () => ({
      edit: t('__new__.01-common.actions.edit'),
      save: t('__new__.01-common.actions.save'),
      cancel: t('__new__.01-common.actions.cancel'),
    }),
    [t],
  );

  const [searchParams] = useSearchParams();
  const initialTab =
    isMobile && inventoryEnabled && searchParams.get('tab') === 'inventory'
      ? 'inventory'
      : 'details';

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(initialTab);

  const salesTabVisible = useCanAccessReports();

  const descEdit = useCardEdit<string>();
  const specsEdit = useCardEdit<Array<{ key: string; value: string }>>();
  const classEdit = useCardEdit<ClassificationDraft>();

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);
  const [deleting, setDeleting] = useState(false);

  const [toggleModalOpened, { open: openToggleModal, close: closeToggleModal }] =
    useDisclosure(false);
  const [toggling, setToggling] = useState(false);

  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const cached = useProductStore.getState().getById(id) as Product | undefined;
    if (cached) {
      if (cached.extra?.isDeleted) {
        navigate(ROUTES.PRODUCTS.LIST, { replace: true });
        return;
      }

      setProduct(cached);
      setLoading(false);
      return;
    }
    setLoading(true);

    asyncDeduplicator.call(`product:${id}`, async () => {
      await cMngtConnector
        .getProductById<ProductExtra>({ id })
        .then((res) => {
          if (res.product.extra?.isDeleted) {
            navigate(ROUTES.PRODUCTS.LIST, { replace: true });
            return;
          }
          setProduct(res.product);
        })
        .catch(() => {
          notifications.show({
            color: 'red',
            message: t('products.notifications.fetchError'),
          });
          setProduct(null);
        })
        .finally(() => setLoading(false));
    });
  }, [id, t, navigate]);

  useEffect(() => {
    void useProductInventoryStore.getState().revalidate();
  }, []);

  const handleDelete = useCallback(async () => {
    if (!id || !product) return;

    if (inventoryEnabled) {
      const liveItems = useProductInventoryStore.getState().items;
      let liveTotal = 0;
      for (const r of liveItems) {
        if (r.itemCode === product.code && !r.extra?.isDeleted) liveTotal += r.onHand;
      }
      if (liveTotal > 0) {
        notifications.show({
          color: 'red',
          message: t('__new__.07-entities.products.dangerZone.deleteBlockedHasStock'),
        });
        closeDeleteModal();
        return;
      }
    }
    setDeleting(true);
    try {
      await useProductStore.getState().updateSafely({
        id,
        version: product.version,
        patch: {
          isActive: false,
          extra: { ...product.extra, isDeleted: true },
        },
      });
      logActivity('product.delete', id);
      notifications.show({
        color: 'green',
        message: t('products.notifications.deleteSuccess'),
      });
      navigate(ROUTES.PRODUCTS.LIST);
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) setProduct(err.latest as Product);
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
          message: t('products.notifications.deleteError'),
        });
      }
    } finally {
      setDeleting(false);
    }
  }, [id, product, t, navigate, closeDeleteModal]);

  const handleToggleStatus = useCallback(async () => {
    if (!id || !product) return;
    const nextActive = !product.isActive;
    setToggling(true);
    try {
      const updated = await useProductStore
        .getState()
        .updateSafely({ id, version: product.version, patch: { isActive: nextActive } });
      logActivity(
        'product.toggleStatus',
        id,
        deepDiff({ isActive: product.isActive }, { isActive: nextActive }),
      );
      setProduct(updated);
      notifications.show({
        color: 'green',
        message: t(
          nextActive
            ? 'products.notifications.enableSuccess'
            : 'products.notifications.disableSuccess',
        ),
      });
      closeToggleModal();
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) setProduct(err.latest as Product);
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
          message: t('products.notifications.toggleError'),
        });
      }
    } finally {
      setToggling(false);
    }
  }, [id, product, t, closeToggleModal]);

  const handleImagesChange = useCallback(
    async (entries: PhotoEntry[]) => {
      if (!product) return;
      const urls = entries.filter((e) => !e.isDeleted).map((e) => e.url);
      const nextExtra: ProductExtra = {
        ...product.extra,
        images: urls.map((url) => ({ url })),
      };
      try {
        const updated = await useProductStore.getState().updateSafely({
          id: product.id,
          version: product.version,
          patch: { extra: nextExtra },
        });
        setProduct(updated);

        logActivity('product.updateImages', product.id);
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setProduct(err.latest as Product);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          throw err;
        }
      }
    },
    [product, t],
  );

  const patchProduct = useCallback(
    async (patch: Partial<Product>, auditVerb?: string) => {
      if (!product) return;
      try {
        const updated = await useProductStore.getState().updateSafely({
          id: product.id,
          version: product.version,
          patch,
        });
        setProduct(updated);

        if (auditVerb) {
          const before: Record<string, unknown> = {};
          for (const k of Object.keys(patch)) {
            before[k] = (product as unknown as Record<string, unknown>)[k];
          }
          logActivity(auditVerb, product.id, deepDiff(before, patch));
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setProduct(err.latest as Product);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
          return;
        }
        notifications.show({ color: 'red', message: t('products.notifications.updateError') });
        throw err;
      }
    },
    [product, t],
  );

  const patchExtra = useCallback(
    async (partial: Partial<ProductExtra>, auditVerb?: string) => {
      if (!product) return;
      await patchProduct({ extra: { ...product.extra, ...partial } }, auditVerb);
    },
    [product, patchProduct],
  );

  const handleToggleHiddenFromInventoryList = useCallback(
    async (next: boolean) => {
      await patchExtra(
        { hiddenFromInventoryList: next || undefined },
        'product.toggleInventoryVisibility',
      );
    },
    [patchExtra],
  );

  const employees = useEmployeeStore((s) => s.items);

  const inventoryItems = useProductInventoryStore((s) => s.items);
  const inventoryInitialized = useProductInventoryStore((s) => s.initialized);
  const loadInventory = useProductInventoryStore((s) => s.loadAll);

  useEffect(() => {
    if (!inventoryEnabled || inventoryInitialized) return;
    if (isMobile && activeTab !== 'inventory') return;
    loadInventory();
  }, [inventoryInitialized, loadInventory, activeTab]);

  const totalOnHand = useMemo(() => {
    if (!inventoryEnabled || !product) return 0;
    let sum = 0;
    for (const r of inventoryItems) {
      if (r.itemCode !== product.code || r.extra?.isDeleted) continue;
      sum += r.onHand;
    }
    return sum;
  }, [inventoryItems, product]);

  const isDeleteBlocked = inventoryEnabled && totalOnHand > 0;

  const productRowCount = useMemo(() => {
    if (!inventoryEnabled || !product) return 0;
    let n = 0;
    for (const r of inventoryItems) {
      if (r.itemCode === product.code && !r.extra?.isDeleted) n++;
    }
    return n;
  }, [inventoryItems, product]);
  const canShowEnterInventory =
    inventoryEnabled && canCreateInventory && (locationsEnabled || productRowCount === 0);
  const [enterInventoryOpened, { open: openEnterInventory, close: closeEnterInventory }] =
    useDisclosure(false);
  const handleEnterInventory = useCallback(() => {
    if (!canShowEnterInventory) return;

    if (isMobile) setActiveTab('inventory');
    openEnterInventory();
  }, [canShowEnterInventory, openEnterInventory]);

  const location = useLocation();
  const navigationState = location.state as {
    promptInventory?: boolean;

    backTo?: string;
  } | null;
  const backTo = navigationState?.backTo ?? ROUTES.PRODUCTS.LIST;
  const [inventoryPromptOpened, { open: openInventoryPrompt, close: closeInventoryPrompt }] =
    useDisclosure(false);
  useEffect(() => {
    if (navigationState?.promptInventory && canShowEnterInventory) {
      openInventoryPrompt();

      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [navigationState, canShowEnterInventory, openInventoryPrompt, navigate, location]);
  const handleInventoryPromptConfirm = useCallback(() => {
    closeInventoryPrompt();
    handleEnterInventory();
  }, [closeInventoryPrompt, handleEnterInventory]);

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);
  const extra: ProductExtra = product?.extra ?? {};
  const altNames = extra.alternativeNames ?? [];

  const altNamesLine =
    !isMobile && altNames.length > 0 ? (
      <Text size="sm" lh={1.35}>
        <Text span c="dimmed" fs="italic">
          {t('common.detail.alsoKnownAs')}
        </Text>{' '}
        {altNames.map((n, i) => (
          <Text span key={n}>
            {i > 0 && (
              <Text span c="dimmed">
                ,{' '}
              </Text>
            )}
            <Text span fw={600}>
              {n}
            </Text>
          </Text>
        ))}
      </Text>
    ) : null;

  useEffect(() => {
    if (!barcodeSvgRef.current) return;
    const raw = extra?.barcode?.trim() ?? '';
    if (!raw) return;
    try {
      JsBarcode(barcodeSvgRef.current, raw, {
        width: 2,
        height: 64,
        margin: 6,
        displayValue: true,
        font: 'var(--mantine-font-family-monospace)',
        fontSize: 13,
        textMargin: 4,
        background: 'transparent',
      });
    } catch {
      // invalid barcode — hide silently
    }
  }, [extra.barcode]);

  const barcodeClipboard = useClipboard({ timeout: 1500 });

  const me = useMyEmployee();

  if (loading) return null;
  if (!product) {
    return (
      <NotFoundState
        title={t('common.notFound.title')}
        message={t('common.notFound.message')}
        backTo={backTo}
        backLabel={t('common.notFound.backToList')}
      />
    );
  }

  const tags = extra.tags ?? [];
  const minInv = extra.minimumInventory;
  const allUnits =
    extra.units && extra.units.length > 0 ? extra.units : product.unit ? [product.unit] : [];
  const conversions = extra.unitConversions ?? [];

  const images: ProductImageEntry[] = imagesEnabled ? (extra.images ?? []) : [];

  const baseUnit = getItemBaseUnit(product);

  const lowThreshold = minInv?.value;
  const isLow = typeof lowThreshold === 'number' && totalOnHand > 0 && totalOnHand <= lowThreshold;
  const isBelowMin = typeof lowThreshold === 'number' && totalOnHand < lowThreshold;
  const stockColor = totalOnHand < 0 || isBelowMin ? 'red' : isLow ? 'orange' : undefined;

  const topActions = isMobile ? null : (
    <Group justify="space-between">
      <Button
        component={Link}
        to={backTo}
        variant="subtle"
        size="compact-sm"
        leftSection={<IconArrowLeft size={16} />}
      >
        {t('__new__.01-common.actions.back')}
      </Button>
      <Group gap="xs">
        {canShowEnterInventory && (
          <Button
            variant="default"
            size="compact-sm"
            leftSection={<IconBuildingWarehouse size={14} />}
            onClick={handleEnterInventory}
          >
            {t('__new__.07-entities.products.actions.enterInventory')}
          </Button>
        )}
        {canEdit && (
          <Button
            component={Link}
            to={ROUTES.PRODUCTS.EDIT.replace(':id', product.id)}
            variant="default"
            size="compact-sm"
            leftSection={<IconEdit size={14} />}
          >
            {t('__new__.01-common.actions.edit')}
          </Button>
        )}
      </Group>
    </Group>
  );

  const badgesRow = (
    <Group gap={6} wrap="wrap">
      <ActiveBadge
        isActive={product.isActive}
        activeLabel={t('products.detail.statusActive')}
        inactiveLabel={t('products.detail.statusInactive')}
        size="sm"
      />
      {extra.category && <CategoryBadge category={extra.category} />}
      {extra.noInventory && (
        <Badge variant="light" color="gray" size="sm" radius="sm" tt="none">
          {t('products.detail.noInventoryBadge')}
        </Badge>
      )}
      {tags.map((tag) => (
        <TagBadge key={tag} tag={tag} />
      ))}
    </Group>
  );

  const stockSummary =
    inventoryEnabled && inventoryInitialized ? (
      <Stack gap={0} align="flex-end" style={{ flexShrink: 0 }}>
        <FieldLabel>{t('products.detail.headerInventoryLabel')}</FieldLabel>
        <Group gap={4} wrap="nowrap" align="baseline">
          <Text size={isMobile ? 'lg' : '28px'} fw={800} c={stockColor} lh={1.1}>
            {formatNumber(totalOnHand)}
          </Text>
          <FieldLabel>{lookupLabelOf(unitLabels, baseUnit) || baseUnit}</FieldLabel>
        </Group>
        {isBelowMin && (
          <Text size="xs" c="red" fw={600} ta="right" lh={1.2}>
            {t('products.detail.belowMinimum')}
          </Text>
        )}
      </Stack>
    ) : null;

  const timestampsLine = isMobile ? null : (
    <TimestampLine updatedAt={product.updatedAt} createdAt={product.createdAt} />
  );

  const sku = extra.sku?.trim();
  const skuLine = !sku ? null : isMobile ? (
    <Group gap={4} wrap="nowrap">
      <CodeLabel code={sku} />
      <CopyValueButton value={sku} copiedMessage={t('products.notifications.skuCopied')} />
    </Group>
  ) : (
    <CodeLabel code={sku} />
  );

  const headerRow = isMobile ? (
    <Stack gap="sm">
      <Group gap="md" wrap="nowrap" align="flex-start">
        {imagesEnabled && <ProductThumb product={product} size={56} radius={12} />}
        <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
          <Title order={5} lh={1.2}>
            {product.name}
          </Title>
          {skuLine}
          {altNamesLine}
        </Stack>
        {stockSummary}
      </Group>
      {badgesRow}
      {timestampsLine}
    </Stack>
  ) : (
    <Group align="flex-start" justify="space-between" wrap="nowrap" gap="lg">
      <Group gap="md" wrap="nowrap" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
        {imagesEnabled && <ProductThumb product={product} size={72} radius={12} />}
        <Stack gap={6} style={{ minWidth: 0 }}>
          <Title order={3} lh={1.2}>
            {product.name}
          </Title>
          {skuLine}
          {altNamesLine}
          <Group gap={6} wrap="wrap" mt={2}>
            <ActiveBadge
              isActive={product.isActive}
              activeLabel={t('products.detail.statusActive')}
              inactiveLabel={t('products.detail.statusInactive')}
              size="sm"
            />
            {extra.category && <CategoryBadge category={extra.category} />}
            {extra.noInventory && (
              <Badge variant="light" color="gray" size="sm" radius="sm" tt="none">
                {t('products.detail.noInventoryBadge')}
              </Badge>
            )}
            {tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </Group>
        </Stack>
      </Group>
      <Stack gap="xs" align="flex-end" style={{ flexShrink: 0 }}>
        {stockSummary}
        {timestampsLine}
      </Stack>
    </Group>
  );

  const descriptionBody = descEdit.editing ? (
    <Textarea
      value={descEdit.draft ?? ''}
      onChange={(e) => descEdit.setDraft(e.currentTarget.value)}
      placeholder={t('products.form.descriptionPlaceholder')}
      minRows={3}
      autosize
      autoFocus
    />
  ) : (
    <DescriptionText text={product.description} entityLabel={t('common.labels.product')} />
  );

  const descriptionCard = (
    <SectionCard
      icon={<IconFileDescription size={14} />}
      title={t('common.labels.description')}
      editable={canEdit && !isMobile}
      editing={descEdit.editing}
      saving={descEdit.saving}
      labels={editLabels}
      onEdit={() => descEdit.begin(product.description ?? '')}
      onCancel={descEdit.cancel}
      onSave={() =>
        descEdit.save((next) => patchProduct({ description: next }, 'product.updateDescription'))
      }
    >
      {descriptionBody}
      {allUnits.length > 0 && (
        <>
          <Divider />
          <Stack gap={6}>
            <FieldLabel>{t('common.labels.units')}</FieldLabel>
            <Group gap={8} wrap="wrap" align="center">
              <Group gap={4} wrap="wrap">
                {allUnits.map((u, idx) => (
                  <UnitBadge key={u} base={idx === 0} unit={u} />
                ))}
              </Group>
              {conversions.length > 0 && (
                <Text size="sm" c="dimmed">
                  {conversions.map((c, i) => (
                    <Text span key={i}>
                      {i > 0 && ', '}1 {lookupLabelOf(unitLabels, c.unit)} ={' '}
                      {formatNumber(c.quantity)} {lookupLabelOf(unitLabels, c.baseUnit)}
                    </Text>
                  ))}
                </Text>
              )}
            </Group>
          </Stack>
        </>
      )}
      {canShowPrice && (
        <>
          <Divider />
          <Group gap={48} wrap="wrap">
            <Stack gap={2}>
              <FieldLabel>{t('__new__.07-entities.products.labels.basePriceLabel')}</FieldLabel>
              <Text size="sm" fw={600}>
                {formatNumber(product.extra.basePrice)}
              </Text>
            </Stack>
            <Stack gap={2}>
              <FieldLabel>{t('products.form.priceLabel')}</FieldLabel>
              <Text size="sm" fw={600}>
                {formatNumber(product.price)}
              </Text>
            </Stack>
            <Stack gap={2}>
              <FieldLabel>{t('products.detail.suggestedPriceLabel')}</FieldLabel>
              <Text size="sm" fw={600}>
                {formatNumber(extra.suggestedPrice)}
              </Text>
            </Stack>
          </Group>
        </>
      )}
    </SectionCard>
  );

  const storedSpecs: Array<{ key: string; value: string }> = Array.isArray(extra.techSpecs)
    ? extra.techSpecs
    : [];

  const updateSpecRow = (idx: number, patch: Partial<{ key: string; value: string }>) => {
    if (!specsEdit.draft) return;
    specsEdit.setDraft(specsEdit.draft.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeSpecRow = (idx: number) => {
    if (!specsEdit.draft) return;
    specsEdit.setDraft(specsEdit.draft.filter((_, i) => i !== idx));
  };

  const addSpecRow = () => {
    if (!specsEdit.draft) return;
    specsEdit.setDraft([...specsEdit.draft, { key: '', value: '' }]);
  };

  const techSpecsBody =
    specsEdit.editing && specsEdit.draft ? (
      <Stack gap={4}>
        {specsEdit.draft.map((row, idx) => (
          <Group key={idx} gap="xs" wrap="nowrap" align="flex-start">
            <TextInput
              placeholder={t('products.form.attributeKeyPlaceholder')}
              value={row.key}
              onChange={(e) => updateSpecRow(idx, { key: e.currentTarget.value })}
              style={{ flex: 1 }}
              autoFocus={idx === 0}
            />
            <TextInput
              placeholder={t('products.form.attributeValuePlaceholder')}
              value={row.value}
              onChange={(e) => updateSpecRow(idx, { value: e.currentTarget.value })}
              style={{ flex: 2 }}
            />
            <ActionIcon variant="subtle" color="red" size="lg" onClick={() => removeSpecRow(idx)}>
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        ))}
        <Button
          variant="default"
          size="compact-sm"
          leftSection={<IconPlus size={13} />}
          onClick={addSpecRow}
          style={{ alignSelf: 'flex-start' }}
        >
          {t('products.form.attributeAdd')}
        </Button>
      </Stack>
    ) : storedSpecs.length > 0 ? (
      <Stack gap={10}>
        {storedSpecs.map((s, idx) => (
          <Box key={idx}>
            {idx > 0 && <Divider variant="dashed" mb={10} />}
            <SpecRow label={s.key} value={s.value} />
          </Box>
        ))}
      </Stack>
    ) : (
      <Text size="sm" c="dimmed" fs="italic">
        {t('products.detail.techSpecsEmpty')}
      </Text>
    );

  const techSpecsCard = technicalSpecsEnabled ? (
    <SectionCard
      icon={<IconListDetails size={14} />}
      title={t('products.detail.techSpecCardTitle')}
      editable={canEdit && !isMobile}
      editing={specsEdit.editing}
      saving={specsEdit.saving}
      labels={editLabels}
      onEdit={() => specsEdit.begin(storedSpecs.map((s) => ({ key: s.key, value: s.value })))}
      onCancel={specsEdit.cancel}
      onSave={() =>
        specsEdit.save((next) => {
          const cleaned = next
            .map((s) => ({ key: s.key.trim(), value: s.value.trim() }))
            .filter((s) => s.key && s.value);
          return patchExtra(
            { techSpecs: cleaned.length > 0 ? cleaned : undefined },
            'product.updateTechSpecs',
          );
        })
      }
    >
      {techSpecsBody}
    </SectionCard>
  ) : null;

  const cDraft = classEdit.draft;
  const emptyDash = (
    <Text size="sm" c="dimmed" fs="italic">
      —
    </Text>
  );

  const categorySlot = (
    <Stack gap={6}>
      <FieldLabel>{t('common.labels.category')}</FieldLabel>
      {classEdit.editing && cDraft ? (
        <Select
          data={[...categoryOptions]}
          value={cDraft.category || null}
          onChange={(next) => classEdit.setDraft({ ...cDraft, category: next ?? '' })}
          placeholder={t('products.form.categoryPlaceholder')}
          searchable
          clearable
          autoFocus
        />
      ) : extra.category ? (
        <Box>
          <CategoryBadge category={extra.category} />
        </Box>
      ) : (
        emptyDash
      )}
    </Stack>
  );

  const tagsSlot = (
    <Stack gap={6}>
      <FieldLabel>{t('products.columnsExtra.tags')}</FieldLabel>
      {classEdit.editing && cDraft ? (
        <TagsInput
          data={tagOptions.map((o) => o.label)}
          value={cDraft.tags}
          onChange={(next) => classEdit.setDraft({ ...cDraft, tags: next })}
          placeholder={t('products.form.tagsPlaceholder')}
        />
      ) : tags.length > 0 ? (
        <Group gap={6} wrap="wrap">
          {tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </Group>
      ) : (
        <Text size="sm" c="dimmed" fs="italic">
          {t('products.detail.tagsEmpty')}
        </Text>
      )}
    </Stack>
  );

  const productAttributes = extra.attributes ?? [];

  const updateAttrRow = (idx: number, patch: Partial<{ key: string; value: string }>) => {
    if (!cDraft) return;
    classEdit.setDraft({
      ...cDraft,
      attributes: cDraft.attributes.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    });
  };

  const removeAttrRow = (idx: number) => {
    if (!cDraft) return;
    classEdit.setDraft({
      ...cDraft,
      attributes: cDraft.attributes.filter((_, i) => i !== idx),
    });
  };

  const addAttrRow = () => {
    if (!cDraft) return;
    classEdit.setDraft({
      ...cDraft,
      attributes: [...cDraft.attributes, { key: '', value: '' }],
    });
  };

  const attributesSlot = (
    <Stack gap={6}>
      <FieldLabel>{t('products.columnsExtra.attributes')}</FieldLabel>
      {classEdit.editing && cDraft ? (
        <Stack gap={4}>
          {cDraft.attributes.map((row, idx) => (
            <Group key={idx} gap="xs" wrap="nowrap" align="flex-start">
              <TextInput
                placeholder={t('products.form.attributeKeyPlaceholder')}
                value={row.key}
                onChange={(e) => updateAttrRow(idx, { key: e.currentTarget.value })}
                style={{ flex: 1 }}
              />
              <TextInput
                placeholder={t('products.form.attributeValuePlaceholder')}
                value={row.value}
                onChange={(e) => updateAttrRow(idx, { value: e.currentTarget.value })}
                style={{ flex: 2 }}
              />
              <ActionIcon variant="subtle" color="red" size="lg" onClick={() => removeAttrRow(idx)}>
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          ))}
          <Button
            variant="default"
            size="compact-sm"
            leftSection={<IconPlus size={13} />}
            onClick={addAttrRow}
            style={{ alignSelf: 'flex-start' }}
          >
            {t('products.form.attributeAdd')}
          </Button>
        </Stack>
      ) : productAttributes.length > 0 ? (
        <Stack gap={2}>
          {productAttributes.map((a, idx) => (
            <Group key={idx} gap="md" wrap="nowrap" align="baseline">
              <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                {a.key}
              </Text>
              <Text size="sm" fw={500} ta="right" style={{ flex: 2 }}>
                {a.value}
              </Text>
            </Group>
          ))}
        </Stack>
      ) : (
        <Text size="sm" c="dimmed" fs="italic">
          {t('products.detail.attributesEmpty')}
        </Text>
      )}
    </Stack>
  );

  const classificationCard = (
    <SectionCard
      icon={<IconCategory size={14} />}
      title={t('products.detail.attrCardTitle')}
      editable={canEdit && !isMobile}
      editing={classEdit.editing}
      saving={classEdit.saving}
      labels={editLabels}
      onEdit={() =>
        classEdit.begin({
          category: extra.category ?? '',
          tags: [...tags],
          attributes: productAttributes.map((a) => ({ key: a.key, value: a.value })),
        })
      }
      onCancel={classEdit.cancel}
      onSave={() =>
        classEdit.save((next) => {
          const cleaned = next.attributes
            .map((a) => ({ key: a.key.trim(), value: a.value.trim() }))
            .filter((a) => a.key && a.value);
          return patchExtra(
            {
              category: next.category || undefined,
              tags: next.tags,
              attributes: cleaned.length > 0 ? cleaned : undefined,
            },
            'product.updateClassification',
          );
        })
      }
    >
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {categorySlot}
        {tagsSlot}
      </SimpleGrid>
      <Divider />
      {attributesSlot}
    </SectionCard>
  );

  const barcodeSvg = (
    <Box
      style={{
        background: 'var(--mantine-color-white)',
        padding: 8,
        borderRadius: 'var(--mantine-radius-sm)',
        border: '1px solid var(--mantine-color-default-border)',
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        minWidth: 0,
      }}
    >
      <svg ref={barcodeSvgRef} />
    </Box>
  );

  const barcodeFormatLabel = (
    <Group gap={8} align="center" wrap="nowrap">
      <FieldLabel>{t('products.detail.barcodeFormat')}</FieldLabel>
      <Badge variant="default" size="sm" radius="sm" tt="none">
        CODE128
      </Badge>
    </Group>
  );

  const copyBarcodeButton = (
    <Button
      variant="default"
      size="compact-sm"
      leftSection={barcodeClipboard.copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
      onClick={() => extra.barcode && barcodeClipboard.copy(extra.barcode)}
    >
      {t('__new__.01-common.actions.copy')}
    </Button>
  );

  const barcodeControls = isMobile ? (
    <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
      {barcodeFormatLabel}
      {copyBarcodeButton}
    </Group>
  ) : (
    <Stack gap="xs" align="flex-end" style={{ flexShrink: 0, minWidth: 120 }}>
      {barcodeFormatLabel}
      {copyBarcodeButton}
    </Stack>
  );

  const setItems = extra.setItems ?? [];
  const setCompositionCard = isProductSet(product) ? (
    <SectionCard
      icon={<IconBoxMultiple size={14} />}
      title={t('products.detail.setCompositionTitle')}
      actions={<ProductSetBadge product={product} />}
    >
      <Stack gap="xs">
        {/* A breakdown set reads one way only, so the card says so outright —
            the row list alone is ambiguous about which direction it runs, and
            that direction is the whole difference between the two modes. */}
        {isBreakdownSet(product) && (
          <Text size="xs" c="dimmed">
            {t('products.detail.setCompositionBreakdownDesc')}
          </Text>
        )}
        {setItems.map((row, idx) => (
          <Group key={`${row.productCode}-${idx}`} gap="xs" wrap="nowrap" align="baseline">
            <Text size="sm" fw={600} ff="monospace" style={{ minWidth: 48 }}>
              {formatNumber(row.quantity)}
            </Text>
            <Text size="sm" c="dimmed">
              ×
            </Text>
            <Text size="sm" component="span" style={{ minWidth: 0 }}>
              <ProductLink code={row.productCode} />
            </Text>
            <Text size="sm" c="dimmed">
              ({lookupLabelOf(unitLabels, row.unit, row.unit)})
            </Text>
          </Group>
        ))}
      </Stack>
    </SectionCard>
  ) : null;

  const barcodeCard =
    barcodeEnabled && extra.barcode ? (
      <SectionCard icon={<IconBarcode size={14} />} title={t('common.labels.barcode')}>
        {isMobile ? (
          <Stack gap="sm">
            {barcodeSvg}
            {barcodeControls}
          </Stack>
        ) : (
          <Group align="flex-start" wrap="nowrap" gap="lg" justify="space-between">
            {barcodeSvg}
            {barcodeControls}
          </Group>
        )}
      </SectionCard>
    ) : null;

  const minInvUpdatedByEmp = minInv
    ? findEmployeeByLoginEmail(employees, minInv.updatedBy)
    : undefined;
  const minInventoryCard = minInv ? (
    <SectionCard
      icon={<IconPlus size={14} />}
      title={t('products.detail.minInventoryTitle')}
      padding="xs"
    >
      <Stack gap={4}>
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text size="28px" fw={800} lh={1}>
            {formatNumber(minInv.value)}
          </Text>
          <Text size="sm" c="dimmed">
            {lookupLabelOf(unitLabels, minInv.unit)}
          </Text>
        </Group>
        {minInvUpdatedByEmp?.code && (
          <Text size="xs" c="dimmed">
            <Trans
              i18nKey="products.detail.updatedByOn"
              values={{ date: formatDateTime(minInv.updatedAt) }}
              components={{
                user: minInvUpdatedByEmp?.code ? (
                  <EmployeeLink noAvatar code={minInvUpdatedByEmp.code} size="xs" />
                ) : (
                  <Text component="span" size="xs" fw={600}>
                    {minInv.updatedBy}
                  </Text>
                ),
              }}
            />
          </Text>
        )}
      </Stack>
    </SectionCard>
  ) : null;

  const currentInventoryCard = inventoryEnabled ? (
    <ProductInventorySection
      product={product}
      createOpened={enterInventoryOpened}
      onOpenCreate={openEnterInventory}
      onCloseCreate={closeEnterInventory}

      onToggleHiddenFromInventoryList={
        hideFromInventoryListEnabled && canEdit ? handleToggleHiddenFromInventoryList : undefined
      }
    />
  ) : null;

  const dangerZone =
    canEdit || canDelete ? (
      <Card
        withBorder
        radius="md"
        padding="lg"
        style={{
          borderColor: 'var(--mantine-color-red-3)',
          background: 'var(--mantine-color-red-0)',
        }}
      >
        <Stack gap="md">
          <Group gap={8}>
            <ThemeIcon size={20} radius="sm" variant="transparent" color="red">
              <IconAlertTriangle size={14} />
            </ThemeIcon>
            <FieldLabel c="red" fw={700} lts={0.5}>
              {t('__new__.01-common.dangerZone.title')}
            </FieldLabel>
          </Group>

          {canEdit && (
            <Group justify="space-between" wrap="nowrap" align="flex-start" gap="md">
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text fw={600} size="sm">
                  {product.isActive
                    ? t('__new__.07-entities.products.dangerZone.disableItem')
                    : t('__new__.07-entities.products.dangerZone.enableItem')}
                </Text>
                <Text size="xs" c="dimmed">
                  {product.isActive
                    ? t('__new__.07-entities.products.dangerZone.disableItemDesc')
                    : t('__new__.07-entities.products.dangerZone.enableItemDesc')}
                </Text>
              </Stack>
              <Tooltip
                label={
                  product.isActive
                    ? t('__new__.01-common.dangerZone.disableButton')
                    : t('__new__.01-common.dangerZone.enableButton')
                }
                withArrow
              >
                <ActionIcon
                  variant="default"
                  size="lg"
                  color={product.isActive ? 'orange' : 'green'}
                  onClick={openToggleModal}
                >
                  {product.isActive ? <IconBan size={16} /> : <IconCircleCheck size={16} />}
                </ActionIcon>
              </Tooltip>
            </Group>
          )}

          {canEdit && canDelete && <Divider variant="dashed" />}

          {canDelete && (
            <Group justify="space-between" wrap="nowrap" align="flex-start" gap="md">
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text fw={600} size="sm">
                  {t('__new__.07-entities.products.dangerZone.deleteItem')}
                </Text>
                <Text size="xs" c="dimmed">
                  {isDeleteBlocked
                    ? t('__new__.07-entities.products.dangerZone.deleteBlockedHasStock')
                    : t('__new__.07-entities.products.dangerZone.deleteItemDesc')}
                </Text>
              </Stack>
              <Tooltip
                label={
                  isDeleteBlocked
                    ? t('__new__.07-entities.products.dangerZone.deleteBlockedHasStock')
                    : t('__new__.01-common.actions.remove')
                }
                withArrow
              >
                <ActionIcon
                  variant="default"
                  size="lg"
                  onClick={openDeleteModal}
                  disabled={isDeleteBlocked}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
        </Stack>
      </Card>
    ) : null;

  const desktopDetailsContent = (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, md: 7 }}>
        <Stack gap="md">
          {descriptionCard}
          {setCompositionCard}
          {techSpecsCard}
          {classificationCard}
          {barcodeCard}
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Stack gap="md">
          {minInventoryCard}
          {currentInventoryCard}
          {dangerZone}
        </Stack>
      </Grid.Col>
    </Grid>
  );

  const mobileInventoryContent = (
    <Stack gap="md">
      {currentInventoryCard}
      {minInventoryCard}
    </Stack>
  );

  const mobileDetailsContent = (
    <Stack gap="md">
      {descriptionCard}
      {setCompositionCard}
      {techSpecsCard}
      {classificationCard}
      {barcodeCard}
    </Stack>
  );

  const imageEntries: PhotoEntry[] = images.map((img) => ({ url: img.url, timestamp: '' }));

  const uploadCard =
    canEdit && !isMobile ? (
      <Card withBorder radius="md" padding="md">
        <ImageUploadPanel
          section="upload"
          images={imageEntries}
          onChange={handleImagesChange}
          imageDirectory={buildUploadDirectory({ type: 'product', id: product.id })}
          buildFileName={buildUploadFileName}
          marker={product.name || product.code}
          currentUserId={me?.id}
          currentUserName={me?.name}
        />
      </Card>
    ) : null;

  const galleryCard = (
    <Card withBorder radius="md" padding={isMobile ? 'md' : 'lg'}>
      {canEdit ? (
        <ImageUploadPanel
          section="grid"
          images={imageEntries}
          onChange={handleImagesChange}
          imageDirectory={buildUploadDirectory({ type: 'product', id: product.id })}
          buildFileName={buildUploadFileName}
          marker={product.name || product.code}
          currentUserId={me?.id}
          currentUserName={me?.name}
        />
      ) : images.length === 0 ? (
        <Stack align="center" gap="sm" py="xl">
          <ThemeIcon size={56} radius="xl" variant="light" color="gray">
            <IconPhoto size={28} stroke={1.5} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            {t('products.detail.imagesEmpty')}
          </Text>
          <Text size="xs" c="dimmed" ta="center" maw={320}>
            {t('products.detail.imagesEmptyDesc')}
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
                alt={`${product.name} ${i + 1}`}
                fit="cover"
                h="100%"
                w="100%"
                fallbackSrc="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'><rect width='60' height='60' fill='%23eee'/></svg>"
              />
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Card>
  );

  const imagesContent = (
    <Stack gap="md">
      {uploadCard}
      {galleryCard}
    </Stack>
  );

  return (
    <>
      <Stack gap="lg">
        {topActions}
        {headerRow}
        <Divider />
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="details" leftSection={<IconListDetails size={16} />}>
              {t('products.detail.tab.details')}
            </Tabs.Tab>
            {isMobile && (
              <Tabs.Tab value="inventory" leftSection={<IconBuildingWarehouse size={16} />}>
                {t('common.labels.inventory')}
              </Tabs.Tab>
            )}
            {imagesEnabled && (
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
                {t('products.detail.tab.images')}
              </Tabs.Tab>
            )}
            {salesTabVisible && (
              <Tabs.Tab value="sales" leftSection={<IconChartBar size={16} />}>
                {t('report.entityTab.title')}
              </Tabs.Tab>
            )}
            {activityTabVisible && (
              <Tabs.Tab value="activity" leftSection={<IconHistory size={16} />}>
                {t('products.detail.tab.activity')}
              </Tabs.Tab>
            )}
          </Tabs.List>

          {isMobile && (
            <Tabs.Panel value="inventory" pt="md">
              {mobileInventoryContent}
            </Tabs.Panel>
          )}
          <Tabs.Panel value="details" pt="md">
            {isMobile ? mobileDetailsContent : desktopDetailsContent}
          </Tabs.Panel>
          {imagesEnabled && (
            <Tabs.Panel value="images" pt="md">
              {imagesContent}
            </Tabs.Panel>
          )}
          {salesTabVisible && (
            <Tabs.Panel value="sales" pt="md">
              {/* Lazy-mount: only load the report chunk + store when selected. */}
              {activeTab === 'sales' && (
                <EntitySalesPanel
                  target={{ kind: 'product', code: product.code, name: product.name }}
                />
              )}
            </Tabs.Panel>
          )}
          {activityTabVisible && (
            <Tabs.Panel value="activity" pt="md">
              {/* Lazy-mount: only fetch when this tab is selected. */}
              {activeTab === 'activity' && (
                <ActivityByTargetPanel targetId={product.id} i18nNamespace="products.detail" />
              )}
            </Tabs.Panel>
          )}
        </Tabs>
      </Stack>

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title={t('products.deleteConfirm.title')}
        message={t('products.deleteConfirm.message')}
        loading={deleting}
      />
      <ConfirmModal
        opened={toggleModalOpened}
        onClose={closeToggleModal}
        onConfirm={handleToggleStatus}
        title={
          product.isActive
            ? t('__new__.07-entities.products.dangerZone.disableItem')
            : t('__new__.07-entities.products.dangerZone.enableItem')
        }
        message={
          product.isActive
            ? t('__new__.07-entities.products.dangerZone.disableConfirm')
            : t('__new__.07-entities.products.dangerZone.enableConfirm')
        }
        confirmLabel={
          product.isActive
            ? t('__new__.01-common.dangerZone.disableButton')
            : t('__new__.01-common.dangerZone.enableButton')
        }
        confirmColor={product.isActive ? 'orange' : 'green'}
        loading={toggling}
      />
      <ConfirmModal
        opened={inventoryPromptOpened}
        onClose={closeInventoryPrompt}
        onConfirm={handleInventoryPromptConfirm}
        title={t('products.inventoryPrompt.title')}
        message={t('products.inventoryPrompt.message')}
        confirmLabel={t('products.inventoryPrompt.confirm')}
        confirmColor="teal"
      />
      <ImageZoomModal
        opened={!!zoomUrl}
        onClose={() => setZoomUrl(null)}
        imageUrl={zoomUrl ?? ''}
      />
    </>
  );
}
