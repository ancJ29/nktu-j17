import { useState } from 'react';
import {
  Button,
  Collapse,
  Group,
  Modal,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { IconChevronDown, IconChevronRight, IconPrinter } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { FieldLabel } from '@credo/base-ui/components';
import { NumberField } from '@/components/NumberField';
import type { SalesOrderItem } from '@/types/sales-order';
import {
  PRODUCT_LABEL_SIZES,
  PRODUCT_LABEL_TEMPLATE_FIELDS,
  buildDefaultProductLabelFields,
  formatProductLabelPaperSize,
  printProductLabel,
  type ProductLabelEditableField,
  type ProductLabelFields,
  type ProductLabelOffset,
  type ProductLabelSize,
  type ProductLabelTemplate,
} from '@/utils/salesOrderProductLabel';

type ProductLabelPrintModalProps = {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly items: readonly SalesOrderItem[];
  readonly customerPONumber?: string;
  readonly defaultHeader: string;
  readonly printerPaper?: ProductLabelSize;
};

const FIELD_LABEL_KEY = {
  date: 'salesOrders.detail.printLabelDate',
  header: 'salesOrders.detail.printLabelHeader',
  productCode: 'salesOrders.detail.printLabelProductCode',
  productName: 'salesOrders.detail.printLabelProductName',
  color: 'salesOrders.detail.printLabelColor',
  dimensions: 'salesOrders.detail.printLabelDimensions',
  quantity: 'salesOrders.detail.printLabelQuantity',
  packageCount: 'salesOrders.detail.printLabelPackageCount',
  weight: 'salesOrders.detail.printLabelWeight',
  customerPONumber: 'salesOrders.detail.printLabelPONumber',
} as const satisfies Record<ProductLabelEditableField, string>;

const SIZE_NAME_KEY = {
  small: 'salesOrders.detail.printLabelSizeSmall',
  A7: 'salesOrders.detail.printLabelSizeA7',
} as const satisfies Record<ProductLabelSize, string>;

const TRIAL_STEPS_MM = [-4, -2, 0, 2, 4] as const;

export function ProductLabelPrintModal({
  opened,
  onClose,
  items,
  customerPONumber,
  defaultHeader,
  printerPaper,
}: ProductLabelPrintModalProps) {
  const { t } = useTranslation();

  const lines = items.filter((it) => it.role !== 'set-component');
  const itemOptions = lines.map((it, i) => ({
    value: String(i),
    label: `${i + 1}. ${it.productName || it.productCode} × ${it.quantity}`,
  }));

  const seedFields = (value: string | null): ProductLabelFields =>
    buildDefaultProductLabelFields({
      line: value === null ? undefined : { item: lines[Number(value)], no: Number(value) + 1 },
      customerPONumber,
      header: defaultHeader,
      today: new Date(),
    });

  const [itemIndex, setItemIndex] = useState<string | null>(() =>
    itemOptions.length === 1 ? itemOptions[0].value : null,
  );
  const [size, setSize] = useState<ProductLabelSize>('small');
  const [template, setTemplate] = useState<ProductLabelTemplate>('template1');
  const [fields, setFields] = useState<ProductLabelFields>(() => seedFields(itemIndex));

  const [alignOpen, setAlignOpen] = useState(false);
  const [onPrinterPaper, setOnPrinterPaper] = useState(printerPaper !== undefined);
  const [offset, setOffset] = useState<ProductLabelOffset>({ xMm: 0, yMm: 0 });

  const setField = <K extends keyof ProductLabelFields>(key: K, value: ProductLabelFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleItemChange = (value: string | null) => {
    setItemIndex(value);
    setFields(seedFields(value));
  };

  const printable = itemIndex !== null && fields.packageCount >= 1;

  const print = (trials?: readonly ProductLabelOffset[]) => {
    const paper = onPrinterPaper ? printerPaper : undefined;
    if (!printProductLabel(fields, { size, template, paper, offset }, trials)) {
      notifications.show({ color: 'red', message: t('salesOrders.detail.printPopupBlocked') });
    }
  };

  const handlePrintTrials = () =>
    print(TRIAL_STEPS_MM.map((d) => ({ xMm: offset.xMm + d, yMm: offset.yMm })));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('salesOrders.detail.printLabelTitle')}
      size="lg"
    >
      <Stack gap="md">
        <Select
          label={t('salesOrders.detail.printLabelItem')}
          placeholder={t('salesOrders.detail.printLabelItemPlaceholder')}
          data={itemOptions}
          value={itemIndex}
          onChange={handleItemChange}
          searchable
        />
        <Stack gap={6}>
          <FieldLabel>{t('salesOrders.detail.printLabelSize')}</FieldLabel>
          <SegmentedControl
            fullWidth
            value={size}
            onChange={(v: string) => setSize(v as ProductLabelSize)}
            data={(Object.keys(PRODUCT_LABEL_SIZES) as ProductLabelSize[]).map((key) => ({
              value: key,
              label: `${t(SIZE_NAME_KEY[key])} — ${formatProductLabelPaperSize(key)}`,
            }))}
          />
        </Stack>
        <Stack gap={6}>
          <FieldLabel>{t('salesOrders.detail.printLabelTemplate')}</FieldLabel>
          <SegmentedControl
            fullWidth
            value={template}
            onChange={(v: string) => setTemplate(v as ProductLabelTemplate)}
            data={[
              { value: 'template1', label: t('salesOrders.detail.printLabelTemplate1') },
              { value: 'template2', label: t('salesOrders.detail.printLabelTemplate2') },
            ]}
          />
        </Stack>
        <SimpleGrid cols={2} spacing="sm">
          {PRODUCT_LABEL_TEMPLATE_FIELDS[template].map((key) =>
            key === 'packageCount' ? (
              <NumberField
                key={key}
                label={t(FIELD_LABEL_KEY[key])}
                value={fields.packageCount}
                emptyValue={0}
                min={1}
                allowDecimal={false}
                allowNegative={false}
                onChange={(count) => setField('packageCount', count)}
              />
            ) : (
              <TextInput
                key={key}
                label={t(FIELD_LABEL_KEY[key])}
                value={fields[key]}
                onChange={(e) => setField(key, e.currentTarget.value)}
              />
            ),
          )}
        </SimpleGrid>
        <Stack gap={6}>
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            style={{ alignSelf: 'flex-start' }}
            leftSection={alignOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            onClick={() => setAlignOpen((open) => !open)}
          >
            {t('salesOrders.detail.printLabelAlignment')}
          </Button>
          <Collapse in={alignOpen}>
            <Stack gap="sm">
              {printerPaper && (
                <Switch
                  label={t('salesOrders.detail.printLabelOnPaper', {
                    paper: t(SIZE_NAME_KEY[printerPaper]),
                  })}
                  checked={onPrinterPaper}
                  onChange={(e) => setOnPrinterPaper(e.currentTarget.checked)}
                />
              )}
              <SimpleGrid cols={2} spacing="sm">
                <NumberField
                  label={t('salesOrders.detail.printLabelOffsetX')}
                  value={offset.xMm}
                  emptyValue={0}
                  step={0.5}
                  decimalScale={1}
                  onChange={(xMm) => setOffset((prev) => ({ ...prev, xMm }))}
                />
                <NumberField
                  label={t('salesOrders.detail.printLabelOffsetY')}
                  value={offset.yMm}
                  emptyValue={0}
                  step={0.5}
                  decimalScale={1}
                  onChange={(yMm) => setOffset((prev) => ({ ...prev, yMm }))}
                />
              </SimpleGrid>
              <Text size="xs" c="dimmed">
                {t('salesOrders.detail.printLabelOffsetHint')}
              </Text>
              <Group justify="space-between" gap="sm" wrap="nowrap">
                <Text size="xs" c="dimmed">
                  {t('salesOrders.detail.printLabelTrialHint')}
                </Text>
                <Button
                  variant="light"
                  size="compact-sm"
                  leftSection={<IconPrinter size={14} />}
                  onClick={handlePrintTrials}
                  disabled={!printable}
                >
                  {t('salesOrders.detail.printLabelTrial', { count: TRIAL_STEPS_MM.length })}
                </Button>
              </Group>
            </Stack>
          </Collapse>
        </Stack>
        <Group justify="flex-end" gap="sm">
          <Button variant="light" color="red" size="sm" onClick={onClose}>
            {t('common.actions.cancel')}
          </Button>
          <Button
            size="sm"
            color="primary"
            leftSection={<IconPrinter size={14} />}
            onClick={() => print()}
            disabled={!printable}
          >
            {t('salesOrders.detail.printLabelCount', { count: fields.packageCount })}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
