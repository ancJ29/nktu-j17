import {
  ActionIcon,
  Avatar,
  Button,
  Card,
  Divider,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
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
import {
  getProductDefaultUnitPrice,
  getProductSuggestedPrice,
  isBelowSuggestedPrice,
} from '@/utils/productPricing';
import { formatNumber } from '@/utils/number';
import { useLookupLabels, lookupLabelOf } from '@/hooks';
import {
  getSalesOrderPicDepartments,
  hasImagesForProducts,
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
import { quotationTotal, type Quotation, type QuotationExtra } from './types';

const isMobile = device.isMobile;

const picEmployeeFilter = makeEmployeeDepartmentFilter(getSalesOrderPicDepartments());

type FormLine = {
  productCode: string;
  productName: string;
  unit: string;
  quantity: number | '';
  unitPrice: number | '';
};
type FormValues = {
  customerId: string;
  customerName: string;
  assignedStaff: string;
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
};

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
  
  const unitLabels = useLookupLabels('unit');

  
  const storeInitialized = useQuotationStore((s) => s.initialized);
  const loadQuotations = useQuotationStore((s) => s.loadAll);
  useEffect(() => {
    if (!storeInitialized) loadQuotations();
  }, [storeInitialized, loadQuotations]);

  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  
  
  
  const [editCode, setEditCode] = useState('');
  const snapshotRef = useRef<Quotation | null>(null);

  const form = useForm<FormValues>({
    initialValues: {
      customerId: '',
      customerName: '',
      assignedStaff: '',
      note: QUOTATION_DEFAULT_NOTE,
      lines: [],
    },
  });

  
  
  const resolveCustomerId = (code: string | undefined): string | undefined =>
    code ? customers.find((c) => c.code === code)?.id : undefined;

  
  useEffect(() => {
    if (isMobile || (isEdit ? !perms.salesOrder.canEdit() : !perms.salesOrder.canCreate())) {
      navigate(ROUTES.QUOTATIONS.LIST, { replace: true });
      return;
    }
    
    
    
    
    if ((isEdit || copyFrom) && !customersInitialized) return;
    let cancelled = false;
    (async () => {
      if (isEdit && id) {
        try {
          const target =
            (useQuotationStore.getState().getById(id) as Quotation | undefined) ??
            (await quotationBundle.fetchById(id)).item;
          if (cancelled) return;
          if (!target || target.extra.isDeleted) {
            navigate(ROUTES.QUOTATIONS.LIST, { replace: true });
            return;
          }
          if (target.extra.status && target.extra.status !== 'draft') {
            
            navigate(detailRoute(target.id), { replace: true });
            return;
          }
          snapshotRef.current = target;
          setEditCode(target.extra.code);
          form.setValues({
            customerId: resolveCustomerId(target.extra.customerCode) ?? '',
            customerName: target.extra.customerName ?? '',
            assignedStaff: target.extra.assignedStaff ?? '',
            note: target.extra.note ?? '',
            lines: (target.extra.lines ?? []).map((l) => ({
              productCode: l.productCode,
              productName: l.productName,
              unit: l.unit ?? '',
              quantity: l.quantity,
              unitPrice: l.unitPrice,
            })),
          });
        } catch {
          notifications.show({
            color: 'red',
            message: t('quotations.notifications.fetchError'),
          });
          navigate(ROUTES.QUOTATIONS.LIST, { replace: true });
          return;
        }
      } else if (copyFrom) {
        form.setValues({
          customerId: resolveCustomerId(copyFrom.extra.customerCode) ?? '',
          customerName: copyFrom.extra.customerName ?? '',
          assignedStaff: copyFrom.extra.assignedStaff ?? getCurrentEmployeeId() ?? '',
          note: copyFrom.extra.note ?? '',
          lines: (copyFrom.extra.lines ?? []).map((l) => ({
            productCode: l.productCode,
            productName: l.productName,
            unit: l.unit ?? '',
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
        });
      } else {
        
        const me = getCurrentEmployeeId();
        if (me) form.setFieldValue('assignedStaff', me);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot load keyed on the route target (+ the customers gate)
  }, [id, isEdit, customersInitialized]);

  const addLine = () => form.setFieldValue('lines', [...form.values.lines, { ...emptyLine }]);
  const removeLine = (idx: number) =>
    form.setFieldValue(
      'lines',
      form.values.lines.filter((_, i) => i !== idx),
    );

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
        .map((l) => ({
          productCode: l.productCode,
          productName: l.productName,
          ...(l.unit && { unit: l.unit }),
          quantity: l.quantity === '' ? 0 : Number(l.quantity),
          unitPrice: l.unitPrice === '' ? 0 : Number(l.unitPrice),
        }));
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

  if (!ready) return null;

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
        {isEdit ? t('quotations.editTitle') : t('quotations.newTitle')}
      </Title>
      {!isEdit && copyFrom && (
        <Text size="sm" c="dimmed" mt={-8}>
          {t('quotations.copiedFrom', { code: copyFrom.extra.code })}
        </Text>
      )}

      {/* eslint-disable-next-line react-hooks/refs -- Mantine form.onSubmit() builds the submit handler during render by design. */}
      <form onSubmit={form.onSubmit(handleSubmit)}>
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
                    <Table.Th w={160}>{t('quotations.form.priceLabel')}</Table.Th>
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
                            <NumberInput
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
      </form>
    </Stack>
  );
}
