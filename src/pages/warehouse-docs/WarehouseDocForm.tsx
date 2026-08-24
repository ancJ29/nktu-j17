import {
  ActionIcon,
  Button,
  Card,
  Divider,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconHash, IconLock, IconPlus, IconTrash } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import { device } from '@credo/base-ui/utils';
import { DateField } from '@/components/DateField';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useMaterialStore } from '@/stores/useMaterialStore';
import { useMaterialInventoryStore } from '@/stores/useMaterialInventoryStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { EmployeeSelector } from '@/components/selectors';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';
import { getMaterialUnitCategory } from '@/utils/materialConfig';
import { todayInVnDateString } from '@/utils/dateTimeField';
import type { Material, MaterialInventoryRow, WarehouseDocRow } from '@/types';
import { useMyEmployee } from '@/hooks/useMyEmployee';
import {
  bundleFor,
  buildDocCode,
  isDuplicateDocCodeError,
  MAX_DOC_CODE_RETRIES,
  type WarehouseDocKind,
} from './kinds';
import { Form } from '@/components/Form';

const isMobile = device.isMobile;

type FormLine = { itemCode: string; itemName: string; unit: string; quantity: number | '' };
type FormValues = {
  recordDate: string;
  code: string;
  reference: string;
  assignedTo: string;
  note: string;
  lines: FormLine[];
};

function formatOnHandHint(
  inv: MaterialInventoryRow,
  baseUnit: string | undefined,
  isMultiUnit: boolean,
  unitLabels: Map<string, string>,
): string {
  const byUnit = inv.extra?.onHandByUnit;
  const breakdown = byUnit ? Object.entries(byUnit).filter(([, q]) => q !== 0) : [];
  if (isMultiUnit && breakdown.length > 0) {
    return breakdown
      .map(([u, q]) => `${q.toLocaleString()} ${lookupLabelOf(unitLabels, u, u)}`)
      .join(' · ');
  }
  const unit = baseUnit ? ` ${lookupLabelOf(unitLabels, baseUnit, baseUnit)}` : '';
  return `${inv.onHand.toLocaleString()}${unit}`;
}

export function WarehouseDocForm({ kind }: { kind: WarehouseDocKind }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const bundle = bundleFor(kind);

  const navState = location.state as {
    copyFrom?: WarehouseDocRow;
    seedMaterialCodes?: string[];
  } | null;
  const copyFrom = navState?.copyFrom ?? null;

  const seedMaterialCodes = navState?.seedMaterialCodes ?? null;

  useEffect(() => {
    if (isMobile || (isEdit && !kind.perms.canEdit()) || (!isEdit && !kind.perms.canCreate())) {
      navigate(kind.routes.LIST, { replace: true });
    }
  }, [navigate, isEdit, kind]);

  const docs = bundle.useStore((s) => s.items);
  const initialized = bundle.useStore((s) => s.initialized);
  const loadAll = bundle.useStore((s) => s.loadAll);

  const materials = useMaterialStore((s) => s.items);
  const materialsInitialized = useMaterialStore((s) => s.initialized);
  const loadMaterials = useMaterialStore((s) => s.loadAll);

  const inventory = useMaterialInventoryStore((s) => s.items);
  const inventoryInitialized = useMaterialInventoryStore((s) => s.initialized);
  const loadInventory = useMaterialInventoryStore((s) => s.loadAll);

  const employeesInitialized = useEmployeeStore((s) => s.initialized);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);

  const [loading, setLoading] = useState(false);
  const snapshotRef = useRef<WarehouseDocRow | null>(null);
  const seededRef = useRef(false);
  const copySeededRef = useRef(false);
  const materialSeededRef = useRef(false);

  const materialSelectRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const focusNewLineRef = useRef(false);

  const quantityInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const focusFirstQuantityRef = useRef(false);

  const form = useForm<FormValues>({
    initialValues: {
      recordDate: todayInVnDateString(),
      code: '',
      reference: '',
      assignedTo: '',
      note: '',
      lines: [],
    },
    validate: {
      recordDate: (v) => (v ? null : t('warehouseDoc.validation.dateRequired')),
    },
  });

  useEffect(() => {
    if (!initialized) loadAll();
  }, [initialized, loadAll]);
  useEffect(() => {
    if (!materialsInitialized) loadMaterials();
  }, [materialsInitialized, loadMaterials]);
  useEffect(() => {
    if (!inventoryInitialized) loadInventory();
  }, [inventoryInitialized, loadInventory]);
  useEffect(() => {
    if (!employeesInitialized) loadEmployees();
  }, [employeesInitialized, loadEmployees]);

  const currentEmployeeId = useMyEmployee()?.id ?? '';
  useEffect(() => {
    if (isEdit || !currentEmployeeId || form.getValues().assignedTo) return;
    form.setFieldValue('assignedTo', currentEmployeeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, currentEmployeeId]);

  const unitLabels = useLookupV2Labels(getMaterialUnitCategory());

  const materialOptions = useMemo(
    () =>
      materials
        .filter((m) => !m.extra?.isDeleted)
        .map((m) => ({ value: m.code, label: `${m.name} (${m.code})`, name: m.name })),
    [materials],
  );
  const materialByCode = useMemo(
    () => new Map<string, Material>(materials.map((m) => [m.code, m])),
    [materials],
  );
  const invByCode = useMemo(
    () => new Map<string, MaterialInventoryRow>(inventory.map((r) => [r.itemCode, r])),
    [inventory],
  );

  const docsOnDay = useCallback(
    (date: string, excludeId?: string) =>
      docs.filter((d) => d.recordDate === date && d.id !== excludeId && !d.extra?.isDeleted).length,
    [docs],
  );
  useEffect(() => {
    if (isEdit) return;
    form.setFieldValue(
      'code',
      buildDocCode(kind, form.values.recordDate, docsOnDay(form.values.recordDate)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, form.values.recordDate, docs.length]);

  const existing = useMemo(
    () => (isEdit ? (docs.find((d) => d.id === id) ?? null) : null),
    [isEdit, docs, id],
  );
  useEffect(() => {
    if (isEdit && existing && !seededRef.current) {
      seededRef.current = true;
      snapshotRef.current = existing;
      form.setValues({
        recordDate: existing.recordDate,
        code: existing.extra.code,
        reference: existing.extra.reference ?? '',
        assignedTo: existing.extra.assignedTo ?? '',
        note: existing.extra.note ?? '',
        lines: (existing.extra.lines ?? []).map((l) => ({
          itemCode: l.itemCode,
          itemName: l.itemName,
          unit: l.unit ?? materialByCode.get(l.itemCode)?.extra?.units?.[0] ?? '',
          quantity: l.quantity,
        })),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, existing]);

  useEffect(() => {
    if (isEdit || !copyFrom || copySeededRef.current) return;
    copySeededRef.current = true;
    form.setFieldValue('reference', copyFrom.extra.reference ?? '');
    form.setFieldValue('assignedTo', copyFrom.extra.assignedTo ?? '');
    form.setFieldValue('note', copyFrom.extra.note ?? '');
    form.setFieldValue(
      'lines',
      (copyFrom.extra.lines ?? []).map((l) => ({
        itemCode: l.itemCode,
        itemName: l.itemName,
        unit: l.unit ?? materialByCode.get(l.itemCode)?.extra?.units?.[0] ?? '',
        quantity: l.quantity,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, copyFrom]);

  useEffect(() => {
    if (isEdit || !seedMaterialCodes?.length || materialSeededRef.current) return;
    if (!materialsInitialized) return;
    materialSeededRef.current = true;
    const seeded = seedMaterialCodes
      .map((code) => materialByCode.get(code))
      .filter((m): m is Material => !!m && !m.extra?.isDeleted)
      .map((m) => ({
        itemCode: m.code,
        itemName: m.name,
        unit: m.extra?.units?.[0] ?? '',
        quantity: '' as const,
      }));
    if (seeded.length === 0) return;
    form.setFieldValue('lines', seeded);
    focusFirstQuantityRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, seedMaterialCodes, materialsInitialized, materialByCode]);

  useEffect(() => {
    if (isEdit && initialized && !existing && !seededRef.current) {
      navigate(kind.routes.LIST, { replace: true });
    }
  }, [isEdit, initialized, existing, navigate, kind]);

  useEffect(() => {
    if (
      isEdit &&
      existing &&
      kind.postInventoryEnabled() &&
      existing.extra.status === 'confirmed'
    ) {
      navigate(kind.routes.DETAIL.replace(':id', existing.id), { replace: true });
    }
  }, [isEdit, existing, kind, navigate]);

  const addLine = () => {
    focusNewLineRef.current = true;
    form.setFieldValue('lines', [
      ...form.values.lines,
      { itemCode: '', itemName: '', unit: '', quantity: '' },
    ]);
  };

  useEffect(() => {
    if (focusNewLineRef.current) {
      focusNewLineRef.current = false;
      materialSelectRefs.current[form.values.lines.length - 1]?.focus();
    } else if (focusFirstQuantityRef.current) {
      focusFirstQuantityRef.current = false;
      quantityInputRefs.current[0]?.focus();
    }
  }, [form.values.lines.length]);
  const removeLine = (idx: number) =>
    form.setFieldValue(
      'lines',
      form.values.lines.filter((_, i) => i !== idx),
    );

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      const lines = values.lines
        .filter((l) => l.itemCode && l.quantity !== '' && Number(l.quantity) > 0)
        .map((l) => ({
          itemCode: l.itemCode,
          itemName: l.itemName,
          unit: l.unit,
          quantity: Number(l.quantity),
        }));

      setLoading(true);
      try {
        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Document snapshot missing');
          const dateChanged = snapshot.recordDate !== values.recordDate;
          const updated = await bundle.updateSafely({
            id,
            version: snapshot.version,
            partitionKey: snapshot.recordDate,
            ...(dateChanged && { newPartitionKey: values.recordDate }),
            patch: {
              recordDate: values.recordDate,
              extra: {
                ...snapshot.extra,
                code: values.code,
                reference: values.reference.trim() || undefined,
                assignedTo: values.assignedTo || undefined,
                note: values.note.trim(),
                lines,
              },
            },
          });
          snapshotRef.current = updated;
          notifications.show({
            color: 'green',
            message: t('warehouseDoc.notifications.updateSuccess'),
          });
          navigate(kind.routes.DETAIL.replace(':id', id));
        } else {
          const baseSeq = docsOnDay(values.recordDate);
          let created: WarehouseDocRow | null = null;
          for (let attempt = 0; attempt <= MAX_DOC_CODE_RETRIES; attempt++) {
            const code = buildDocCode(kind, values.recordDate, baseSeq + attempt);
            try {
              created = await bundle.createSafely({
                partitionKey: values.recordDate,
                item: {
                  recordDate: values.recordDate,
                  extra: {
                    code,
                    ...(kind.postInventoryEnabled() && { status: 'draft' as const }),
                    reference: values.reference.trim() || undefined,
                    assignedTo: values.assignedTo || undefined,
                    note: values.note.trim(),
                    lines,
                  },
                },
              });
              break;
            } catch (err) {
              if (isDuplicateDocCodeError(err) && attempt < MAX_DOC_CODE_RETRIES) continue;
              throw err;
            }
          }
          if (!created) throw new Error('Failed to allocate a unique document code');
          notifications.show({
            color: 'green',
            message: t('warehouseDoc.notifications.createSuccess'),
          });
          navigate(kind.routes.DETAIL.replace(':id', created.id));
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as WarehouseDocRow;
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else if (isDuplicateDocCodeError(err)) {
          notifications.show({
            color: 'red',
            title: t('warehouseDoc.notifications.duplicateCode'),
            message: t('warehouseDoc.notifications.duplicateCodeMessage'),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: isEdit
              ? t('warehouseDoc.notifications.updateError')
              : t('warehouseDoc.notifications.createError'),
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, bundle, kind, t, navigate, docsOnDay],
  );

  if (isEdit && initialized && !existing) return null;

  const pageTitle = isEdit ? t('warehouseDoc.editItem') : t('warehouseDoc.addItem');

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

      <Title order={isMobile ? 4 : 3}>
        {pageTitle} · {t(`${kind.i18nPrefix}.title`)}
      </Title>
      {!isEdit && copyFrom && (
        <Text size="sm" c="dimmed" mt={-8}>
          {t('warehouseDoc.copiedFrom', { code: copyFrom.extra.code })}
        </Text>
      )}
      {/* Counts the lines that actually seeded, not the codes asked for — a
          deleted material resolves to nothing and shouldn't be claimed. */}
      {!isEdit && !copyFrom && !!seedMaterialCodes?.length && form.values.lines.length > 0 && (
        <Text size="sm" c="dimmed" mt={-8}>
          {t('warehouseDoc.seededFromMaterials', { count: form.values.lines.length })}
        </Text>
      )}

      {}
      <Form form={form} onSubmit={handleSubmit}>
        <Stack gap="md">
          <Card withBorder radius="md" padding="lg">
            <Group gap="xs" mb="xs">
              <ThemeIcon size={28} radius="md" variant="light" color="primary">
                <kind.icon size={16} stroke={1.75} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                {t('warehouseDoc.form.headerSection')}
              </Text>
            </Group>
            <Divider mb="md" />
            <Group grow align="flex-start">
              <DateField
                label={t('warehouseDoc.columns.date')}
                withAsterisk
                clearable={false}
                {...form.getInputProps('recordDate')}
              />
              <TextInput
                label={t('common.labels.code')}
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
            </Group>
            <Group grow align="flex-start" mt="md">
              <TextInput
                label={t('common.labels.reference')}
                {...form.getInputProps('reference')}
              />
              <EmployeeSelector
                label={t('common.labels.assignedTo')}
                placeholder={t('common.labels.assignedTo')}
                clearable
                value={form.values.assignedTo || null}
                onChange={(sel) => form.setFieldValue('assignedTo', sel?.id ?? '')}
              />
            </Group>
            <Textarea
              mt="md"
              label={t('__new__.01-common.labels.note')}
              placeholder={t('warehouseDoc.form.notePlaceholder')}
              autosize
              minRows={2}
              maxRows={5}
              {...form.getInputProps('note')}
            />
          </Card>

          <Card withBorder radius="md" padding="lg">
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm">
                {t('warehouseDoc.form.linesLabel')}
              </Text>
              <Button
                size="compact-sm"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={addLine}
              >
                {t('warehouseDoc.form.addLine')}
              </Button>
            </Group>
            <Divider mb="md" />
            {form.values.lines.length === 0 ? (
              <Text size="sm" c="dimmed" fs="italic">
                {t('warehouseDoc.form.noLines')}
              </Text>
            ) : (
              <Table verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('warehouseDoc.form.materialLabel')}</Table.Th>
                    <Table.Th w={150}>{t('common.labels.onHand')}</Table.Th>
                    <Table.Th w={140}>{t('warehouseDoc.form.quantityLabel')}</Table.Th>
                    <Table.Th w={120}>{t('warehouseDoc.form.unitLabel')}</Table.Th>
                    <Table.Th w={40} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {form.values.lines.map((line, idx) => {
                    const material = materialByCode.get(line.itemCode);
                    const materialUnits = material?.extra?.units ?? [];
                    const isMultiUnit = materialUnits.length > 1;
                    const inv = line.itemCode ? invByCode.get(line.itemCode) : undefined;
                    const onHandText = inv
                      ? formatOnHandHint(inv, materialUnits[0], isMultiUnit, unitLabels)
                      : null;
                    return (
                      <Table.Tr key={idx}>
                        <Table.Td>
                          <Select
                            ref={(el) => {
                              materialSelectRefs.current[idx] = el;
                            }}
                            data={materialOptions}
                            searchable
                            placeholder={t('warehouseDoc.form.materialPlaceholder')}
                            comboboxProps={{ withinPortal: true }}
                            value={line.itemCode || null}
                            onChange={(v) => {
                              const m = v ? materialByCode.get(v) : undefined;
                              form.setFieldValue(`lines.${idx}.itemCode`, v ?? '');
                              form.setFieldValue(`lines.${idx}.itemName`, m?.name ?? '');

                              form.setFieldValue(`lines.${idx}.unit`, m?.extra?.units?.[0] ?? '');
                            }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c={inv && inv.onHand < 0 ? 'red' : 'dimmed'}>
                            {onHandText ?? '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            ref={(el) => {
                              quantityInputRefs.current[idx] = el;
                            }}
                            min={0}
                            thousandSeparator=","
                            placeholder="0"
                            {...form.getInputProps(`lines.${idx}.quantity`)}
                          />
                        </Table.Td>
                        <Table.Td>
                          {isMultiUnit ? (
                            <Select
                              data={materialUnits.map((u) => ({
                                value: u,
                                label: lookupLabelOf(unitLabels, u, u),
                              }))}
                              comboboxProps={{ withinPortal: true }}
                              allowDeselect={false}
                              value={line.unit || null}
                              onChange={(v) => form.setFieldValue(`lines.${idx}.unit`, v ?? '')}
                            />
                          ) : (
                            <Text size="sm" c="dimmed">
                              {line.unit ? lookupLabelOf(unitLabels, line.unit, line.unit) : '—'}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon color="red" variant="subtle" onClick={() => removeLine(idx)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </Card>

          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              size="sm"
              disabled={loading}
              onClick={() => navigate(kind.routes.LIST)}
            >
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button type="submit" loading={loading} size="sm">
              {isEdit ? t('__new__.01-common.actions.save') : t('__new__.01-common.actions.save')}
            </Button>
          </Group>
        </Stack>
      </Form>
    </Stack>
  );
}
