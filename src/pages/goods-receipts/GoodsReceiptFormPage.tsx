import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  FileButton,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { DateField } from '@/components/DateField';
import { isoToVnDateString, todayInVnDateString, vnDateStringToIso } from '@/utils/dateTimeField';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconCopy,
  IconDownload,
  IconPlus,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useGoodsReceiptStore } from '@/stores/useGoodsReceiptStore';
import { useVendorStore } from '@/stores/useVendorStore';
import { useLocationStore } from '@/stores/useLocationStore';
import { useProductStore } from '@/stores/useProductStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { device, logger } from '@credo/base-ui/utils';
import { getCurrentActorId, lookupLabelOf, useInitFormFromFetch, useLookupLabels } from '@/hooks';
import {
  allowsNoInventoryProductsForGoodsReceipts,
  getGoodsReceiptPicDepartments,
  isLocationsEnabled,
  isProductsEnabled,
  makeEmployeeDepartmentFilter,
} from '@/utils/permission';
import { logActivity } from '@/utils/activityLogger';
import { syncDraftIncomingToInventory } from '@/utils/goodsReceiptInventory';
import { isNoInventoryProduct } from '@/utils/productSet';
import { diffItems, diffVendor, toMemoItem, vendorMemo } from './activityMemo';
import { EmployeeSelector, ProductSelector, VendorSelector } from '@/components/selectors';
import {
  ExcelParseError,
  generateGoodsReceiptItemsTemplate,
  parseGoodsReceiptItemsExcelFile,
} from '@/utils/excelParser';
import { DEFAULT_LOCATION_CODE } from '@/types';
import type {
  GoodsReceipt,
  GoodsReceiptCopyFrom,
  GoodsReceiptExtra,
  GoodsReceiptItem,
  GoodsReceiptItemType,
  Product,
} from '@/types';
import { buildDailySequentialCode, businessDateString } from '@/utils/code';
import { appConfig } from '@/config';
import { findEmployeeByLoginEmail } from '@/utils/loginEmail';

const isMobile = device.isMobile;
const locationsEnabled = isLocationsEnabled();
const productsEnabled = isProductsEnabled();
const picEmployeeFilter = makeEmployeeDepartmentFilter(getGoodsReceiptPicDepartments());
const goodsReceiptCodePrefix = appConfig.features.goodsReceipts.codePrefix;

const itemTypeColumnVisible = productsEnabled;
const defaultItemType: GoodsReceiptItemType = 'product';

const allowNoInventoryProducts = allowsNoInventoryProductsForGoodsReceipts();
const isReceivableProduct = (p: Product) =>
  !p.extra?.isDeleted && (allowNoInventoryProducts || !isNoInventoryProduct(p));

type ItemFormValues = {
  itemType: GoodsReceiptItemType;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  note: string;
};

type FormValues = {
  receiptNumber: string;
  vendorCode: string;
  vendorName: string;
  locationCode: string;
  locationName: string;
  
  receivedDate: string | null;
  reference: string;
  notes: string;
  
  assignedTo: string;
  items: ItemFormValues[];
};

const emptyItem: ItemFormValues = {
  itemType: defaultItemType,
  itemCode: '',
  itemName: '',
  quantity: 1,
  unit: '',
  note: '',
};

function isEmptyRow(row: ItemFormValues): boolean {
  return (
    !row.itemCode &&
    !row.itemName &&
    !row.note &&
    row.quantity === emptyItem.quantity &&
    row.unit === emptyItem.unit &&
    row.itemType === emptyItem.itemType
  );
}

export function GoodsReceiptFormPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  
  
  
  
  
  
  
  useEffect(() => {
    if (!isMobile) return;
    notifications.show({
      color: 'yellow',
      message: t('goodsReceipts.notifications.mobileFormBlocked'),
      autoClose: 4000,
    });
    navigate(
      isEdit && id ? ROUTES.GOODS_RECEIPTS.DETAIL.replace(':id', id) : ROUTES.GOODS_RECEIPTS.LIST,
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  
  
  const copyFrom = !isEdit
    ? (location.state as { copyFrom?: GoodsReceiptCopyFrom } | null)?.copyFrom
    : undefined;
  const invalidateCache = useGoodsReceiptStore((s) => s.invalidate);
  const snapshotRef = useRef<GoodsReceipt | null>(null);

  const [loading, setLoading] = useState(false);

  
  
  
  const unitLabels = useLookupLabels('unit');

  
  
  
  
  
  
  
  
  
  const {
    items: locations,
    initialized: locationsInitialized,
    loadAll: loadLocations,
  } = useLocationStore();
  const {
    items: products,
    initialized: productsInitialized,
    loadAll: loadProducts,
  } = useProductStore();
  const vendorsInitialized = useVendorStore((s) => s.initialized);
  const loadVendors = useVendorStore((s) => s.loadAll);
  const employees = useEmployeeStore((s) => s.items);

  useEffect(() => {
    
    
    if (isMobile) return;
    if (!vendorsInitialized) loadVendors();
    
    
    
    if (!locationsInitialized) loadLocations();
    if (!productsInitialized) loadProducts();
  }, [
    vendorsInitialized,
    locationsInitialized,
    productsInitialized,
    loadVendors,
    loadLocations,
    loadProducts,
  ]);

  
  
  
  const { user } = useAuthStore();
  const currentEmployeeId = useMemo(() => {
    if (!user.email) return '';
    return findEmployeeByLoginEmail(employees, user.email)?.id ?? '';
  }, [user.email, employees]);

  const locationSelectData = useMemo(
    () => locations.map((l) => ({ value: l.code, label: `${l.code} — ${l.name}`, name: l.name })),
    [locations],
  );
  const locationMap = useMemo(() => {
    const m = new Map<string, (typeof locationSelectData)[number]>();
    for (const l of locationSelectData) m.set(l.value, l);
    return m;
  }, [locationSelectData]);

  
  
  
  
  const productUnitsByCode = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of products) {
      m.set(p.code, p.extra?.units?.length ? p.extra.units : p.unit ? [p.unit] : []);
    }
    return m;
  }, [products]);

  const form = useForm<FormValues>({
    initialValues: {
      
      
      receiptNumber: '',
      vendorCode: '',
      vendorName: '',
      
      
      
      
      locationCode: locationsEnabled ? '' : DEFAULT_LOCATION_CODE,
      locationName: '',
      receivedDate: todayInVnDateString(),
      reference: '',
      notes: '',
      
      
      assignedTo: currentEmployeeId,
      items: [{ ...emptyItem }],
    },
    validate: {
      vendorCode: (v) => (!v ? t('goodsReceipts.validation.vendorRequired') : null),
      ...(locationsEnabled && {
        locationCode: (v: string) => (!v ? t('goodsReceipts.validation.locationRequired') : null),
      }),
      receivedDate: (v) => (!v ? t('goodsReceipts.validation.receivedDateRequired') : null),
      items: {
        
        
        
        
        
        itemCode: (v, vals, path) => {
          const m = path.match(/^items\.(\d+)\./);
          if (!m) return null;
          const idx = Number(m[1]);
          const row = vals.items[idx];
          if (!row || isEmptyRow(row)) return null;
          const code = v.trim();
          if (!code) return null;
          const unit = row.unit.trim();
          const dup = vals.items.some(
            (other, i) =>
              i !== idx &&
              !isEmptyRow(other) &&
              other.itemCode.trim() === code &&
              other.unit.trim() === unit,
          );
          return dup ? t('goodsReceipts.validation.itemCodeUnitDuplicate') : null;
        },
      },
    },
  });

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (id) => {
      const res = await cMngtConnector.getGoodsReceiptById({ id });
      const r = res.goodsReceipt as GoodsReceipt;
      snapshotRef.current = r;
      if (r.status !== 'draft') {
        navigate(ROUTES.GOODS_RECEIPTS.DETAIL.replace(':id', id), { replace: true });
        return null;
      }
      return {
        receiptNumber: r.receiptNumber,
        vendorCode: r.vendorCode,
        vendorName: r.vendorName,
        locationCode: r.locationCode,
        locationName: r.locationName,
        receivedDate: isoToVnDateString(r.receivedDate),
        reference: r.reference || '',
        notes: r.notes || '',
        
        
        
        assignedTo: r.extra?.assignedTo ?? '',
        items: r.items.map((item) => ({
          itemType: item.itemType,
          itemCode: item.itemCode,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          note: item.note ?? '',
        })),
      };
    },
    () => {
      notifications.show({
        color: 'red',
        message: t('goodsReceipts.notifications.fetchError'),
      });
      navigate(ROUTES.GOODS_RECEIPTS.LIST);
    },
  );

  
  
  
  useEffect(() => {
    if (isEdit) return;
    if (!currentEmployeeId) return;
    if (form.getValues().assignedTo) return;
    form.setFieldValue('assignedTo', currentEmployeeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmployeeId, isEdit]);

  
  
  
  
  useEffect(() => {
    if (!copyFrom) return;
    form.setValues({
      receiptNumber: '', 
      vendorCode: copyFrom.vendorCode,
      vendorName: copyFrom.vendorName,
      locationCode: copyFrom.locationCode,
      locationName: copyFrom.locationName,
      receivedDate: todayInVnDateString(),
      reference: copyFrom.reference,
      notes: copyFrom.notes,
      assignedTo: copyFrom.assignedTo ?? currentEmployeeId,
      items:
        copyFrom.items.length > 0
          ? copyFrom.items.map((item) => ({
              itemType: item.itemType,
              itemCode: item.itemCode,
              itemName: item.itemName,
              quantity: item.quantity,
              unit: item.unit,
              note: item.note ?? '',
            }))
          : [{ ...emptyItem }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyFrom]);

  const handleLocationSelect = useCallback(
    (code: string | null) => {
      form.setFieldValue('locationCode', code ?? '');
      form.setFieldValue('locationName', code ? (locationMap.get(code)?.name ?? '') : '');
    },
    
    [locationMap],
  );

  
  
  
  
  
  
  
  const handleDownloadTemplate = useCallback(() => {
    const sampleItems: Array<{ sku: string; unit: string; name: string }> = [];
    const pickFrom = (
      list: ReadonlyArray<{
        name: string;
        unit: string;
        extra?: { sku?: string; units?: string[] };
      }>,
    ) => {
      for (const it of list) {
        if (sampleItems.length >= 3) return;
        const sku = it.extra?.sku?.trim();
        if (!sku) continue;
        const unit = it.extra?.units?.[0] || it.unit || '';
        sampleItems.push({ sku, unit, name: it.name });
      }
    };
    if (productsEnabled) pickFrom(products);
    generateGoodsReceiptItemsTemplate({ language: i18n.language, sampleItems });
  }, [products, i18n.language]);

  
  
  
  
  
  const handleImportItems = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        const rows = await parseGoodsReceiptItemsExcelFile(file);
        if (rows.length === 0) {
          notifications.show({
            color: 'yellow',
            message: t('goodsReceipts.notifications.importEmpty'),
          });
          return;
        }

        
        
        
        
        type SkuHit = {
          itemType: GoodsReceiptItemType;
          code: string;
          name: string;
          units: string[];
        };
        const skuMap = new Map<string, SkuHit>();
        for (const p of products) {
          if (!isReceivableProduct(p)) continue; 
          const sku = p.extra?.sku?.trim();
          if (!sku) continue;
          skuMap.set(sku.toLowerCase(), {
            itemType: 'product',
            code: p.code,
            name: p.name,
            units: p.extra?.units?.length ? p.extra.units : p.unit ? [p.unit] : [],
          });
        }

        const matched: ItemFormValues[] = [];
        const unmatched: string[] = [];
        for (const row of rows) {
          const hit = skuMap.get(row.sku.toLowerCase());
          if (!hit) {
            unmatched.push(row.sku);
            continue;
          }
          
          
          
          
          const typedUnit = row.unit?.toLowerCase();
          const unit =
            (typedUnit && hit.units.find((u) => u.toLowerCase() === typedUnit)) ??
            hit.units[0] ??
            '';
          matched.push({
            itemType: hit.itemType,
            itemCode: hit.code,
            itemName: hit.name,
            quantity: row.quantity,
            unit,
            note: row.memo ?? '',
          });
        }

        if (matched.length === 0) {
          notifications.show({
            color: 'red',
            title: t('goodsReceipts.notifications.importNoMatchTitle'),
            message: t('goodsReceipts.notifications.importUnmatched', {
              count: unmatched.length,
              skus: unmatched.join(', '),
            }),
            autoClose: 8000,
          });
          return;
        }

        
        
        
        
        const current = form.getValues().items;
        const allEmpty = current.every(isEmptyRow);
        form.setFieldValue('items', allEmpty ? matched : [...current, ...matched]);

        if (unmatched.length > 0) {
          notifications.show({
            color: 'yellow',
            title: t('goodsReceipts.notifications.importPartialTitle', { added: matched.length }),
            message: t('goodsReceipts.notifications.importUnmatched', {
              count: unmatched.length,
              skus: unmatched.join(', '),
            }),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'green',
            message: t('goodsReceipts.notifications.importSuccess', { count: matched.length }),
          });
        }
      } catch (err) {
        if (err instanceof ExcelParseError) {
          notifications.show({
            color: 'red',
            title: t('goodsReceipts.notifications.importMissingColumnTitle'),
            message: t('goodsReceipts.notifications.importMissingColumn', {
              columns: err.missing.join(', '),
            }),
            autoClose: 8000,
          });
        } else {
          logger.error('Excel import failed:', err);
          notifications.show({
            color: 'red',
            message: t('goodsReceipts.notifications.importError'),
          });
        }
      }
    },
    
    [products, t],
  );

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      if (values.items.length === 0) {
        notifications.show({
          color: 'red',
          message: t('goodsReceipts.validation.itemsRequired'),
        });
        return;
      }
      
      
      
      
      let locationCode = values.locationCode.trim();
      let locationName = values.locationName.trim();
      if (!locationsEnabled) {
        const defaultRow = locations.find((l) => l.code === DEFAULT_LOCATION_CODE);
        if (!defaultRow) {
          notifications.show({
            color: 'red',
            message: t('goodsReceipts.notifications.defaultLocationMissing'),
          });
          return;
        }
        locationCode = DEFAULT_LOCATION_CODE;
        locationName = defaultRow.name;
      }

      setLoading(true);
      const items: GoodsReceiptItem[] = values.items.map((item) => ({
        itemType: item.itemType,
        itemCode: item.itemCode.trim(),
        itemName: item.itemName.trim(),
        quantity: item.quantity,
        unit: item.unit.trim(),
        ...(item.note.trim() ? { note: item.note.trim() } : {}),
      }));

      
      
      
      
      
      const actor = getCurrentActorId();

      try {
        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Goods receipt snapshot missing');
          const nextExtra: GoodsReceiptExtra = {
            ...snapshot.extra,
            createdBy: snapshot.extra?.createdBy ?? actor,
            lastUpdatedBy: actor,
            
            
            
            assignedTo: values.assignedTo.trim() || undefined,
          };
          const updated = await useGoodsReceiptStore.getState().updateSafely({
            id,
            version: snapshot.version,
            patch: {
              vendorCode: values.vendorCode.trim(),
              vendorName: values.vendorName.trim(),
              locationCode,
              locationName,
              receivedDate: vnDateStringToIso(values.receivedDate),
              reference: values.reference.trim(),
              notes: values.notes.trim(),
              items,
              extra: nextExtra,
            },
          });
          
          
          
          
          
          
          
          const incomingEffect = await syncDraftIncomingToInventory(snapshot, updated);
          if (incomingEffect.failed > 0) {
            notifications.show({
              color: 'yellow',
              title: t('goodsReceipts.notifications.inventoryPartial'),
              message: t('goodsReceipts.notifications.inventoryPartialBody', {
                failed: incomingEffect.failed,
                attempted: incomingEffect.attempted,
              }),
              autoClose: 8000,
            });
          }
          
          
          
          
          const itemDiff = diffItems(snapshot.items, items);
          const vendorDiff = diffVendor(snapshot, updated);
          snapshotRef.current = updated;
          logActivity('goodsReceipt.update', id, {
            receiptNumber: updated.receiptNumber,
            ...vendorMemo(updated),
            lineCount: items.length,
            itemDiff,
            ...(vendorDiff && { vendorDiff }),
          });
          notifications.show({
            color: 'green',
            message: t('goodsReceipts.notifications.updateSuccess'),
          });
          navigate(ROUTES.GOODS_RECEIPTS.DETAIL.replace(':id', id));
        } else {
          const newExtra: GoodsReceiptExtra = {
            createdBy: actor,
            lastUpdatedBy: actor,
            
            
            assignedTo: values.assignedTo.trim() || undefined,
            
            
            
            ...(copyFrom ? { copyFromId: copyFrom.sourceId } : {}),
          };
          
          
          
          
          const today = businessDateString();
          const todaysReceipts = await cMngtConnector.queryGoodsReceipts<GoodsReceiptExtra>({
            fromPeriod: today,
            toPeriod: today,
          });
          const receiptNumber = buildDailySequentialCode(
            goodsReceiptCodePrefix,
            todaysReceipts.goodsReceipts.map((r) => r.receiptNumber),
          );

          const res = await cMngtConnector.createGoodsReceipt<GoodsReceiptExtra>({
            receiptNumber,
            vendorCode: values.vendorCode.trim(),
            vendorName: values.vendorName.trim(),
            locationCode,
            locationName,
            receivedDate: vnDateStringToIso(values.receivedDate),
            reference: values.reference.trim(),
            notes: values.notes.trim(),
            items,
            extra: newExtra,
          });
          invalidateCache();
          
          
          
          
          const incomingEffect = await syncDraftIncomingToInventory(null, res.goodsReceipt);
          if (incomingEffect.failed > 0) {
            notifications.show({
              color: 'yellow',
              title: t('goodsReceipts.notifications.inventoryPartial'),
              message: t('goodsReceipts.notifications.inventoryPartialBody', {
                failed: incomingEffect.failed,
                attempted: incomingEffect.attempted,
              }),
              autoClose: 8000,
            });
          }
          
          
          logActivity('goodsReceipt.create', res.goodsReceipt.id, {
            receiptNumber: res.goodsReceipt.receiptNumber,
            ...vendorMemo(res.goodsReceipt),
            lineCount: items.length,
            items: items.map(toMemoItem),
          });
          notifications.show({
            color: 'green',
            message: t('goodsReceipts.notifications.createSuccess'),
          });
          navigate(ROUTES.GOODS_RECEIPTS.DETAIL.replace(':id', res.goodsReceipt.id));
        }
      } catch (err) {
        logger.error('Caught error in handleSubmit:', err);
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as GoodsReceipt;
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
              ? t('goodsReceipts.notifications.updateError')
              : t('goodsReceipts.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, locations, t, navigate, invalidateCache, copyFrom],
  );

  if (fetching) return null;
  
  
  if (isMobile) return null;

  const pageTitle = isEdit ? t('goodsReceipts.editItem') : t('goodsReceipts.addItem');

  return (
    <Stack gap="lg">
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

      <Title order={3}>{pageTitle}</Title>

      {copyFrom && (
        <Alert icon={<IconCopy size={16} />} color="blue" variant="light" radius="md" py="xs">
          {t('goodsReceipts.form.copyingFrom', {
            receiptNumber: copyFrom.sourceReceiptNumber,
          })}
        </Alert>
      )}

      <Card withBorder radius="md" p="xl">
        <form
          onSubmit={
            
            form.onSubmit(handleSubmit, () => {
              notifications.show({
                color: 'red',
                message: t('common.validation.formInvalid'),
              });
            })
          }
        >
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label={t('goodsReceipts.form.receiptNumberLabel')}
                placeholder={t('goodsReceipts.form.receiptNumberAutoPlaceholder')}
                disabled
                {...form.getInputProps('receiptNumber')}
              />
              <DateField
                futureOnly
                label={t('goodsReceipts.form.receivedDateLabel')}
                clearable={false}
                withAsterisk
                {...form.getInputProps('receivedDate')}
              />
              <VendorSelector
                label={t('common.labels.vendor')}
                placeholder={t('goodsReceipts.form.vendorPlaceholder')}
                withAsterisk
                value={form.getValues().vendorCode || null}
                onChange={(v) => {
                  form.setFieldValue('vendorCode', v?.code ?? '');
                  form.setFieldValue('vendorName', v?.name ?? '');
                }}
                error={form.errors.vendorCode}
              />
              {locationsEnabled && (
                <Select
                  label={t('goodsReceipts.form.locationLabel')}
                  placeholder={t('goodsReceipts.form.locationPlaceholder')}
                  data={locationSelectData}
                  searchable
                  withAsterisk
                  value={form.getValues().locationCode || null}
                  onChange={handleLocationSelect}
                  error={form.errors.locationCode}
                />
              )}
              <TextInput
                label={t('goodsReceipts.form.referenceLabel')}
                placeholder={t('goodsReceipts.form.referencePlaceholder')}
                {...form.getInputProps('reference')}
              />
              <EmployeeSelector
                label={t('common.labels.assignedTo')}
                placeholder={t('goodsReceipts.form.assignedToPlaceholder')}
                clearable
                filter={picEmployeeFilter}
                value={form.getValues().assignedTo || null}
                onChange={(v) => form.setFieldValue('assignedTo', v?.id ?? '')}
              />
            </SimpleGrid>

            <Textarea
              label={t('__new__.01-common.labels.note')}
              placeholder={t('goodsReceipts.form.notesPlaceholder')}
              autosize
              minRows={2}
              {...form.getInputProps('notes')}
            />

            <Stack gap="xs">
              <Group justify="space-between" align="center" wrap="wrap">
                <Title order={6}>{t('goodsReceipts.form.itemsTitle')}</Title>
                <Group gap="xs" wrap="wrap">
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    leftSection={<IconDownload size={14} />}
                    onClick={handleDownloadTemplate}
                  >
                    {t('goodsReceipts.form.downloadTemplateButton')}
                  </Button>
                  <FileButton onChange={handleImportItems} accept=".xlsx,.xls,.csv">
                    {(props) => (
                      <Button
                        {...props}
                        variant="light"
                        size="compact-sm"
                        leftSection={<IconUpload size={14} />}
                      >
                        {t('goodsReceipts.form.importItemsButton')}
                      </Button>
                    )}
                  </FileButton>
                  <Button
                    variant="light"
                    size="compact-sm"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => form.insertListItem('items', { ...emptyItem })}
                  >
                    {t('__new__.01-common.actions.addEntry')}
                  </Button>
                </Group>
              </Group>

              <Box style={{ overflowX: 'auto' }}>
                <Table withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={40}>#</Table.Th>
                      {itemTypeColumnVisible && (
                        <Table.Th w={130}>{t('common.labels.type')}</Table.Th>
                      )}
                      <Table.Th>{t('common.labels.name')}</Table.Th>
                      <Table.Th w={120}>{t('common.labels.quantity')}</Table.Th>
                      <Table.Th w={120}>{t('common.labels.unit')}</Table.Th>
                      <Table.Th>{t('__new__.01-common.labels.note')}</Table.Th>
                      <Table.Th w={48} />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {form.getValues().items.map((row, idx) => {
                      
                      
                      
                      
                      
                      
                      
                      const itemUnits = row.itemCode
                        ? (productUnitsByCode.get(row.itemCode) ?? [])
                        : [];
                      const unitCodes = Array.from(
                        new Set([...itemUnits, ...(row.unit ? [row.unit] : [])]),
                      );
                      const unitOptions = unitCodes.map((u) => ({
                        value: u,
                        label: lookupLabelOf(unitLabels, u),
                      }));
                      return (
                        <Table.Tr key={idx}>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {idx + 1}
                            </Text>
                          </Table.Td>
                          {itemTypeColumnVisible && (
                            <Table.Td>
                              <Select
                                size="xs"
                                data={[
                                  { value: 'product', label: t('common.labels.product') },
                                  {
                                    value: 'material',
                                    label: t('goodsReceipts.itemTypes.material'),
                                  },
                                ]}
                                value={row.itemType}
                                onChange={(v) => {
                                  form.setFieldValue(
                                    `items.${idx}.itemType`,
                                    (v as GoodsReceiptItemType) ?? defaultItemType,
                                  );
                                  form.setFieldValue(`items.${idx}.itemCode`, '');
                                  form.setFieldValue(`items.${idx}.itemName`, '');
                                }}
                              />
                            </Table.Td>
                          )}
                          <Table.Td>
                            {row.itemType === 'product' ? (
                              <ProductSelector
                                size="xs"
                                placeholder={t('common.labels.name')}
                                code={row.itemCode || null}
                                name={row.itemName || null}
                                filter={isReceivableProduct}
                                error={form.errors[`items.${idx}.itemCode`]}
                                onChange={(opt) => {
                                  if (!opt) {
                                    form.setFieldValue(`items.${idx}.itemCode`, '');
                                    form.setFieldValue(`items.${idx}.itemName`, '');
                                    return;
                                  }
                                  form.setFieldValue(`items.${idx}.itemCode`, opt.code);
                                  form.setFieldValue(`items.${idx}.itemName`, opt.name);
                                  form.setFieldValue(`items.${idx}.unit`, opt.units[0] ?? '');
                                }}
                              />
                            ) : null}
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              size="xs"
                              min={0}
                              value={row.quantity}
                              onChange={(v) =>
                                form.setFieldValue(`items.${idx}.quantity`, Number(v) || 0)
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <Select
                              size="xs"
                              placeholder={t('common.labels.unit')}
                              data={unitOptions}
                              value={row.unit || null}
                              onChange={(v) => form.setFieldValue(`items.${idx}.unit`, v ?? '')}
                              disabled={unitOptions.length === 0}
                              allowDeselect={false}
                            />
                          </Table.Td>
                          <Table.Td>
                            <TextInput
                              size="xs"
                              placeholder={t('__new__.01-common.labels.note')}
                              {...form.getInputProps(`items.${idx}.note`)}
                            />
                          </Table.Td>
                          <Table.Td>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => form.removeListItem('items', idx)}
                              disabled={form.getValues().items.length <= 1}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Box>
            </Stack>

            <Group justify="flex-end" gap="sm" mt="md">
              <Button
                variant="default"
                size="sm"
                disabled={loading}
                onClick={() => navigate(ROUTES.GOODS_RECEIPTS.LIST)}
              >
                {t('__new__.01-common.actions.cancel')}
              </Button>
              <Button type="submit" loading={loading} size="sm">
                {isEdit
                  ? t('goodsReceipts.form.updateButton')
                  : t('goodsReceipts.form.createButton')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
