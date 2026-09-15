import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  Group,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCopy,
  IconPackageImport,
  IconReceipt,
  IconTrash,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useForm } from '@mantine/form';
import { Form } from '@/components/Form';
import { DateField } from '@/components/DateField';
import { NumberField } from '@/components/NumberField';
import { isLiveRow, pickerOptions } from '../pickerOptions';
import { SectionCard } from '@/components/SectionCard';
import { ItemSearchBox, type SearchableItem } from '../ItemSearchBox';
import { CustomFieldInput } from '../CustomFieldInput';
import { LineItemCell, SummaryRow } from '../formBlocks';
import { formatNumber } from '@/utils/number';
import { ROUTES } from '@/constants/routes';
import {
  createGoodsReceiptV2,
  getGoodsReceiptV2ById,
  updateGoodsReceiptV2,
} from '@/stores/useGoodsReceiptV2Store';
import { useProductV2Store } from '@/stores/useProductV2Store';
import { useVendorV2Store } from '@/stores/useVendorV2Store';
import { useMaterialV2Store } from '@/stores/useMaterialV2Store';
import { featureFlags } from '@/config';
import { goodsReceiptStageOf } from './statusFlow';
import { GoodsReceiptConfigAlerts } from './chrome';
import {
  ACTION_BAR_HEIGHT,
  ACTION_BAR_Z,
  STICKY_ACTION_BAR_TOP,
  STICKY_RAIL_TOP,
} from '../stickyChrome';
import { useGoodsReceiptCustomFields } from './customFields';
import {
  customFieldSpan,
  customDraftOf,
  customFieldValueErrors,
  mergeCustomFieldExtra,
} from '@/utils/customFields';
import type {
  GoodsReceiptV2,
  GoodsReceiptV2CopyFrom,
  GoodsReceiptV2CopyLine,
  GoodsReceiptV2ItemType,
  GoodsReceiptV2LineInput,
} from '@/types/goods-receipt-v2';

type LineDraft = {
  itemType: GoodsReceiptV2ItemType;
  itemId: string;
  itemCode?: string | undefined;
  itemName?: string | undefined;
  unit?: string | undefined;
  quantity: number;
  note: string;
};

const lineKey = (line: { itemType: GoodsReceiptV2ItemType; itemId: string }) =>
  `${line.itemType}:${line.itemId}`;

const toLineDraft = (line: GoodsReceiptV2CopyLine): LineDraft => ({
  itemType: line.itemType ?? 'product',
  itemId: line.itemId,
  itemCode: line.itemCode,
  itemName: line.itemName,
  unit: line.unit,
  quantity: line.quantity,
  note: line.note ?? '',
});

const materialsOffered = featureFlags.materialsV2.enabled;

export function GoodsReceiptV2FormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);

  const location = useLocation();
  const copyFrom = editing
    ? undefined
    : (location.state as { copyFrom?: GoodsReceiptV2CopyFrom } | null)?.copyFrom;

  const products = useProductV2Store((s) => s.items);
  const loadProducts = useProductV2Store((s) => s.loadAll);
  const materials = useMaterialV2Store((s) => s.items);
  const loadMaterials = useMaterialV2Store((s) => s.loadAll);
  const vendors = useVendorV2Store((s) => s.items);
  const loadVendors = useVendorV2Store((s) => s.loadAll);

  const [receipt, setReceipt] = useState<GoodsReceiptV2 | null>(null);
  const [day, setDay] = useState('');

  const [vendorId, setVendorId] = useState<string | null>(copyFrom?.vendorId ?? null);
  const [receivedDate, setReceivedDate] = useState('');
  const [reference, setReference] = useState(copyFrom?.reference ?? '');
  const [notes, setNotes] = useState(copyFrom?.notes ?? '');

  const [lines, setLines] = useState<LineDraft[]>(() =>
    copyFrom ? copyFrom.items.map(toLineDraft) : [],
  );
  const [highlightKey, setHighlightKey] = useState<string | null>(null);

  const pendingFocus = useRef<string | null>(null);
  const quantityRefs = useRef(new Map<string, HTMLInputElement>());
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());

  const [customDraft, setCustomDraft] = useState<Record<string, string>>(() =>
    customDraftOf(copyFrom?.extra),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const customFields = useGoodsReceiptCustomFields();
  const editableFields = useMemo(
    () => customFields.filter((field) => field.editable),
    [customFields],
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, 'number' | 'date' | 'option'>>({});

  const form = useForm({ initialValues: {} });

  useEffect(() => {
    void loadProducts();
    void loadVendors();
    if (materialsOffered) void loadMaterials();
  }, [loadProducts, loadVendors, loadMaterials]);

  useEffect(() => {
    if (!id) return;
    let live = true;
    getGoodsReceiptV2ById(id)
      .then(({ item, day: onDay }) => {
        if (!live) return;

        if (goodsReceiptStageOf(item.status) !== 'draft') {
          void navigate(ROUTES.GOODS_RECEIPTS_V2.DETAIL.replace(':id', item.id), { replace: true });
          return;
        }
        setReceipt(item);
        setDay(onDay);
        setVendorId(item.vendorId ?? null);
        setReceivedDate(item.receivedDate ?? '');
        setReference(item.reference ?? '');
        setNotes(item.notes ?? '');

        setLines(item.items.map(toLineDraft));
        setCustomDraft(customDraftOf(item.extra));
      })
      .catch(() => {
        if (live) void navigate(ROUTES.GOODS_RECEIPTS_V2.LIST, { replace: true });
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
      price: undefined,
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

  const onReceipt = useMemo(() => new Set(lines.map(lineKey)), [lines]);

  const totalQuantity = useMemo(
    () =>
      lines.reduce((sum, line) => sum + (Number.isFinite(line.quantity) ? line.quantity : 0), 0),
    [lines],
  );

  const addItem = useCallback((item: SearchableItem) => {
    const key = `${item.itemType}:${item.id}`;
    setLines((prev) => {
      const at = prev.findIndex((line) => lineKey(line) === key);
      if (at >= 0) {
        return prev.map((line, i) => (i === at ? { ...line, quantity: line.quantity + 1 } : line));
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
          note: '',
        },
      ];
    });
    setHighlightKey(key);
    pendingFocus.current = key;
  }, []);

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

  const vendorOptions = useMemo(
    () => pickerOptions(vendors, new Set(vendorId ? [vendorId] : []), t('common.pickers.inactive')),
    [t, vendors, vendorId],
  );

  const setLine = useCallback((index: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }, []);

  const submit = useCallback(async () => {
    const payload: GoodsReceiptV2LineInput[] = lines
      .filter((line) => line.itemId !== '')
      .map((line) => ({
        itemType: line.itemType,
        itemId: line.itemId,
        quantity: line.quantity,
        ...(line.note.trim() !== '' ? { note: line.note.trim() } : {}),
      }));

    const refuse = (message: string) => {
      setError(message);
      notifications.show({ color: 'red', message });
    };

    if (payload.length === 0) {
      refuse(t('goodsReceiptsV2.validation.itemsRequired'));
      return;
    }
    if (payload.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0)) {
      refuse(t('goodsReceiptsV2.validation.quantityPositive'));
      return;
    }

    const badFields = customFieldValueErrors(editableFields, customDraft);
    setFieldErrors(badFields);
    if (Object.keys(badFields).length > 0) {
      refuse(t('goodsReceiptsV2.validation.customFields'));
      return;
    }

    const extra = mergeCustomFieldExtra(
      receipt?.extra ?? copyFrom?.extra,
      editableFields,
      customDraft,
    );

    setError(null);
    setSaving(true);
    try {
      const saved =
        editing && receipt
          ? await updateGoodsReceiptV2(receipt, day, {
              vendorId: vendorId ?? null,
              receivedDate,
              reference,
              notes,
              items: payload,
              extra,
            })
          : await createGoodsReceiptV2({
              ...(vendorId ? { vendorId } : {}),
              ...(receivedDate ? { receivedDate } : {}),
              ...(reference ? { reference } : {}),
              ...(notes ? { notes } : {}),
              items: payload,
              ...(Object.keys(extra).length > 0 ? { extra } : {}),
            });
      notifications.show({
        color: 'green',
        message: editing
          ? t('goodsReceiptsV2.notifications.updateSuccess')
          : t('goodsReceiptsV2.notifications.createSuccess'),
      });
      void navigate(ROUTES.GOODS_RECEIPTS_V2.DETAIL.replace(':id', saved.id));
    } catch {
      notifications.show({
        color: 'red',
        message: t('goodsReceiptsV2.notifications.writeError'),
      });
    } finally {
      setSaving(false);
    }
  }, [
    lines,
    editing,
    receipt,
    day,
    vendorId,
    receivedDate,
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
        {/* Heading and actions in one PINNED bar, and Save moves up into it —
            a receipt is as long as its delivery, so a footer action row is
            reachable only by scrolling past every line. The number rides the
            heading: without it one edit form is every edit form, and an
            operator who arrived from a list of near-identical receipts has
            nothing on screen saying WHICH one they are about to overwrite. */}
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
                {editing ? t('goodsReceiptsV2.editItem') : t('goodsReceiptsV2.addItem')}
              </Title>
              {editing && receipt && (
                <Text size="lg" fw={600} c="dimmed" truncate>
                  {receipt.receiptNumber}
                </Text>
              )}
            </Group>
            <Group gap="sm" wrap="nowrap">
              <Button variant="subtle" onClick={() => void navigate(-1)}>
                {t('common.actions.cancel')}
              </Button>
              <Button type="submit" loading={saving}>
                {editing
                  ? t('goodsReceiptsV2.form.updateButton')
                  : t('goodsReceiptsV2.form.createButton')}
              </Button>
            </Group>
          </Group>
        </Box>

        {/* The same banner the list and detail carry. It matters MOST here:
            an invalid field block renders no custom input at all, and without
            this the form just looks like the client's fields were removed. */}
        <GoodsReceiptConfigAlerts />

        {/* Says why the form arrived filled in. It also marks how long the copy
            state lasts: a refresh drops it, and the banner going with it is the
            visible difference between a copy and a blank New. */}
        {copyFrom && (
          <Alert icon={<IconCopy size={16} />} color="blue" variant="light" radius="md" py="xs">
            {t('goodsReceiptsV2.form.copyingFrom', {
              receiptNumber: copyFrom.sourceReceiptNumber,
            })}
          </Alert>
        )}

        {/* The app's split grid with the LINE TABLE inside the left column
            (`design-system.md` items 4-5): a rail can only stick over what is
            beside it, so a table full-width BELOW the grid leaves the running
            total scrolling away exactly while lines are being entered. */}
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 9 }}>
            <Stack gap="md">
              <SectionCard
                icon={<IconTruckDelivery size={14} />}
                title={t('goodsReceiptsV2.form.receiptSection')}
              >
                <Stack gap="sm">
                  <Select
                    label={t('goodsReceiptsV2.form.vendor')}
                    data={vendorOptions}
                    value={vendorId}
                    onChange={setVendorId}
                    searchable
                    clearable
                  />
                  <DateField
                    label={t('goodsReceiptsV2.form.receivedDate')}
                    value={receivedDate || null}
                    onChange={(value) => setReceivedDate(value ?? '')}
                  />
                  <TextInput
                    label={t('goodsReceiptsV2.form.reference')}
                    value={reference}
                    onChange={(e) => setReference(e.currentTarget.value)}
                  />
                  <Textarea
                    label={t('goodsReceiptsV2.form.notes')}
                    value={notes}
                    onChange={(e) => setNotes(e.currentTarget.value)}
                    autosize
                    minRows={2}
                  />

                  {/* The client's own fields, after the module's, on the grid each
                one's `width` asks for. A field this operator may only view
                renders disabled rather than absent — the value is part of the
                record they are editing, and hiding it would make the form look
                like it drops what it will keep. */}
                  {customFields.length > 0 && (
                    <Grid gutter="sm">
                      {customFields.map((field) => (
                        <Grid.Col key={field.key} span={customFieldSpan(field)}>
                          <CustomFieldInput
                            field={field}
                            value={customDraft[field.key] ?? ''}
                            onChange={(value) =>
                              setCustomDraft((prev) => ({ ...prev, [field.key]: value }))
                            }
                            error={
                              fieldErrors[field.key]
                                ? t(`goodsReceiptsV2.validation.field.${fieldErrors[field.key]!}`)
                                : undefined
                            }
                          />
                        </Grid.Col>
                      ))}
                    </Grid>
                  )}
                </Stack>
              </SectionCard>

              <SectionCard
                icon={<IconPackageImport size={14} />}
                title={t('goodsReceiptsV2.form.lines')}
              >
                <Stack gap="sm">
                  {/* The search IS the add — there is no "new line" button, because
                a row that names nothing is a row nobody can fill. A receipt's
                suggestion carries no stock or price meta: you receive what
                arrived, and neither figure changes that. */}
                  <ItemSearchBox
                    items={searchableItems}
                    alreadyAdded={onReceipt}
                    placeholder={t('goodsReceiptsV2.form.itemSearchPlaceholder')}
                    emptyLabel={t('goodsReceiptsV2.form.itemSearchEmpty')}
                    onPick={addItem}
                  />

                  {lines.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="xl">
                      {t('goodsReceiptsV2.form.noLines')}
                    </Text>
                  ) : (
                    <Table.ScrollContainer minWidth={520}>
                      <Table verticalSpacing="xs">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>{t('goodsReceiptsV2.form.item')}</Table.Th>
                            <Table.Th w={120}>{t('goodsReceiptsV2.form.quantity')}</Table.Th>
                            <Table.Th w={220}>{t('goodsReceiptsV2.form.lineNote')}</Table.Th>
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
                                    unknownLabel={t('goodsReceiptsV2.form.itemUnknown')}
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
                                    aria-label={t('goodsReceiptsV2.form.removeLine')}
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
            {/* A live readout, not a footer total — what an operator checks
                after each line, kept beside the line they are on. It carries
                counts today; the money a receipt will learn to hold belongs
                here too, which is why the rail exists at two rows. */}
            <Box style={{ position: 'sticky', top: STICKY_RAIL_TOP }}>
              <SectionCard
                icon={<IconReceipt size={14} />}
                title={t('goodsReceiptsV2.form.summarySection')}
              >
                <Stack gap={10}>
                  <SummaryRow
                    label={t('goodsReceiptsV2.form.lineCount')}
                    value={formatNumber(lines.length)}
                  />
                  <Divider variant="dashed" />
                  <SummaryRow
                    label={t('goodsReceiptsV2.columns.totalQuantity')}
                    value={formatNumber(totalQuantity)}
                    strong
                  />
                </Stack>
              </SectionCard>
            </Box>
          </Grid.Col>
        </Grid>
      </Stack>
    </Form>
  );
}
