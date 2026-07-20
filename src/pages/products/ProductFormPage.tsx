import { Button, Divider, Group, Stack, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconFileSpreadsheet, IconPackage } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { appConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { useAuthStore } from '@/stores/useAuthStore';
import { useProductStore } from '@/stores/useProductStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { isListVersionConflict, readListHash } from '@/utils/listVersionConflict';
import { device } from '@credo/base-ui/utils';
import { Tabs } from '@credo/base-ui/components';
import { useInitFormFromFetch, useLookupOptions } from '@/hooks';
import { generateInternalBarcode } from '@/utils/barcode';
import {
  hasBarcodeForProducts,
  hasBulkImportForProducts,
  isPriceManagementEnabled,
  perms,
} from '@/utils/permission';
import { logActivity } from '@/utils/activityLogger';
import { deepDiff } from '@/utils/deepDiff';
import {
  ExcelParseError,
  generateProductExcelTemplate,
  parseProductExcelFile,
} from '@/utils/excelParser';
import type { Product, ProductExtra, ProductMinimumInventory, ProductSetItem } from '@/types';
import { validateUnitConversions } from '@/utils/unitConversion';
import { isProductSet } from '@/utils/productSet';
import { SingleProductForm, type ProductFormValues } from './SingleProductForm';
import { ProductBulkImportForm } from './ProductBulkImportForm';

const isMobile = device.isMobile;
const hasBulkImport = hasBulkImportForProducts();
const priceEnabled = isPriceManagementEnabled();

const priceManageable = priceEnabled && perms.product.canManagePrice();
const barcodeEnabled = hasBarcodeForProducts();
const canCreate = perms.product.canCreate();
const canEdit = perms.product.canEdit();

function buildNextProductCode(n: number): string {
  const { codePrefix, codePadLength } = appConfig.features.products;
  return `${codePrefix}${n.toString().padStart(Math.max(0, codePadLength), '0')}`;
}

const hasValue = (v: number | string): boolean => typeof v === 'number' && v > 0;
const hasUnit = (v: string): boolean => v.trim() !== '';

export function ProductFormPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const forceRefresh = useProductStore((s) => s.forceRefresh);
  const totalProducts = useProductStore((s) => s.items.length);

  
  
  
  
  const categoryOptions = useLookupOptions('product-category');
  const tagOptions = useLookupOptions('product-tag');
  const unitOptions = useLookupOptions('unit');

  
  
  
  const snapshotRef = useRef<Product | null>(null);

  const [activeTab, setActiveTab] = useState<string | null>('single');

  
  const bulkNavTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(bulkNavTimer.current), []);

  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const fileRef = useRef<File | undefined>(undefined);
  const [file, setFile] = useState<File | undefined>();
  const [importResult, setImportResult] = useState<
    | {
        summary: { total: number; created: number; skipped: number; failed: number };
        skipped?: string[];
        errors?: string[];
      }
    | undefined
  >();

  
  useEffect(() => {
    let canView = true;
    if (isMobile) {
      canView = false;
    } else if (isEdit && !canEdit) {
      canView = false;
    } else if (!isEdit && !canCreate) {
      canView = false;
    }
    if (!canView) {
      navigate(ROUTES.PRODUCTS.LIST, { replace: true });
    }
  }, [navigate, isEdit]);

  const [loading, setLoading] = useState(false);

  const form = useForm<ProductFormValues>({
    initialValues: {
      name: '',
      
      code: isEdit ? '' : buildNextProductCode(totalProducts + 1),
      description: '',
      units: [],
      price: 0,
      isActive: true,
      alternativeNames: [],
      
      
      
      
      
      
      sku: isEdit ? '' : buildNextProductCode(totalProducts + 1),
      
      
      
      
      barcode: isEdit || !barcodeEnabled ? '' : generateInternalBarcode(),
      basePrice: 0,
      suggestedPrice: 0,
      category: '',
      tags: [],
      attributes: [],
      minInventoryValue: '',
      minInventoryUnit: '',
      noInventory: false,
      unitConversions: [],
      setItems: [],
    },
    validate: {
      name: (v) => (v.trim() ? null : t('common.validation.nameRequired')),
      code: (v) => (v.trim() ? null : t('common.validation.codeRequired')),
      
      
      
      
      sku: (v) => {
        const sku = v.trim();
        if (!sku) return null;
        const items = useProductStore.getState().items;
        const collision = items.find(
          (p) => p.id !== id && !p.extra?.isDeleted && p.extra?.sku?.trim() === sku,
        );
        return collision ? t('products.validation.skuDuplicate') : null;
      },
      units: (v) => (v.length > 0 ? null : t('common.validation.unitRequired')),
      unitConversions: (conversions, values) => {
        const result = validateUnitConversions(values.units, conversions);
        if (result === 'conflict') return t('products.validation.unitConversionConflict');
        if (result === 'disconnected') return t('products.validation.unitsNotConnected');
        return null;
      },
      
      
      
      minInventoryValue: (v, values) =>
        !hasValue(v) && hasUnit(values.minInventoryUnit)
          ? t('products.validation.pairValueRequired')
          : null,
      minInventoryUnit: (v, values) =>
        hasValue(values.minInventoryValue) && !hasUnit(v)
          ? t('products.validation.pairUnitRequired')
          : null,
      
      
      
      
      
      setItems: (rows, values) => {
        if (!rows || rows.length === 0) return null;
        const allProducts = useProductStore.getState().items;
        const byCode = new Map(allProducts.map((p) => [p.code, p] as const));
        for (const r of rows) {
          if (!r.productCode.trim()) return t('products.validation.setItemMissingProduct');
          if (!r.unit.trim()) return t('products.validation.setItemMissingUnit');
          if (!(r.quantity > 0)) return t('products.validation.setItemQuantity');
          if (values.code && r.productCode === values.code) {
            return t('products.validation.setItemSelfRef');
          }
          const ref = byCode.get(r.productCode);
          if (ref && isProductSet(ref)) return t('products.validation.setItemNested');
        }
        return null;
      },
    },
  });

  
  
  
  
  
  
  useEffect(() => {
    if (isEdit) return;
    const nextCode = buildNextProductCode(totalProducts + 1);
    form.setFieldValue('code', nextCode);
    
    form.setFieldValue('sku', nextCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, totalProducts]);

  const productToFormValues = useCallback((p: Product): ProductFormValues => {
    const min = p.extra?.minimumInventory;
    return {
      name: p.name,
      code: p.code,
      description: p.description || '',
      units: p.extra?.units ?? (p.unit ? [p.unit] : []),
      price: p.price || 0,
      isActive: p.isActive,
      alternativeNames: p.extra?.alternativeNames ?? [],
      sku: p.extra?.sku ?? '',
      barcode: p.extra?.barcode ?? '',
      basePrice: p.extra?.basePrice ?? 0,
      suggestedPrice: p.extra?.suggestedPrice ?? 0,
      category: p.extra?.category ?? '',
      tags: p.extra?.tags ?? [],
      attributes: p.extra?.attributes ?? [],
      minInventoryValue: min?.value ?? '',
      minInventoryUnit: min?.unit ?? '',
      noInventory: p.extra?.noInventory ?? false,
      unitConversions: p.extra?.unitConversions ?? [],
      setItems: p.extra?.setItems ?? [],
    };
  }, []);

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (id) => {
      const res = await cMngtConnector.getProductById<ProductExtra>({ id });
      const p = res.product;
      snapshotRef.current = p;
      return productToFormValues(p);
    },
    () => {
      notifications.show({ color: 'red', message: t('products.notifications.fetchError') });
      navigate(ROUTES.PRODUCTS.LIST);
    },
  );

  const handleSubmit = useCallback(
    async (values: ProductFormValues) => {
      setLoading(true);
      try {
        const user = useAuthStore.getState().user;
        const updatedBy = user?.email ?? 'unknown';

        
        const core = {
          name: values.name,
          code: values.code,
          description: values.description,
          unit: values.units[0] ?? '',
          price: values.price,
          isActive: values.isActive,
        };

        
        
        
        
        
        
        const images = snapshotRef.current?.extra?.images ?? [];

        
        let minimumInventory: ProductMinimumInventory | undefined;
        if (
          !values.noInventory &&
          typeof values.minInventoryValue === 'number' &&
          values.minInventoryValue > 0 &&
          values.minInventoryUnit.trim()
        ) {
          const existing =
            isEdit && id
              ? (useProductStore.getState().getById(id) as { extra?: ProductExtra } | undefined)
                  ?.extra?.minimumInventory
              : undefined;
          const unchanged =
            existing?.value === values.minInventoryValue &&
            existing?.unit === values.minInventoryUnit.trim();
          minimumInventory = unchanged
            ? existing
            : {
                value: values.minInventoryValue,
                unit: values.minInventoryUnit.trim(),
                configBy: 'user',
                updatedAt: Date.now(),
                updatedBy,
              };
        }

        const extra: ProductExtra = {
          ...(values.units.length > 0 && { units: values.units }),
          ...(values.alternativeNames.length > 0 && {
            alternativeNames: values.alternativeNames,
          }),
          ...(images.length > 0 && { images }),
          
          
          
          ...((isEdit ? values.sku.trim() : values.code.trim()) && {
            sku: isEdit ? values.sku.trim() : values.code.trim(),
          }),
          ...(values.barcode.trim() && { barcode: values.barcode.trim() }),
          ...(values.basePrice > 0 && { basePrice: values.basePrice }),
          ...(values.suggestedPrice > 0 && { suggestedPrice: values.suggestedPrice }),
          ...(values.category.trim() && { category: values.category.trim() }),
          ...(values.tags.length > 0 && { tags: values.tags }),
          
          
          
          
          ...(() => {
            const cleaned = values.attributes
              .map((a) => ({ key: a.key.trim(), value: a.value.trim() }))
              .filter((a) => a.key && a.value);
            return cleaned.length > 0 ? { attributes: cleaned } : {};
          })(),
          ...(minimumInventory && { minimumInventory }),
          ...(values.noInventory && { noInventory: true }),
          ...(values.unitConversions.length > 0 && {
            unitConversions: values.unitConversions.filter(
              (c) => c.unit.trim() && c.baseUnit.trim() && c.quantity > 0,
            ),
          }),
          
          
          
          ...(() => {
            const cleaned: ProductSetItem[] = values.setItems
              .map((r) => ({
                productCode: r.productCode.trim(),
                quantity: r.quantity,
                unit: r.unit.trim(),
              }))
              .filter((r) => r.productCode && r.unit && r.quantity > 0);
            return cleaned.length > 0 ? { setItems: cleaned } : {};
          })(),
        };

        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Product snapshot missing');
          const before = {
            name: snapshot.name,
            code: snapshot.code,
            description: snapshot.description,
            unit: snapshot.unit,
            price: snapshot.price,
            isActive: snapshot.isActive,
            extra: snapshot.extra,
          };
          const after = { ...core, extra };
          const updated = await useProductStore
            .getState()
            .updateSafely({ id, version: snapshot.version, patch: after });
          const diff = deepDiff(before, after);
          
          
          const onlyIsActive = Object.keys(diff).length === 1 && 'isActive' in diff;
          logActivity(onlyIsActive ? 'product.toggleStatus' : 'product.update', id, diff);
          
          
          snapshotRef.current = updated;
          notifications.show({
            color: 'green',
            message: t('products.notifications.updateSuccess'),
          });
          navigate(ROUTES.PRODUCTS.DETAIL.replace(':id', id));
        } else {
          const expectedListHash = readListHash(useProductStore, 'products');
          const res = await cMngtConnector.createProduct<ProductExtra>({
            ...core,
            extra,
            ...(expectedListHash && { expectedListHash }),
          });
          logActivity('product.create', res.product.id);
          
          
          forceRefresh();
          notifications.show({
            color: 'green',
            message: t('products.notifications.createSuccess'),
          });
          
          
          
          
          navigate(ROUTES.PRODUCTS.DETAIL.replace(':id', res.product.id), {
            state: { promptInventory: true },
          });
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) {
            const latest = err.latest as Product;
            snapshotRef.current = latest;
            form.setValues(productToFormValues(latest));
          }
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else if (!isEdit && isListVersionConflict(err)) {
          
          
          
          
          await useProductStore.getState().forceRefresh();
          const newCode = buildNextProductCode(useProductStore.getState().items.length + 1);
          form.setFieldValue('code', newCode);
          form.setFieldValue('sku', newCode);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('products.notifications.listConflictMessage', { code: newCode }),
            autoClose: 10000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: isEdit
              ? t('products.notifications.updateError')
              : t('products.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, t, navigate, forceRefresh, form, productToFormValues],
  );

  const navigateToList = useCallback(() => navigate(ROUTES.PRODUCTS.LIST), [navigate]);

  
  const handleDownloadSample = useCallback(async () => {
    setIsDownloading(true);
    try {
      
      
      
      const categories = categoryOptions.map((o) => o.label);
      const tags = tagOptions.map((o) => o.label);
      const units = unitOptions.map((o) => o.label);
      generateProductExcelTemplate({
        language: i18n.language,
        hasPrice: priceManageable,
        hasBarcode: barcodeEnabled,
        categories,
        tags,
        units,
      });
      notifications.show({
        color: 'green',
        message: t('common.bulkImport.downloadSuccess'),
      });
    } catch {
      notifications.show({
        color: 'red',
        message: t('products.notifications.createError'),
      });
    } finally {
      setIsDownloading(false);
    }
  }, [t, i18n.language, categoryOptions, tagOptions, unitOptions]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    fileRef.current = selectedFile;
    setFile(selectedFile);
    setImportResult(undefined);
  }, []);

  const handleFileRemove = useCallback(() => {
    fileRef.current = undefined;
    setFile(undefined);
    setImportResult(undefined);
  }, []);

  const handleBulkUpload = useCallback(async () => {
    if (!fileRef.current) return;

    setIsBulkLoading(true);
    setImportResult(undefined);

    try {
      const products = await parseProductExcelFile(fileRef.current);

      if (products.length === 0) {
        notifications.show({
          color: 'red',
          message: t('products.bulkImport.noValidRows'),
        });
        return;
      }

      
      
      
      
      
      
      
      
      const catLabelToValue = new Map<string, string>();
      for (const o of categoryOptions) catLabelToValue.set(o.label.trim().toLowerCase(), o.value);
      const tagLabelToCanonical = new Map<string, string>();
      for (const o of tagOptions) tagLabelToCanonical.set(o.label.trim().toLowerCase(), o.label);
      const unitLabelToValue = new Map<string, string>();
      for (const o of unitOptions) unitLabelToValue.set(o.label.trim().toLowerCase(), o.value);

      const unknownCategories = new Set<string>();
      const unknownTags = new Set<string>();
      const unknownUnits = new Set<string>();
      for (const p of products) {
        const cat = p.category?.trim();
        if (cat && !catLabelToValue.has(cat.toLowerCase())) unknownCategories.add(cat);
        for (const raw of p.tags ?? []) {
          const tag = raw.trim();
          if (tag && !tagLabelToCanonical.has(tag.toLowerCase())) unknownTags.add(tag);
        }
        
        
        
        for (const raw of [p.unit, p.minInventoryUnit]) {
          const unit = raw?.trim();
          if (unit && !unitLabelToValue.has(unit.toLowerCase())) unknownUnits.add(unit);
        }
      }

      if (unknownCategories.size > 0 || unknownTags.size > 0 || unknownUnits.size > 0) {
        const lines: string[] = [];
        if (unknownCategories.size > 0) {
          lines.push(
            t('products.bulkImport.unknownCategoryMessage', {
              labels: Array.from(unknownCategories).join(', '),
            }),
          );
        }
        if (unknownTags.size > 0) {
          lines.push(
            t('products.bulkImport.unknownTagMessage', {
              labels: Array.from(unknownTags).join(', '),
            }),
          );
        }
        if (unknownUnits.size > 0) {
          lines.push(
            t('products.bulkImport.unknownUnitMessage', {
              labels: Array.from(unknownUnits).join(', '),
            }),
          );
        }
        notifications.show({
          color: 'red',
          title: t('products.bulkImport.unknownLabelTitle'),
          message: lines.join(' '),
          autoClose: 12000,
        });
        return;
      }

      
      
      
      
      
      const user = useAuthStore.getState().user;
      const updatedBy = user?.email ?? 'unknown';
      const now = Date.now();
      let nextCodeNum = totalProducts + 1;
      const items = products.map((p) => {
        const code = p.code?.trim() || buildNextProductCode(nextCodeNum++);
        
        
        const resolveUnit = (raw: string | undefined) => {
          const label = raw?.trim();
          return label ? (unitLabelToValue.get(label.toLowerCase()) ?? '') : '';
        };
        const unit = resolveUnit(p.unit);
        const minUnit = resolveUnit(p.minInventoryUnit) || unit;
        const minValue =
          typeof p.minInventoryValue === 'number' && p.minInventoryValue > 0
            ? p.minInventoryValue
            : undefined;
        
        
        const category = p.category?.trim()
          ? catLabelToValue.get(p.category.trim().toLowerCase())
          : undefined;
        const tags = (p.tags ?? [])
          .map((raw) => tagLabelToCanonical.get(raw.trim().toLowerCase()))
          .filter((v): v is string => Boolean(v));
        const extra: ProductExtra = {
          
          
          
          sku: code,
          ...(barcodeEnabled && {
            barcode: p.barcode?.trim() || generateInternalBarcode(),
          }),
          ...(category && { category }),
          ...(tags.length > 0 && { tags }),
          
          
          
          
          
          ...(unit && { units: [unit] }),
          ...(priceManageable &&
            typeof p.basePrice === 'number' &&
            p.basePrice > 0 && {
              basePrice: p.basePrice,
            }),
          
          
          
          
          
          
          ...(minValue !== undefined &&
            minUnit && {
              minimumInventory: {
                value: minValue,
                unit: minUnit,
                configBy: 'user',
                updatedAt: now,
                updatedBy,
              },
            }),
        };
        return {
          name: p.name,
          code,
          description: p.description?.trim() ?? '',
          unit,
          price: priceManageable && typeof p.price === 'number' ? p.price : 0,
          extra,
        };
      });

      const res = await cMngtConnector.importBatchProducts<ProductExtra>({ items });
      const total = res.summary?.total ?? products.length;
      const created = res.summary?.created ?? 0;
      const skippedCount = res.summary?.skipped ?? 0;
      const failed = res.summary?.errors ?? Math.max(0, total - created - skippedCount);
      const rowName = (index: number) =>
        products[index]?.name ?? t('common.bulkImport.rowLabel', { n: index + 1 });
      
      
      const skippedNames = (res.skipped ?? []).map((s) => {
        const reason =
          s.reason === 'duplicate-sku'
            ? t('products.bulkImport.skippedDuplicateSku')
            : t('products.bulkImport.skippedDuplicateCode');
        return `${rowName(s.index)}: ${reason}`;
      });
      const errorNames = (res.errors ?? []).map((e) => `${rowName(e.index)}: ${e.message}`);

      forceRefresh();
      setImportResult({
        summary: { total, created, skipped: skippedCount, failed },
        skipped: skippedNames.length > 0 ? skippedNames : undefined,
        errors: errorNames.length > 0 ? errorNames : undefined,
      });

      
      
      if (failed === 0 && skippedCount === 0) {
        notifications.show({
          color: 'green',
          message: t('products.notifications.createSuccess'),
        });
        bulkNavTimer.current = setTimeout(() => navigate(ROUTES.PRODUCTS.LIST), 2000);
      } else {
        notifications.show({
          color: 'yellow',
          message: t('common.bulkImport.partialSuccess', {
            success: created,
            total,
          }),
        });
      }
    } catch (err) {
      if (err instanceof ExcelParseError) {
        
        
        
        
        const labels: Record<string, string> = {
          name: t('common.labels.name'),
        };
        const columns = err.missing.map((f) => labels[f] ?? f).join(', ');
        notifications.show({
          color: 'red',
          title: t('products.bulkImport.missingColumnTitle'),
          message: t('products.bulkImport.missingColumnMessage', { columns }),
          autoClose: 10000,
        });
        return;
      }
      notifications.show({
        color: 'red',
        message: t('products.notifications.createError'),
      });
    } finally {
      setIsBulkLoading(false);
    }
  }, [t, forceRefresh, navigate, totalProducts, categoryOptions, tagOptions, unitOptions]);

  const validateFileType = useCallback((f: File) => {
    const validTypes = [
      'text/csv',
      
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    return validTypes.includes(f.type) || /\.(csv|xlsx|xls)$/i.test(f.name);
  }, []);

  if (fetching) return null;

  const pageTitle = isEdit ? t('products.editItem') : t('products.addItem');

  const singleForm = (
    <SingleProductForm
      form={form}
      isLoading={loading}
      isEditMode={isEdit}
      onSubmit={handleSubmit}
      onCancel={navigateToList}
    />
  );

  
  
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
    </Group>
  );

  return (
    <Stack gap="lg">
      {topActions}

      <Title order={isMobile ? 4 : 3} lh={1.2}>
        {pageTitle}
      </Title>

      <Divider />

      {isEdit || !hasBulkImport ? (
        singleForm
      ) : (
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="single" leftSection={<IconPackage size={16} />}>
              {t('products.tab.single')}
            </Tabs.Tab>
            <Tabs.Tab value="bulk" leftSection={<IconFileSpreadsheet size={16} />}>
              {t('products.tab.bulk')}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="single" pt="md">
            {singleForm}
          </Tabs.Panel>

          <Tabs.Panel value="bulk" pt="md">
            <ProductBulkImportForm
              isLoading={isBulkLoading}
              isDownloading={isDownloading}
              file={file}
              importResult={importResult}
              onDownloadSample={handleDownloadSample}
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              onImport={handleBulkUpload}
              onCancel={navigateToList}
              validateFileType={validateFileType}
            />
          </Tabs.Panel>
        </Tabs>
      )}
    </Stack>
  );
}
