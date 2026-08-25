import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconFileInvoice,
  IconHash,
  IconLock,
  IconPhoto,
  IconPlus,
  IconStairs,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import { device } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { CustomerSelector } from '@/components/selectors/CustomerSelector';
import { EmployeeSelector, ProductSelector } from '@/components/selectors';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useProductStore } from '@/stores/useProductStore';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { getCompanyInfos } from '@/config/companyInfo';
import { useInitFormFromFetch } from '@/hooks/useInitFormFromFetch';
import {
  getProductDefaultUnitPrice,
  getProductSuggestedPrice,
  isBelowSuggestedPrice,
} from '@/utils/productPricing';
import { formatNumber } from '@/utils/number';
import { useLookupV2Labels, lookupLabelOf } from '@/hooks';
import {
  getSalesOrderPicDepartments,
  hasImagesForProducts,
  isQuotationTierPricingEnabled,
  makeEmployeeDepartmentFilter,
  perms,
} from '@/utils/permission';
import { quotationBundle, useQuotationStore } from './useQuotationStore';
import { QUOTATION_DEFAULT_NOTE } from './quotationClientConfig';
import {
  buildQuotationCode,
  isDuplicateQuotationCodeError,
  MAX_QUOTATION_CODE_RETRIES,
} from './code';
import {
  isQuotationEditable,
  normalizePriceTiers,
  quotationTotal,
  resolveTierPrice,
  type Quotation,
  type QuotationExtra,
  type QuotationPriceTier,
} from './types';
import { Form } from '@/components/Form';

const isMobile = device.isMobile;

const picEmployeeFilter = makeEmployeeDepartmentFilter(getSalesOrderPicDepartments());

const showPriceTiers = isQuotationTierPricingEnabled();

type FormLine = {
  productCode: string;
  productName: string;
  unit: string;
  quantity: number | '';
  unitPrice: number | '';

  priceTiers: QuotationPriceTier[];
};

type TierDraft = { minQuantity: number | ''; unitPrice: number | '' };
type FormValues = {
  customerId: string;
  customerName: string;
  assignedStaff: string;

  companyId: string;
  note: string;
  lines: FormLine[];
};

function detailRoute(id: string): string {
  return ROUTES.QUOTATIONS.DETAIL.replace(':id', id);
}

const emptyLine: FormLine = {
  productCode: '',
  productName: '',
  unit: '',
  quantity: 1,
  unitPrice: '',
  priceTiers: [],
};

function toFormLine(l: {
  productCode: string;
  productName: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  priceTiers?: QuotationPriceTier[];
}): FormLine {
  return {
    productCode: l.productCode,
    productName: l.productName,
    unit: l.unit ?? '',
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    priceTiers: l.priceTiers ?? [],
  };
}

function extractCopyFrom(state: unknown): Quotation | null {
  if (state == null || typeof state !== 'object') return null;
  const copyFrom = (state as { copyFrom?: unknown }).copyFrom;
  if (copyFrom == null || typeof copyFrom !== 'object') return null;
  return copyFrom as Quotation;
}

export function QuotationForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const copyFrom = !isEdit ? extractCopyFrom(location.state) : null;

  const customers = useCustomerStore((s) => s.items);
  const customersInitialized = useCustomerStore((s) => s.initialized);
  const loadCustomers = useCustomerStore((s) => s.loadAll);
  useEffect(() => {
    if (!customersInitialized) loadCustomers();
  }, [customersInitialized, loadCustomers]);

  const employeesInitialized = useEmployeeStore((s) => s.initialized);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);
  useEffect(() => {
    if (!employeesInitialized) loadEmployees();
  }, [employeesInitialized, loadEmployees]);

  const products = useProductStore((s) => s.items);
  const productByCode = useMemo(() => {
    const m = new Map<string, (typeof products)[number]>();
    for (const p of products) m.set(p.code, p);
    return m;
  }, [products]);

  const showProductPhoto = hasImagesForProducts();

  const companies = useMemo(() => getCompanyInfos(), []);
  const defaultCompanyId = companies[0]?.id ?? '';
  const companyOptions = useMemo(
    () =>
      companies.map((c, i) => ({
        value: c.id,
        label: c.name || c.address || `${t('quotations.form.companyLabel')} ${i + 1}`,
      })),
    [companies, t],
  );

  const showCompanyPicker = companies.length > 1;

  const unitLabels = useLookupV2Labels('unit');

  const storeInitialized = useQuotationStore((s) => s.initialized);
  const loadQuotations = useQuotationStore((s) => s.loadAll);
  useEffect(() => {
    if (!storeInitialized) loadQuotations();
  }, [storeInitialized, loadQuotations]);

  const [loading, setLoading] = useState(false);

  const [seeded, setSeeded] = useState(false);

  const [editCode, setEditCode] = useState('');
  const snapshotRef = useRef<Quotation | null>(null);

  const form = useForm<FormValues>({
    initialValues: {
      customerId: '',
      customerName: '',
      assignedStaff: '',
      companyId: '',
      note: QUOTATION_DEFAULT_NOTE,
      lines: [],
    },
  });

  const resolveCustomerId = (code: string | undefined): string | undefined =>
    code ? useCustomerStore.getState().items.find((c) => c.code === code)?.id : undefined;

  useEffect(() => {
    if (isMobile || (isEdit ? !perms.salesOrder.canEdit() : !perms.salesOrder.canCreate())) {
      navigate(ROUTES.QUOTATIONS.LIST, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot route guard
  }, [isEdit]);

  const fetching = useInitFormFromFetch(
    form,
    id,
    async (id) => {
      await loadCustomers();
      const target =
        (useQuotationStore.getState().getById(id) as Quotation | undefined) ??
        (await quotationBundle.fetchById(id)).item;
      if (!target || target.extra.isDeleted) {
        navigate(ROUTES.QUOTATIONS.LIST, { replace: true });
        return null;
      }
      if (!isQuotationEditable(target.extra.status ?? 'draft')) {
        navigate(detailRoute(target.id), { replace: true });
        return null;
      }
      snapshotRef.current = target;
      setEditCode(target.extra.code);
      return {
        customerId: resolveCustomerId(target.extra.customerCode) ?? '',
        customerName: target.extra.customerName ?? '',
        assignedStaff: target.extra.assignedStaff ?? '',

        companyId: target.extra.companyId ?? '',
        note: target.extra.note ?? '',
        lines: (target.extra.lines ?? []).map(toFormLine),
      };
    },
    () => {
      notifications.show({ color: 'red', message: t('quotations.notifications.fetchError') });
      navigate(ROUTES.QUOTATIONS.LIST, { replace: true });
    },
  );

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    (async () => {
      if (copyFrom) {
        await loadCustomers();
        if (cancelled) return;
        form.setValues({
          customerId: resolveCustomerId(copyFrom.extra.customerCode) ?? '',
          customerName: copyFrom.extra.customerName ?? '',
          assignedStaff: copyFrom.extra.assignedStaff ?? getCurrentEmployeeId() ?? '',
          companyId: copyFrom.extra.companyId ?? defaultCompanyId,
          note: copyFrom.extra.note ?? '',
          lines: (copyFrom.extra.lines ?? []).map(toFormLine),
        });
      } else {
        const me = getCurrentEmployeeId();
        if (me) form.setFieldValue('assignedStaff', me);
        if (defaultCompanyId) form.setFieldValue('companyId', defaultCompanyId);
      }
      if (!cancelled) setSeeded(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot copy/create seed
  }, [isEdit]);

  const addLine = () => form.setFieldValue('lines', [...form.values.lines, { ...emptyLine }]);
  const removeLine = (idx: number) =>
    form.setFieldValue(
      'lines',
      form.values.lines.filter((_, i) => i !== idx),
    );

  const [tierEditor, setTierEditor] = useState<{ index: number; rows: TierDraft[] } | null>(null);

  const applyTierPrice = (idx: number, tiers: QuotationPriceTier[], quantity: number) => {
    const price = resolveTierPrice(tiers, quantity);
    if (price !== undefined) form.setFieldValue(`lines.${idx}.unitPrice`, price);
  };

  const handleQuantityChange = (idx: number, value: number | string) => {
    const next = value === '' ? '' : Number(value);
    form.setFieldValue(`lines.${idx}.quantity`, next);
    const tiers = form.values.lines[idx]?.priceTiers ?? [];
    if (tiers.length > 0 && next !== '') applyTierPrice(idx, tiers, Number(next));
  };

  const openTierEditor = (idx: number) => {
    const tiers = form.values.lines[idx]?.priceTiers ?? [];
    setTierEditor({
      index: idx,
      rows: tiers.length > 0 ? tiers.map((t) => ({ ...t })) : [{ minQuantity: '', unitPrice: '' }],
    });
  };

  const saveTierEditor = () => {
    if (!tierEditor) return;
    const { index, rows } = tierEditor;
    const tiers = normalizePriceTiers(
      rows.map((r) => ({
        minQuantity: r.minQuantity === '' ? 0 : Number(r.minQuantity),
        unitPrice: r.unitPrice === '' ? -1 : Number(r.unitPrice),
      })),
    );
    form.setFieldValue(`lines.${index}.priceTiers`, tiers);
    const qty = form.values.lines[index]?.quantity;
    if (tiers.length > 0 && qty !== '' && qty !== undefined)
      applyTierPrice(index, tiers, Number(qty));
    setTierEditor(null);
  };

  const totalPreview = useMemo(
    () =>
      quotationTotal(
        form.values.lines.map((l) => ({
          productCode: l.productCode,
          productName: l.productName,
          quantity: l.quantity === '' ? 0 : Number(l.quantity),
          unitPrice: l.unitPrice === '' ? 0 : Number(l.unitPrice),
        })),
      ),
    [form.values.lines],
  );

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      const lines = values.lines
        .filter((l) => l.productCode)
        .map((l) => {
          const tiers = normalizePriceTiers(l.priceTiers);
          return {
            productCode: l.productCode,
            productName: l.productName,
            ...(l.unit && { unit: l.unit }),
            quantity: l.quantity === '' ? 0 : Number(l.quantity),
            unitPrice: l.unitPrice === '' ? 0 : Number(l.unitPrice),
            ...(tiers.length > 0 && { priceTiers: tiers }),
          };
        });
      if (lines.length === 0) {
        notifications.show({ color: 'red', message: t('quotations.validation.linesRequired') });
        return;
      }

      const selectedCustomer = values.customerId
        ? customers.find((c) => c.id === values.customerId)
        : undefined;
      const customerCode = selectedCustomer?.code;
      const customerName =
        selectedCustomer?.extra?.shortName?.trim() ||
        selectedCustomer?.name ||
        values.customerName.trim() ||
        undefined;

      setLoading(true);
      try {
        if (isEdit && id) {
          const snapshot = snapshotRef.current;
          if (!snapshot) throw new Error('Quotation snapshot missing');
          const extra: QuotationExtra = {
            ...snapshot.extra,
            ...(customerCode ? { customerCode } : { customerCode: undefined }),
            ...(customerName ? { customerName } : { customerName: undefined }),
            assignedStaff: values.assignedStaff || undefined,
            companyId: values.companyId || undefined,
            note: values.note.trim() || undefined,
            lines,
          };

          const updated = (await quotationBundle.updateSafely({
            id,
            version: snapshot.version,
            patch: { extra },
          })) as Quotation;
          snapshotRef.current = updated;
          notifications.show({
            color: 'green',
            message: t('quotations.notifications.updateSuccess'),
          });
          navigate(detailRoute(id));
        } else {
          const attempted: string[] = [];
          let created: Quotation | null = null;
          for (let attempt = 0; attempt <= MAX_QUOTATION_CODE_RETRIES; attempt++) {
            const existing = useQuotationStore.getState().items as Quotation[];
            const code = buildQuotationCode(existing, attempted);
            const extra: QuotationExtra = {
              code,
              status: 'draft',
              ...(customerCode && { customerCode }),
              ...(customerName && { customerName }),
              ...(values.assignedStaff && { assignedStaff: values.assignedStaff }),
              ...(values.companyId && { companyId: values.companyId }),
              ...(values.note.trim() && { note: values.note.trim() }),
              lines,
            };
            try {
              created = (await quotationBundle.createSafely({
                item: { extra },
              })) as Quotation;
              break;
            } catch (err) {
              if (isDuplicateQuotationCodeError(err) && attempt < MAX_QUOTATION_CODE_RETRIES) {
                attempted.push(code);
                continue;
              }
              throw err;
            }
          }
          if (!created) throw new Error('Failed to allocate a unique quotation code');
          notifications.show({
            color: 'green',
            message: t('quotations.notifications.createSuccess'),
          });
          navigate(detailRoute(created.id));
        }
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) snapshotRef.current = err.latest as Quotation;
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: isDuplicateQuotationCodeError(err)
              ? t('quotations.notifications.duplicateCode')
              : isEdit
                ? t('quotations.notifications.updateError')
                : t('quotations.notifications.createError'),
            autoClose: 8000,
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [isEdit, id, customers, t, navigate],
  );

  if (isEdit ? fetching : !seeded) return null;

  return (
    <>
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
          {isEdit ? t('quotations.editTitle') : t('quotations.newTitle')}
        </Title>
        {!isEdit && copyFrom && (
          <Text size="sm" c="dimmed" mt={-8}>
            {t('quotations.copiedFrom', { code: copyFrom.extra.code })}
          </Text>
        )}

        {}
        <Form form={form} onSubmit={handleSubmit}>
          <Stack gap="md">
            <Card withBorder radius="md" padding="lg">
              <Group gap="xs" mb="xs">
                <ThemeIcon size={28} radius="md" variant="light" color="primary">
                  <IconFileInvoice size={16} stroke={1.75} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  {t('quotations.form.headerSection')}
                </Text>
              </Group>
              <Divider mb="md" />
              <Group grow align="flex-start">
                <CustomerSelector
                  label={t('quotations.form.customerLabel')}
                  placeholder={t('quotations.form.customerPlaceholder')}
                  value={form.values.customerId || null}
                  comboboxProps={{ withinPortal: true }}
                  onChange={(sel) => {
                    form.setFieldValue('customerId', sel?.id ?? '');
                    form.setFieldValue('customerName', sel?.name ?? '');
                  }}
                />
                <EmployeeSelector
                  label={t('salesOrders.form.assignedStaffLabel')}
                  placeholder={t('salesOrders.form.assignedStaffPlaceholder')}
                  clearable
                  filter={picEmployeeFilter}
                  value={form.values.assignedStaff || null}
                  comboboxProps={{ withinPortal: true }}
                  onChange={(sel) => form.setFieldValue('assignedStaff', sel?.id ?? '')}
                />
                {showCompanyPicker && (
                  <Select
                    label={t('quotations.form.companyLabel')}
                    placeholder={t('quotations.form.companyPlaceholder')}
                    data={companyOptions}
                    value={form.values.companyId || null}
                    comboboxProps={{ withinPortal: true }}
                    onChange={(v) => form.setFieldValue('companyId', v ?? '')}
                  />
                )}
                {isEdit && editCode && (
                  <TextInput
                    label={t('common.labels.code')}
                    leftSection={<IconHash size={14} />}
                    rightSection={<IconLock size={14} color="var(--mantine-color-dimmed)" />}
                    value={editCode}
                    readOnly
                    styles={{
                      input: {
                        fontFamily: 'var(--mantine-font-family-monospace)',
                        backgroundColor: 'var(--mantine-color-default-hover)',
                        cursor: 'not-allowed',
                      },
                    }}
                  />
                )}
              </Group>
              <Textarea
                mt="md"
                label={t('quotations.form.note')}
                autosize
                minRows={2}
                maxRows={5}
                {...form.getInputProps('note')}
              />
            </Card>

            <Card withBorder radius="md" padding="lg">
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="sm">
                  {t('quotations.form.linesLabel')}
                </Text>
                <Button
                  size="compact-sm"
                  variant="light"
                  leftSection={<IconPlus size={14} />}
                  onClick={addLine}
                >
                  {t('quotations.form.addLine')}
                </Button>
              </Group>
              <Divider mb="md" />
              {form.values.lines.length === 0 ? (
                <Text size="sm" c="dimmed" fs="italic">
                  {t('quotations.form.noLines')}
                </Text>
              ) : (
                <Table verticalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('quotations.form.productLabel')}</Table.Th>
                      <Table.Th w={90}>{t('quotations.form.quantityLabel')}</Table.Th>
                      <Table.Th w={110}>{t('quotations.form.unitLabel')}</Table.Th>
                      <Table.Th w={showPriceTiers ? 210 : 160}>
                        {t('quotations.form.priceLabel')}
                      </Table.Th>
                      <Table.Th w={140} style={{ textAlign: 'right' }}>
                        {t('quotations.form.amountLabel')}
                      </Table.Th>
                      <Table.Th w={40} />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {form.values.lines.map((line, idx) => {
                      const lineProduct = line.productCode
                        ? productByCode.get(line.productCode)
                        : undefined;
                      const priceNum = line.unitPrice === '' ? undefined : Number(line.unitPrice);
                      const qtyNum = line.quantity === '' ? 0 : Number(line.quantity);

                      const productUnits = lineProduct?.extra?.units?.length
                        ? lineProduct.extra.units
                        : lineProduct?.unit
                          ? [lineProduct.unit]
                          : [];
                      const unitOptions = (
                        productUnits.length ? productUnits : line.unit ? [line.unit] : []
                      ).map((u) => ({ value: u, label: lookupLabelOf(unitLabels, u) }));
                      const suggestedPrice = getProductSuggestedPrice(lineProduct);
                      const belowSuggested =
                        priceNum !== undefined && isBelowSuggestedPrice(lineProduct, priceNum);
                      return (
                        <Table.Tr key={idx}>
                          <Table.Td>
                            <Group gap="sm" wrap="nowrap" align="center">
                              {showProductPhoto && (
                                <Avatar
                                  src={lineProduct?.extra?.images?.[0]?.url?.trim() ?? null}
                                  radius="sm"
                                  size={38}
                                  color="gray"
                                >
                                  <IconPhoto size={16} />
                                </Avatar>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <ProductSelector
                                  code={line.productCode || null}
                                  name={line.productName || null}
                                  comboboxProps={{ withinPortal: true }}
                                  placeholder={t('quotations.form.productPlaceholder')}
                                  onChange={(sel) => {
                                    form.setFieldValue(`lines.${idx}.productCode`, sel?.code ?? '');
                                    form.setFieldValue(`lines.${idx}.productName`, sel?.name ?? '');
                                    form.setFieldValue(`lines.${idx}.unit`, sel?.units[0] ?? '');

                                    form.setFieldValue(`lines.${idx}.priceTiers`, []);
                                    if (sel) {
                                      form.setFieldValue(
                                        `lines.${idx}.unitPrice`,
                                        getProductDefaultUnitPrice(sel.product),
                                      );
                                    }
                                  }}
                                />
                              </div>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              min={0}
                              thousandSeparator=","
                              placeholder="0"
                              {...form.getInputProps(`lines.${idx}.quantity`)}
                              onChange={(v) => handleQuantityChange(idx, v)}
                            />
                          </Table.Td>
                          <Table.Td>
                            <Select
                              data={unitOptions}
                              value={line.unit || null}
                              onChange={(v) => form.setFieldValue(`lines.${idx}.unit`, v ?? '')}
                              placeholder="—"
                              allowDeselect={false}
                              disabled={!line.productCode}
                              comboboxProps={{ withinPortal: true }}
                            />
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              <Group gap={4} wrap="nowrap" align="flex-start">
                                <NumberInput
                                  style={{ flex: 1, minWidth: 0 }}
                                  min={0}
                                  thousandSeparator=","
                                  placeholder="0"
                                  {...form.getInputProps(`lines.${idx}.unitPrice`)}
                                  styles={
                                    belowSuggested
                                      ? {
                                          input: {
                                            borderColor: 'var(--mantine-color-orange-5)',
                                            color: 'var(--mantine-color-orange-7)',
                                          },
                                        }
                                      : undefined
                                  }
                                />
                                {showPriceTiers && (
                                  <Tooltip label={t('quotations.form.priceTiers.editTooltip')}>
                                    <ActionIcon
                                      variant={line.priceTiers.length > 0 ? 'filled' : 'light'}
                                      color={line.priceTiers.length > 0 ? 'primary' : 'gray'}
                                      size="lg"
                                      disabled={!line.productCode}
                                      onClick={() => openTierEditor(idx)}
                                    >
                                      <IconStairs size={16} />
                                    </ActionIcon>
                                  </Tooltip>
                                )}
                              </Group>
                              {showPriceTiers && line.priceTiers.length > 0 && (
                                <Badge size="xs" variant="light" radius="sm">
                                  {t('quotations.form.priceTiers.count', {
                                    count: line.priceTiers.length,
                                  })}
                                </Badge>
                              )}
                              {belowSuggested && suggestedPrice !== undefined && (
                                <Text size="xs" c="orange.7" lh={1.2}>
                                  {t('quotations.form.belowSuggestedPriceHint', {
                                    price: suggestedPrice.toLocaleString(),
                                  })}
                                </Text>
                              )}
                            </Stack>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text fw={600}>{formatNumber(qtyNum * (priceNum ?? 0))}</Text>
                          </Table.Td>
                          <Table.Td>
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() => removeLine(idx)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              )}
              {form.values.lines.length > 0 && (
                <Group justify="flex-end" mt="md" gap="xs">
                  <Text size="sm" c="dimmed">
                    {t('quotations.form.totalLabel')}:
                  </Text>
                  <Text fw={700}>{formatNumber(totalPreview)}</Text>
                </Group>
              )}
            </Card>

            <Group justify="flex-end" gap="sm">
              <Button
                variant="default"
                size="sm"
                disabled={loading}
                onClick={() => window.history.back()}
              >
                {t('__new__.01-common.actions.cancel')}
              </Button>
              <Button type="submit" loading={loading} size="sm">
                {t('__new__.01-common.actions.save')}
              </Button>
            </Group>
          </Stack>
        </Form>
      </Stack>

      {/* MOQ price-ladder editor — one line at a time. Rungs are normalised
          (sorted, de-duplicated, invalid rows dropped) on save, so the operator
          can type them in any order. */}
      <Modal
        opened={tierEditor !== null}
        onClose={() => setTierEditor(null)}
        title={t('quotations.form.priceTiers.modalTitle')}
        size="md"
      >
        {tierEditor && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {t('quotations.form.priceTiers.modalHint')}
            </Text>
            <Stack gap="xs">
              {tierEditor.rows.map((row, ri) => (
                <Group key={ri} gap="xs" wrap="nowrap" align="flex-end">
                  <NumberInput
                    style={{ flex: 1 }}
                    label={ri === 0 ? t('quotations.form.priceTiers.minQuantity') : undefined}
                    min={1}
                    thousandSeparator=","
                    placeholder="0"
                    value={row.minQuantity}
                    onChange={(v) =>
                      setTierEditor({
                        ...tierEditor,
                        rows: tierEditor.rows.map((r, i) =>
                          i === ri ? { ...r, minQuantity: v === '' ? '' : Number(v) } : r,
                        ),
                      })
                    }
                  />
                  <NumberInput
                    style={{ flex: 1 }}
                    label={ri === 0 ? t('quotations.form.priceLabel') : undefined}
                    min={0}
                    thousandSeparator=","
                    placeholder="0"
                    value={row.unitPrice}
                    onChange={(v) =>
                      setTierEditor({
                        ...tierEditor,
                        rows: tierEditor.rows.map((r, i) =>
                          i === ri ? { ...r, unitPrice: v === '' ? '' : Number(v) } : r,
                        ),
                      })
                    }
                  />
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    size="lg"
                    onClick={() =>
                      setTierEditor({
                        ...tierEditor,
                        rows: tierEditor.rows.filter((_, i) => i !== ri),
                      })
                    }
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
            <Button
              size="compact-sm"
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={() =>
                setTierEditor({
                  ...tierEditor,
                  rows: [...tierEditor.rows, { minQuantity: '', unitPrice: '' }],
                })
              }
            >
              {t('quotations.form.priceTiers.addTier')}
            </Button>
            <Group justify="flex-end" gap="sm">
              <Button variant="default" size="sm" onClick={() => setTierEditor(null)}>
                {t('__new__.01-common.actions.cancel')}
              </Button>
              <Button size="sm" onClick={saveTierEditor}>
                {t('__new__.01-common.actions.save')}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
