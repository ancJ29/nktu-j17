import {
  ActionIcon,
  Alert,
  Button,
  Collapse,
  Box,
  Divider,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCalendarEvent,
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconReceipt,
  IconShoppingCart,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useForm } from '@mantine/form';
import { Form } from '@/components/Form';
import { SectionCard } from '@/components/SectionCard';
import { DateTextField } from '@/components/DateField';
import { NumberField } from '@/components/NumberField';
import { isLiveRow } from '../pickerOptions';
import { ROUTES } from '@/constants/routes';
import {
  createSalesOrderV2,
  getSalesOrderV2ById,
  updateSalesOrderV2,
} from '@/stores/useSalesOrderV2Store';
import { useProductV2Store } from '@/stores/useProductV2Store';
import { useCustomerV2Store } from '@/stores/useCustomerV2Store';
import { useMaterialV2Store } from '@/stores/useMaterialV2Store';
import { featureFlags } from '@/config';
import { perms } from '@/utils/permission';
import { MasterDataQuickCreateModal } from '../master-data';
import { CUSTOMER_V2_SPEC } from '../customers/spec';
import { canSeePrice } from '../products/productV2Form';
import { formatNumber } from '@/utils/number';
import { isValidPhone } from '@/utils/phone';
import { useLineUnitLabel } from '../lineUnitLabel';
import { CustomerPicker } from './CustomerPicker';
import { ItemSearchBox, type SearchableItem } from '../ItemSearchBox';
import { CustomFieldInput } from '../CustomFieldInput';
import { LineItemCell, SummaryRow } from '../formBlocks';
import {
  ACTION_BAR_HEIGHT,
  ACTION_BAR_Z,
  STICKY_ACTION_BAR_TOP,
  STICKY_RAIL_TOP,
} from '../stickyChrome';
import { catalogUnitPrice } from './linePrice';
import { useSalesOrderLineStock } from './lineStock';
import { LineStockCell } from './LineStockCell';
import { salesOrderStageOf } from './statusFlow';
import { SalesOrderConfigAlerts } from './chrome';
import { useSalesOrderCustomFields } from './customFields';
import { customDraftOf, customFieldValueErrors, mergeCustomFieldExtra } from '@/utils/customFields';
import type {
  SalesOrderV2,
  SalesOrderV2CopyFrom,
  SalesOrderV2CopyLine,
  SalesOrderV2ItemType,
  SalesOrderV2LineInput,
} from '@/types/sales-order-v2';
import type { CustomerV2Row } from '@/types';

type LineDraft = {
  itemType: SalesOrderV2ItemType;
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string | undefined;
  quantity: number;

  unitPrice: number | undefined;
  note: string;
};

const lineKey = (line: { itemType: SalesOrderV2ItemType; itemId: string }) =>
  `${line.itemType}:${line.itemId}`;

const toLineDraft = (line: SalesOrderV2CopyLine): LineDraft => ({
  itemType: line.itemType ?? 'product',
  itemId: line.itemId,
  itemCode: line.itemCode ?? '',
  itemName: line.itemName ?? '',
  unit: line.unit,
  quantity: line.quantity,
  unitPrice: line.unitPrice,
  note: line.note ?? '',
});

const materialsOffered = featureFlags.materialsV2.enabled;

export function SalesOrderV2FormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);

  const location = useLocation();
  const copyFrom = editing
    ? undefined
    : (location.state as { copyFrom?: SalesOrderV2CopyFrom } | null)?.copyFrom;

  const products = useProductV2Store((s) => s.items);
  const loadProducts = useProductV2Store((s) => s.loadAll);
  const materials = useMaterialV2Store((s) => s.items);
  const loadMaterials = useMaterialV2Store((s) => s.loadAll);
  const customers = useCustomerV2Store((s) => s.items);
  const customersLoading = useCustomerV2Store((s) => s.loading);
  const loadCustomers = useCustomerV2Store((s) => s.loadAll);
  const unitLabelOf = useLineUnitLabel();

  const [order, setOrder] = useState<SalesOrderV2 | null>(null);
  const [day, setDay] = useState('');

  const [customerId, setCustomerId] = useState<string | null>(copyFrom?.customerId ?? null);
  const [customerName, setCustomerName] = useState(copyFrom?.customerName ?? '');
  const [customerPhone, setCustomerPhone] = useState(copyFrom?.customerPhone ?? '');
  const [customerAddress, setCustomerAddress] = useState(copyFrom?.customerAddress ?? '');

  const [contactFromProfile, setContactFromProfile] = useState(false);

  const [creatingCustomer, setCreatingCustomer] = useState<string | null>(null);
  const [orderDate, setOrderDate] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [reference, setReference] = useState(copyFrom?.reference ?? '');
  const [notes, setNotes] = useState(copyFrom?.notes ?? '');

  const [lines, setLines] = useState<LineDraft[]>(() => (copyFrom?.items ?? []).map(toLineDraft));

  const [highlightKey, setHighlightKey] = useState<string | null>(null);

  const pendingFocus = useRef<string | null>(null);
  const quantityRefs = useRef(new Map<string, HTMLInputElement>());
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());

  const [customDraft, setCustomDraft] = useState<Record<string, string>>(() =>
    customDraftOf(copyFrom?.extra),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [moreOpen, setMoreOpen] = useState(true);

  const { read: lineStock } = useSalesOrderLineStock();
  const customFields = useSalesOrderCustomFields();
  const editableFields = useMemo(
    () => customFields.filter((field) => field.editable),
    [customFields],
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, 'number' | 'date' | 'option'>>({});

  const moreSummary = [
    reference.trim() ? `${t('salesOrdersV2.form.reference')}: ${reference.trim()}` : '',
    ...customFields.map((field) => {
      const value = customDraft[field.key]?.trim();
      return value ? `${field.label}: ${value}` : '';
    }),
    notes.trim() ? `${t('salesOrdersV2.form.notes')}: ${notes.trim()}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const form = useForm({ initialValues: {} });

  useEffect(() => {
    void loadProducts();
    void loadCustomers();
    if (materialsOffered) void loadMaterials();
  }, [loadProducts, loadCustomers, loadMaterials]);

  useEffect(() => {
    if (!id) return;
    let live = true;
    getSalesOrderV2ById(id)
      .then(({ item, day: onDay }) => {
        if (!live) return;

        if (salesOrderStageOf(item.status) !== 'draft') {
          void navigate(ROUTES.SALES_ORDERS_V2.DETAIL.replace(':id', item.id), { replace: true });
          return;
        }
        setOrder(item);
        setDay(onDay);
        setCustomerId(item.customerId ?? null);

        setCustomerName(item.customerName ?? '');
        setCustomerPhone(item.customerPhone ?? '');
        setCustomerAddress(item.customerAddress ?? '');
        setOrderDate(item.orderDate ?? '');
        setRequestedDate(item.requestedDate ?? '');
        setReference(item.reference ?? '');
        setNotes(item.notes ?? '');

        setLines(
          item.items.map((line) => ({
            itemType: line.itemType,
            itemId: line.itemId,
            itemCode: line.itemCode,
            itemName: line.itemName,
            unit: line.unit,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            note: line.note ?? '',
          })),
        );
        setCustomDraft(customDraftOf(item.extra));
      })
      .catch(() => {
        if (live) void navigate(ROUTES.SALES_ORDERS_V2.LIST, { replace: true });
      });
    return () => {
      live = false;
    };
  }, [id, navigate]);

  const searchableItems = useMemo<SearchableItem[]>(() => {
    const fromProducts = products.filter(isLiveRow).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      unit: row.unit,
      price: row.price,
      itemType: 'product' as const,
    }));
    if (!materialsOffered) return fromProducts;
    return [
      ...fromProducts,
      ...materials.filter(isLiveRow).map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        unit: row.extra?.units?.[0],
        price: undefined,
        itemType: 'material' as const,
      })),
    ];
  }, [products, materials]);

  const inOrder = useMemo(() => new Set(lines.map(lineKey)), [lines]);

  const totalQuantity = useMemo(
    () =>
      lines.reduce((sum, line) => sum + (Number.isFinite(line.quantity) ? line.quantity : 0), 0),
    [lines],
  );

  const orderTotal = useMemo(() => {
    const priced = lines.filter((line) => line.unitPrice !== undefined);
    if (priced.length === 0) return undefined;
    return priced.reduce((sum, line) => sum + line.quantity * (line.unitPrice ?? 0), 0);
  }, [lines]);

  const setLine = useCallback((index: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }, []);

  const pickCustomer = useCallback((row: CustomerV2Row) => {
    setCustomerId(row.id);
    setCustomerName(row.name);
    setCustomerPhone(row.phone ?? '');
    setCustomerAddress(row.address ?? '');
    setContactFromProfile(true);
  }, []);

  const typeCustomer = useCallback((value: string) => {
    setCustomerId(null);
    setCustomerName(value);
    setContactFromProfile(false);
  }, []);

  const addItem = useCallback(
    (item: SearchableItem) => {
      const key = `${item.itemType}:${item.id}`;
      setLines((prev) => {
        const at = prev.findIndex((line) => lineKey(line) === key);
        if (at >= 0) {
          return prev.map((line, i) =>
            i === at ? { ...line, quantity: line.quantity + 1 } : line,
          );
        }
        return [
          ...prev,
          {
            itemType: item.itemType,
            itemId: item.id,
            itemCode: item.code,
            itemName: item.name,
            unit: item.unit,
            quantity: 1,
            unitPrice: catalogUnitPrice(item.itemType, item.id, products, canSeePrice),
            note: '',
          },
        ];
      });
      setHighlightKey(key);
      pendingFocus.current = key;
    },
    [products],
  );

  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    pendingFocus.current = null;
    const input = quantityRefs.current.get(key);
    input?.focus();
    input?.select();
    rowRefs.current.get(key)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    if (!highlightKey) return;
    const timer = setTimeout(() => setHighlightKey(null), 1400);
    return () => clearTimeout(timer);
  }, [highlightKey]);

  const submit = useCallback(async () => {
    const payload: SalesOrderV2LineInput[] = lines
      .filter((line) => line.itemId !== '')
      .map((line) => ({
        itemType: line.itemType,
        itemId: line.itemId,
        quantity: line.quantity,
        ...(line.unitPrice !== undefined ? { unitPrice: line.unitPrice } : {}),
        ...(line.note.trim() !== '' ? { note: line.note.trim() } : {}),
      }));

    const refuse = (message: string) => {
      setError(message);
      notifications.show({ color: 'red', message });
    };

    if (!customerId && customerName.trim() === '') {
      refuse(t('salesOrdersV2.validation.customerRequired'));
      return;
    }

    if (customerPhone.trim() !== '' && !isValidPhone(customerPhone)) {
      refuse(t('salesOrdersV2.validation.phoneInvalid'));
      return;
    }

    if (payload.length === 0) {
      refuse(t('salesOrdersV2.validation.itemsRequired'));
      return;
    }
    if (payload.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0)) {
      refuse(t('salesOrdersV2.validation.quantityPositive'));
      return;
    }

    if (payload.some((line) => line.unitPrice !== undefined && line.unitPrice < 0)) {
      refuse(t('salesOrdersV2.validation.unitPriceNonNegative'));
      return;
    }

    const badFields = customFieldValueErrors(editableFields, customDraft);
    setFieldErrors(badFields);
    if (Object.keys(badFields).length > 0) {
      refuse(t('salesOrdersV2.validation.customFields'));
      return;
    }

    const extra = mergeCustomFieldExtra(
      order?.extra ?? copyFrom?.extra,
      editableFields,
      customDraft,
    );

    const linkedId = customerId;
    const typedName = linkedId ? '' : customerName.trim();

    setError(null);
    setSaving(true);
    try {
      const saved =
        editing && order
          ? await updateSalesOrderV2(order, day, {
              customerId: linkedId,

              ...(linkedId === null ? { customerName: typedName } : {}),
              customerPhone,
              customerAddress,
              orderDate,
              requestedDate,
              reference,
              notes,
              items: payload,
              extra,
            })
          : await createSalesOrderV2({
              ...(linkedId ? { customerId: linkedId } : {}),
              ...(typedName ? { customerName: typedName } : {}),
              ...(customerPhone ? { customerPhone } : {}),
              ...(customerAddress ? { customerAddress } : {}),
              ...(orderDate ? { orderDate } : {}),
              ...(requestedDate ? { requestedDate } : {}),
              ...(reference ? { reference } : {}),
              ...(notes ? { notes } : {}),
              items: payload,
              ...(Object.keys(extra).length > 0 ? { extra } : {}),
            });
      notifications.show({
        color: 'green',
        message: editing
          ? t('salesOrdersV2.notifications.updateSuccess')
          : t('salesOrdersV2.notifications.createSuccess'),
      });
      void navigate(ROUTES.SALES_ORDERS_V2.DETAIL.replace(':id', saved.id));
    } catch {
      notifications.show({
        color: 'red',
        message: t('salesOrdersV2.notifications.writeError'),
      });
    } finally {
      setSaving(false);
    }
  }, [
    lines,
    editing,
    order,
    day,
    customerId,
    customerName,
    customerPhone,
    customerAddress,
    orderDate,
    requestedDate,
    reference,
    notes,
    navigate,
    t,
    editableFields,
    customDraft,
    copyFrom,
  ]);

  return (
    <Form form={form} onSubmit={() => void submit()}>
      <Stack gap="lg">
        {/* Heading and actions in one PINNED bar, and Save moves up into it.
            An order form is as long as the order, so a footer action row is
            reachable only by scrolling past every line — including on the
            forms where nothing below the fold needed reading. Pinned, the
            operator saves from wherever they are and always sees which order
            they are saving.

            OPAQUE and bordered on purpose: content scrolls underneath it, and
            a transparent bar would let a table row read as part of the title.

            The number rides the heading in edit mode. Without it the edit form
            is indistinguishable from every other edit form, and an operator
            who arrived from a list of near-identical orders has nothing on
            screen that says WHICH one they are about to overwrite. It appears
            only once the row has loaded — a placeholder would be the same
            missing answer, wearing a shape that says it is coming. */}
        <Box
          style={{
            position: 'sticky',
            top: STICKY_ACTION_BAR_TOP,
            zIndex: ACTION_BAR_Z,
            background: 'var(--mantine-color-body)',
            borderBottom: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <Group h={ACTION_BAR_HEIGHT} justify="space-between" wrap="nowrap" gap="md">
            <Group gap="sm" align="baseline" wrap="nowrap" style={{ minWidth: 0 }}>
              <Title order={3} style={{ whiteSpace: 'nowrap' }}>
                {editing ? t('salesOrdersV2.editItem') : t('salesOrdersV2.addItem')}
              </Title>
              {editing && order && (
                <Text size="lg" fw={600} c="dimmed" truncate>
                  {order.orderNumber}
                </Text>
              )}
            </Group>
            <Group gap="sm" wrap="nowrap">
              <Button variant="subtle" onClick={() => void navigate(-1)}>
                {t('common.actions.cancel')}
              </Button>
              <Button type="submit" loading={saving}>
                {editing
                  ? t('salesOrdersV2.form.updateButton')
                  : t('salesOrdersV2.form.createButton')}
              </Button>
            </Group>
          </Group>
        </Box>

        {/* The same banner the list and detail carry. It matters MOST here:
            an invalid field block renders no custom input at all, and without
            this the form just looks like the client's fields were removed. */}
        <SalesOrderConfigAlerts />

        {/* Says why the form arrived filled in. It also marks how long the copy
            state lasts: a refresh drops it, and the banner going with it is the
            visible difference between a copy and a blank New. */}
        {copyFrom && (
          <Alert icon={<IconCopy size={16} />} color="blue" variant="light" radius="md" py="xs">
            {t('salesOrdersV2.form.copyingFrom', {
              orderNumber: copyFrom.sourceOrderNumber,
            })}
          </Alert>
        )}

        {/* The app's split grid (`docs/memo/design-system.md`), with the LINE
            TABLE inside the left column rather than full-width below it. That
            is what lets the summary stick: a rail beside a column that ends
            above the table has nothing left to travel over, which is how the
            running total scrolled away exactly when prices were being typed —
            and why the frame emptied out to its right. 9/3 rather than 7/5
            because the table is now the widest thing in the column. */}
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 9 }}>
            <Stack gap="md">
              <SectionCard icon={<IconUser size={14} />} title={t('salesOrdersV2.form.customer')}>
                <Stack gap="sm">
                  <CustomerPicker
                    customers={customers}
                    loading={customersLoading}
                    customerId={customerId}
                    customerName={customerName}
                    onPick={pickCustomer}
                    onType={typeCustomer}
                    onCreate={(name) => setCreatingCustomer(name)}
                    canCreate={featureFlags.customersV2.enabled && perms.customer.canCreate()}
                  />
                  {/* The ORDER's contact, seeded from the customer and
                      editable — one order may ship somewhere the customer
                      record does not say, and a later edit of that customer
                      never reaches back here. */}
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <TextInput
                      label={t('common.labels.phone')}
                      description={
                        contactFromProfile ? t('salesOrdersV2.form.customerFromProfile') : undefined
                      }
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.currentTarget.value);
                        setContactFromProfile(false);
                      }}
                    />
                    <TextInput
                      label={t('salesOrdersV2.form.deliveryAddress')}
                      description={
                        contactFromProfile ? t('salesOrdersV2.form.customerFromProfile') : undefined
                      }
                      value={customerAddress}
                      onChange={(e) => {
                        setCustomerAddress(e.currentTarget.value);
                        setContactFromProfile(false);
                      }}
                    />
                  </SimpleGrid>
                </Stack>
              </SectionCard>

              <SectionCard
                icon={<IconCalendarEvent size={14} />}
                title={t('salesOrdersV2.form.orderSection')}
              >
                <Stack gap="sm">
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    {/* Typable, unlike the app's default date field: an
                        order is taken down while somebody is still on the
                        phone, and both of these arrive as words ("giao thứ
                        năm") rather than as a day picked off a grid. The
                        calendar is still there for the ones that don't. */}
                    <DateTextField
                      label={t('salesOrdersV2.form.orderDate')}
                      value={orderDate || null}
                      onChange={(value) => setOrderDate(value ?? '')}
                    />
                    <DateTextField
                      label={t('salesOrdersV2.form.requestedDate')}
                      value={requestedDate || null}
                      onChange={(value) => setRequestedDate(value ?? '')}
                    />
                  </SimpleGrid>

                  {/* Everything an order does not need to be placed, folded
                      once — OPEN by default, so it is a way to put the section
                      away rather than somewhere fields hide. */}
                  <Divider
                    my={4}
                    labelPosition="left"
                    label={
                      <UnstyledButton onClick={() => setMoreOpen((open) => !open)}>
                        <Group gap={4}>
                          {moreOpen ? (
                            <IconChevronDown size={14} />
                          ) : (
                            <IconChevronRight size={14} />
                          )}
                          <Text size="sm">{t('salesOrdersV2.form.moreInfo')}</Text>
                        </Group>
                      </UnstyledButton>
                    }
                  />
                  {!moreOpen && moreSummary && (
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {moreSummary}
                    </Text>
                  )}
                  <Collapse in={moreOpen}>
                    <Stack gap="sm">
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                        <TextInput
                          label={t('salesOrdersV2.form.reference')}
                          value={reference}
                          onChange={(e) => setReference(e.currentTarget.value)}
                        />
                        {/* The client's own fields, after the module's, on the
                            grid each one's `width` asks for. A field this
                            operator may only view renders disabled rather than
                            absent — the value is part of the record they are
                            editing, and hiding it would make the form look like
                            it drops what it will keep. */}
                        {customFields.map((field) => (
                          <CustomFieldInput
                            key={field.key}
                            field={field}
                            value={customDraft[field.key] ?? ''}
                            onChange={(value) =>
                              setCustomDraft((prev) => ({ ...prev, [field.key]: value }))
                            }
                            error={
                              fieldErrors[field.key]
                                ? t(`salesOrdersV2.validation.field.${fieldErrors[field.key]!}`)
                                : undefined
                            }
                          />
                        ))}
                      </SimpleGrid>
                      <Textarea
                        label={t('salesOrdersV2.form.notes')}
                        value={notes}
                        onChange={(e) => setNotes(e.currentTarget.value)}
                        autosize
                        minRows={2}
                      />
                    </Stack>
                  </Collapse>
                </Stack>
              </SectionCard>
              <SectionCard
                icon={<IconShoppingCart size={14} />}
                title={t('salesOrdersV2.form.lines')}
              >
                <Stack gap="sm">
                  {/* The search IS the add — there is no "new line" button, because
                  a row that names nothing is a row nobody can fill. */}
                  {/* What a SALES suggestion has to answer: can I promise
                      this, and at what. A receipt's box passes no meta at all
                      — you receive what arrived. */}
                  <ItemSearchBox
                    items={searchableItems}
                    alreadyAdded={inOrder}
                    placeholder={t('salesOrdersV2.form.itemSearchPlaceholder')}
                    emptyLabel={t('salesOrdersV2.form.itemSearchEmpty')}
                    onPick={addItem}
                    renderMeta={(item) => {
                      const stock = lineStock({ itemType: item.itemType, itemId: item.id });
                      return (
                        <>
                          {/* A dash for an item nobody counted — no row is a
                              different fact from a zero count, the rule the
                              line hint follows (`stock-figures.md`). */}
                          <Text size="xs" c={stock && stock.available <= 0 ? 'red' : 'dimmed'}>
                            {stock
                              ? t('salesOrdersV2.form.itemRemaining', {
                                  count: formatNumber(stock.available),
                                  unit: unitLabelOf(item),
                                })
                              : '—'}
                          </Text>
                          {canSeePrice && item.price !== undefined && (
                            <Text size="xs">{formatNumber(item.price)}</Text>
                          )}
                        </>
                      );
                    }}
                  />

                  {/* The column widths are what let this table live in a 9/12
                      column beside the rail. Every one was slack at full width
                      — the note column alone gave back 40px — and the item name
                      keeps the remainder, being the only cell whose content has
                      no bound. Below their sum the container scrolls rather
                      than crushing a figure onto two lines. */}
                  {lines.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="xl">
                      {t('salesOrdersV2.form.noLines')}
                    </Text>
                  ) : (
                    <Table.ScrollContainer minWidth={800}>
                      <Table verticalSpacing="xs">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>{t('salesOrdersV2.form.item')}</Table.Th>
                            <Table.Th w={104}>{t('salesOrdersV2.form.quantity')}</Table.Th>
                            <Table.Th w={176} ta="right">
                              {t('salesOrdersV2.inventory.available')}
                            </Table.Th>
                            <Table.Th w={124}>{t('salesOrdersV2.form.unitPrice')}</Table.Th>
                            <Table.Th w={124} ta="right">
                              {t('salesOrdersV2.form.lineTotal')}
                            </Table.Th>
                            <Table.Th w={160}>{t('salesOrdersV2.form.lineNote')}</Table.Th>
                            <Table.Th w={44} />
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {lines.map((line, index) => {
                            const key = lineKey(line);
                            return (
                              <Table.Tr
                                key={key}
                                ref={(node) => {
                                  if (node) rowRefs.current.set(key, node);
                                  else rowRefs.current.delete(key);
                                }}
                                bg={
                                  key === highlightKey
                                    ? 'var(--mantine-color-yellow-light)'
                                    : undefined
                                }
                                style={{ transition: 'background-color 400ms' }}
                              >
                                <Table.Td>
                                  <LineItemCell
                                    line={line}
                                    unknownLabel={t('salesOrdersV2.form.itemUnknown')}
                                  />
                                </Table.Td>
                                <Table.Td>
                                  <NumberField
                                    ref={(node) => {
                                      if (node) quantityRefs.current.set(key, node);
                                      else quantityRefs.current.delete(key);
                                    }}
                                    value={line.quantity}
                                    emptyValue={0}
                                    onChange={(quantity) => setLine(index, { quantity })}
                                    min={0}
                                  />
                                </Table.Td>
                                <Table.Td>
                                  <LineStockCell
                                    stock={line.itemId ? lineStock(line) : null}
                                    orderedQuantity={line.quantity}
                                  />
                                </Table.Td>
                                <Table.Td>
                                  {/* Left EMPTY rather than defaulted to 0 — an order
                                  nobody priced and one priced at nothing are
                                  different facts, and the server keeps them
                                  apart. */}
                                  <NumberField
                                    value={line.unitPrice}
                                    onChange={(unitPrice) => setLine(index, { unitPrice })}
                                    min={0}
                                  />
                                </Table.Td>
                                <Table.Td ta="right">
                                  <Text size="sm" fw={500}>
                                    {line.unitPrice === undefined
                                      ? '—'
                                      : formatNumber(line.quantity * line.unitPrice)}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <TextInput
                                    value={line.note}
                                    onChange={(e) =>
                                      setLine(index, { note: e.currentTarget.value })
                                    }
                                  />
                                </Table.Td>
                                <Table.Td>
                                  <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    aria-label={t('salesOrdersV2.form.removeLine')}
                                    onClick={() =>
                                      setLines((prev) => prev.filter((_, i) => i !== index))
                                    }
                                  >
                                    <IconTrash size={16} />
                                  </ActionIcon>
                                </Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                  )}

                  {error && (
                    <Text c="red" size="sm">
                      {error}
                    </Text>
                  )}
                </Stack>
              </SectionCard>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 3 }}>
            {/* A live readout, not a footer total: it is what the operator
                checks after each line, so it sits where their eye already is
                rather than at the bottom of a table they are scrolling.

                STICKY is what makes that true rather than merely intended, and
                it pins below the action bar — `STICKY_RAIL_TOP` derives that
                from the bar's own height, so the two cannot drift into each
                other. Below `md` the grid stacks and the card simply follows
                the table, which is the right answer on a phone. */}
            <Box
              style={{
                position: 'sticky',
                top: STICKY_RAIL_TOP,
              }}
            >
              <SectionCard
                icon={<IconReceipt size={14} />}
                title={t('salesOrdersV2.form.summarySection')}
              >
                <Stack gap={10}>
                  <SummaryRow
                    label={t('salesOrdersV2.form.lineCount')}
                    value={formatNumber(lines.length)}
                  />
                  <Divider variant="dashed" />
                  <SummaryRow
                    label={t('salesOrdersV2.columns.totalQuantity')}
                    value={formatNumber(totalQuantity)}
                  />
                  <Divider variant="dashed" />
                  {/* A dash, never a zero: an order nobody priced and one priced
                    at nothing are different facts the record keeps apart. */}
                  <SummaryRow
                    label={t('salesOrdersV2.columns.totalAmount')}
                    value={orderTotal === undefined ? '—' : formatNumber(orderTotal)}
                    strong
                  />
                </Stack>
              </SectionCard>
            </Box>
          </Grid.Col>
        </Grid>

        {/* Saving lands the row in the customer store, so the picker sees it
            with no refetch — which is what lets the new customer simply be
            selected here rather than sending the operator to another page. */}
        <MasterDataQuickCreateModal
          spec={CUSTOMER_V2_SPEC}
          opened={creatingCustomer !== null}
          onClose={() => setCreatingCustomer(null)}
          onCreated={pickCustomer}
          initialName={creatingCustomer ?? undefined}
        />
      </Stack>
    </Form>
  );
}
