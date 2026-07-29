import { Button, Divider, Group, Stack, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconBox, IconFileSpreadsheet } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { useMaterialStore, MATERIAL_RECORD_TARGET } from '@/stores/useMaterialStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { device } from '@credo/base-ui/utils';
import { Tabs } from '@credo/base-ui/components';
import { useInitFormFromFetch, useLookupV2Options } from '@/hooks';
import { perms } from '@/utils/permission';
import {
  getMaterialUnitCategory,
  hasMaterialAttributes,
  hasMaterialBulkImport,
  hasMaterialDescription,
  hasMaterialMemo,
  hasMaterialMinimumStock,
  hasMaterialPricing,
  hasMaterialSpecification,
  hasMaterialTags,
  isMaterialMultiUnit,
  MATERIAL_CATEGORY_LOOKUP,
} from '@/utils/materialConfig';
import { validateUnitConversions } from '@/utils/unitConversion';
import { logActivity } from '@/utils/activityLogger';
import { deepDiff } from '@/utils/deepDiff';
import {
  ExcelParseError,
  generateMaterialExcelTemplate,
  parseMaterialExcelFile,
} from '@/utils/excelParser';
import type { Material, MaterialExtra } from '@/types';
import { SingleMaterialForm, type MaterialFormValues } from './SingleMaterialForm';
import { MaterialBulkImportForm, type MaterialImportResult } from './MaterialBulkImportForm';

const isMobile = device.isMobile;

const multiUnit = isMaterialMultiUnit();
const unitCategory = getMaterialUnitCategory();
const hasDescription = hasMaterialDescription();
const hasSpecification = hasMaterialSpecification();
const hasMemo = hasMaterialMemo();
const hasPricing = hasMaterialPricing();
const hasMinimumStock = hasMaterialMinimumStock();
const hasTags = hasMaterialTags();
const hasAttributes = hasMaterialAttributes();
const hasBulkImport = hasMaterialBulkImport();

const CODE_PATTERN = /^[a-zA-Z0-9]+$/;

export function MaterialFormPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  useEffect(() => {
    if (
      isMobile ||
      (isEdit && !perms.material.canEdit()) ||
      (!isEdit && !perms.material.canCreate())
    ) {
      navigate(ROUTES.MATERIALS.LIST, { replace: true });
    }
  }, [navigate, isEdit]);

  const [loading, setLoading] = useState(false);
  const snapshotRef = useRef<Material | null>(null);

  const unitOptions = useLookupV2Options(unitCategory);
  const categoryOptions = useLookupV2Options(MATERIAL_CATEGORY_LOOKUP);

  const [activeTab, setActiveTab] = useState<string | null>('single');
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [file, setFile] = useState<File | undefined>();
  const fileRef = useRef<File | undefined>(undefined);
  const [importResult, setImportResult] = useState<MaterialImportResult | undefined>();
  const bulkNavTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(bulkNavTimer.current), []);

  const form = useForm<MaterialFormValues>({
    initialValues: {
      name: '',
      code: '',
      isActive: true,
      units: [],
      category: '',
      unitConversions: [],
      description: '',
      specification: '',
      memo: '',
      costPrice: '',
      minimumStock: '',
      tags: [],
      attributes: [],
    },
    validate: {
      name: (v) => (v.trim() ? null : t('common.validation.nameRequired')),
      code: (v) => {
        if (!v.trim()) return t('common.validation.codeRequired');

        if (/\s/.test(v)) return t('common.validation.codeNoWhitespace');

        if (!CODE_PATTERN.test(v)) return t('common.validation.codeSpecialCharacters');
        return null;
      },
      unitConversions: (conversions, values) => {
        if (!multiUnit || values.units.length < 2) return null;
        const result = validateUnitConversions(values.units, conversions);
        if (result === 'conflict') return t('products.validation.unitConversionConflict');
        if (result === 'disconnected') return t('products.validation.unitsNotConnected');
        return null;
      },
    },
  });

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (id) => {
      const res = await cMngtConnector.getSingleRecordById(MATERIAL_RECORD_TARGET, { id });
      const m = res.item as Material;
      snapshotRef.current = m;
      return {
        name: m.name,
        code: m.code,
        isActive: m.isActive,
        units: m.extra?.units ?? [],
        category: m.extra?.category ?? '',
        unitConversions: m.extra?.unitConversions ?? [],
        description: m.extra?.description ?? '',
        specification: m.extra?.specification ?? '',
        memo: m.extra?.memo ?? '',
        costPrice: m.extra?.costPrice ?? ('' as const),
        minimumStock: m.extra?.minimumStock ?? ('' as const),
        tags: m.extra?.tags ?? [],
        attributes: m.extra?.attributes ?? [],
      };
    },
    () => {
      notifications.show({ color: 'red', message: t('materials.notifications.fetchError') });
      navigate(ROUTES.MATERIALS.LIST);
    },
  );

  const handleSubmit = useCallback(
    async (values: MaterialFormValues) => {
      setLoading(true);

      const buildExtra = (base?: MaterialExtra): MaterialExtra => {
        const extra: MaterialExtra = { ...(base ?? {}) };
        extra.units = values.units;
        if (values.category) extra.category = values.category;
        else delete extra.category;

        const validConversions =
          multiUnit && values.units.length >= 2
            ? values.unitConversions.filter(
                (c) => c.unit.trim() && c.baseUnit.trim() && c.quantity > 0,
              )
            : [];
        if (validConversions.length > 0) extra.unitConversions = validConversions;
        else delete extra.unitConversions;

        if (hasDescription) {
          if (values.description.trim()) extra.description = values.description.trim();
          else delete extra.description;
        }
        if (hasSpecification) {
          if (values.specification.trim()) extra.specification = values.specification.trim();
          else delete extra.specification;
        }
        if (hasMemo) {
          if (values.memo.trim()) extra.memo = values.memo.trim();
          else delete extra.memo;
        }
        if (hasPricing) {
          if (values.costPrice !== '' && Number(values.costPrice) >= 0)
            extra.costPrice = Number(values.costPrice);
          else delete extra.costPrice;
        }
        if (hasMinimumStock) {
          if (values.minimumStock !== '' && Number(values.minimumStock) >= 0)
            extra.minimumStock = Number(values.minimumStock);
          else delete extra.minimumStock;
        }
        if (hasTags) {
          const cleanTags = [...new Set(values.tags.map((tag) => tag.trim()).filter(Boolean))];
          if (cleanTags.length > 0) extra.tags = cleanTags;
          else delete extra.tags;
        }
        if (hasAttributes) {
          const cleanAttrs = values.attributes
            .map((a) => ({ key: a.key.trim(), value: a.value.trim() }))
            .filter((a) => a.key && a.value);
          if (cleanAttrs.length > 0) extra.attributes = cleanAttrs;
          else delete extra.attributes;
        }
        return extra;
      };
      try {
        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Material snapshot missing');
          const patch = {
            name: values.name.trim(),
            code: values.code.trim(),
            isActive: values.isActive,
            extra: buildExtra(snapshot.extra),
          };
          const before = {
            name: snapshot.name,
            code: snapshot.code,
            isActive: snapshot.isActive,
            extra: snapshot.extra,
          };
          const updated = await useMaterialStore.getState().updateSafely({
            id,
            version: snapshot.version,
            patch,
          });
          snapshotRef.current = updated as Material;

          const diff = deepDiff(before, patch);
          const onlyIsActive = Object.keys(diff).length === 1 && 'isActive' in diff;
          if (onlyIsActive) {
            logActivity(values.isActive ? 'material.enable' : 'material.disable', id);
          } else {
            logActivity('material.update', id, diff);
          }
          notifications.show({
            color: 'green',
            message: t('materials.notifications.updateSuccess'),
          });
          navigate(ROUTES.MATERIALS.DETAIL.replace(':id', id));
        } else {
          const created = await useMaterialStore.getState().createSafely({
            patch: {
              name: values.name.trim(),
              code: values.code.trim(),
              isActive: true,
              extra: buildExtra(),
            },
          });
          logActivity('material.create', created.id);
          notifications.show({
            color: 'green',
            message: t('materials.notifications.createSuccess'),
          });
          navigate(ROUTES.MATERIALS.DETAIL.replace(':id', created.id));
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as Material;
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
              ? t('materials.notifications.updateError')
              : t('materials.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, t, navigate],
  );

  const navigateToList = useCallback(() => navigate(ROUTES.MATERIALS.LIST), [navigate]);

  const handleDownloadSample = useCallback(async () => {
    setIsDownloading(true);
    try {
      const categoryLabels = Object.fromEntries(categoryOptions.map((o) => [o.value, o.label]));
      const unitLabels = Object.fromEntries(unitOptions.map((o) => [o.value, o.label]));

      if (!useMaterialStore.getState().initialized) {
        await useMaterialStore.getState().loadAll();
      }
      generateMaterialExcelTemplate({
        language: i18n.language,
        hasCategory: categoryOptions.length > 0,
        hasPricing,
        hasMinimumStock,
        hasSpecification,
        hasDescription,
        hasMemo,
        hasTags,
        multiUnit,
        materials: useMaterialStore.getState().items,
        categoryLabels,
        unitLabels,
        categories: categoryOptions.map((o) => o.label),
        units: unitOptions.map((o) => o.label),
      });
      notifications.show({
        color: 'green',
        message: t('common.bulkImport.downloadSuccess'),
      });
    } catch {
      notifications.show({ color: 'red', message: t('materials.notifications.createError') });
    } finally {
      setIsDownloading(false);
    }
  }, [t, i18n.language, categoryOptions, unitOptions]);

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
      const rows = await parseMaterialExcelFile(fileRef.current);

      if (rows.length === 0) {
        notifications.show({ color: 'red', message: t('materials.bulkImport.noValidRows') });
        return;
      }

      const unitLabelToValue = new Map<string, string>();
      for (const o of unitOptions) unitLabelToValue.set(o.label.trim().toLowerCase(), o.value);
      const catLabelToValue = new Map<string, string>();
      for (const o of categoryOptions) catLabelToValue.set(o.label.trim().toLowerCase(), o.value);

      const unknownUnits = new Set<string>();
      const unknownCategories = new Set<string>();
      for (const r of rows) {
        for (const raw of r.units ?? []) {
          const unit = raw.trim();
          if (unit && !unitLabelToValue.has(unit.toLowerCase())) unknownUnits.add(unit);
        }
        const cat = r.category?.trim();
        if (cat && !catLabelToValue.has(cat.toLowerCase())) unknownCategories.add(cat);
      }

      if (unknownUnits.size > 0 || unknownCategories.size > 0) {
        const lines: string[] = [];
        if (unknownUnits.size > 0) {
          lines.push(
            t('materials.bulkImport.unknownUnitMessage', {
              labels: Array.from(unknownUnits).join(', '),
            }),
          );
        }
        if (unknownCategories.size > 0) {
          lines.push(
            t('materials.bulkImport.unknownCategoryMessage', {
              labels: Array.from(unknownCategories).join(', '),
            }),
          );
        }
        notifications.show({
          color: 'red',
          title: t('materials.bulkImport.unknownLabelTitle'),
          message: lines.join(' '),
          autoClose: 12000,
        });
        return;
      }

      await useMaterialStore.getState().forceRefresh();
      const {
        items: liveMaterials,
        error: refreshError,
        initialized,
      } = useMaterialStore.getState();

      if (refreshError || !initialized) {
        notifications.show({
          color: 'red',
          title: t('materials.bulkImport.refreshFailedTitle'),
          message: t('materials.bulkImport.refreshFailedMessage'),
          autoClose: 10000,
        });
        return;
      }

      const existingCodes = new Set(liveMaterials.map((m) => m.code?.trim()).filter(Boolean));

      const errorLines: string[] = [];
      const skippedLines: string[] = [];
      const seenCodes = new Set<string>();
      const items: Array<Pick<Material, 'name' | 'code' | 'isActive'> & { extra: MaterialExtra }> =
        [];

      const itemLabels: string[] = [];

      for (const [index, row] of rows.entries()) {
        const name = row.name.trim();
        const label = name || t('common.bulkImport.rowLabel', { n: index + 1 });
        const code = row.code?.trim() ?? '';

        if (!code) {
          errorLines.push(`${label}: ${t('materials.bulkImport.errorCodeRequired')}`);
          continue;
        }
        if (!CODE_PATTERN.test(code)) {
          errorLines.push(`${label}: ${t('materials.bulkImport.errorCodeInvalid')}`);
          continue;
        }
        if (existingCodes.has(code) || seenCodes.has(code)) {
          skippedLines.push(`${label}: ${t('materials.bulkImport.skippedDuplicateCode')}`);
          continue;
        }
        seenCodes.add(code);

        const resolvedUnits = (row.units ?? [])
          .map((raw) => unitLabelToValue.get(raw.trim().toLowerCase()))
          .filter((v): v is string => Boolean(v));

        const units = [...new Set(multiUnit ? resolvedUnits : resolvedUnits.slice(0, 1))];
        const category = row.category?.trim()
          ? catLabelToValue.get(row.category.trim().toLowerCase())
          : undefined;

        const extra: MaterialExtra = {
          units,
          ...(category && { category }),
          ...(hasPricing &&
            typeof row.costPrice === 'number' &&
            row.costPrice >= 0 && { costPrice: row.costPrice }),
          ...(hasMinimumStock &&
            typeof row.minimumStock === 'number' &&
            row.minimumStock >= 0 && { minimumStock: row.minimumStock }),
          ...(hasSpecification &&
            row.specification?.trim() && { specification: row.specification.trim() }),
          ...(hasDescription && row.description?.trim() && { description: row.description.trim() }),
          ...(hasMemo && row.memo?.trim() && { memo: row.memo.trim() }),
          ...(hasTags &&
            (row.tags?.length ?? 0) > 0 && {
              tags: [...new Set(row.tags!.map((tag) => tag.trim()).filter(Boolean))],
            }),
        };

        items.push({ name, code, isActive: row.isActive ?? true, extra });
        itemLabels.push(label);
      }

      const total = rows.length;

      if (items.length === 0) {
        setImportResult({
          summary: { total, created: 0, skipped: skippedLines.length, failed: errorLines.length },
          ...(skippedLines.length > 0 && { skipped: skippedLines }),
          ...(errorLines.length > 0 && { errors: errorLines }),
        });
        notifications.show({ color: 'red', message: t('materials.bulkImport.noValidRows') });
        return;
      }

      const res = await useMaterialStore.getState().bulkUpsertSafely({ items });

      const created = res.created.length + res.updated.length;
      const serverErrors = res.errors.map(
        (e) =>
          `${itemLabels[e.index] ?? t('common.bulkImport.rowLabel', { n: e.index + 1 })}: ${e.message}`,
      );
      const failed = errorLines.length + res.errors.length;
      const allErrors = [...errorLines, ...serverErrors];

      setImportResult({
        summary: { total, created, skipped: skippedLines.length, failed },
        ...(skippedLines.length > 0 && { skipped: skippedLines }),
        ...(allErrors.length > 0 && { errors: allErrors }),
      });

      if (failed === 0 && skippedLines.length === 0) {
        notifications.show({
          color: 'green',
          message: t('materials.notifications.createSuccess'),
        });
        bulkNavTimer.current = setTimeout(() => navigate(ROUTES.MATERIALS.LIST), 2000);
      } else {
        notifications.show({
          color: 'yellow',
          message: t('common.bulkImport.partialSuccess', { success: created, total }),
        });
      }
    } catch (err) {
      if (err instanceof ExcelParseError) {
        const labels: Record<string, string> = {
          name: t('common.labels.name'),
          code: t('common.labels.code'),
        };
        const columns = err.missing.map((f) => labels[f] ?? f).join(', ');
        notifications.show({
          color: 'red',
          title: t('materials.bulkImport.missingColumnTitle'),
          message: t('materials.bulkImport.missingColumnMessage', { columns }),
          autoClose: 10000,
        });
        return;
      }
      notifications.show({ color: 'red', message: t('materials.notifications.createError') });
    } finally {
      setIsBulkLoading(false);
    }
  }, [t, navigate, unitOptions, categoryOptions]);

  const validateFileType = useCallback((f: File) => {
    const validTypes = [
      'text/csv',

      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    return validTypes.includes(f.type) || /\.(csv|xlsx|xls)$/i.test(f.name);
  }, []);

  if (fetching) return null;

  const pageTitle = isEdit ? t('materials.editItem') : t('materials.addItem');

  const singleForm = (
    <SingleMaterialForm
      form={form}
      isLoading={loading}
      isEditMode={isEdit}
      onSubmit={handleSubmit}
      onCancel={navigateToList}
    />
  );

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

      <Divider />

      {isEdit || !hasBulkImport ? (
        singleForm
      ) : (
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="single" leftSection={<IconBox size={16} />}>
              {t('materials.tab.single')}
            </Tabs.Tab>
            <Tabs.Tab value="bulk" leftSection={<IconFileSpreadsheet size={16} />}>
              {t('materials.tab.bulk')}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="single" pt="md">
            {singleForm}
          </Tabs.Panel>

          <Tabs.Panel value="bulk" pt="md">
            <MaterialBulkImportForm
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
