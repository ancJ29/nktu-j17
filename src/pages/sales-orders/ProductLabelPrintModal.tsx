import { useState } from 'react';
import {
  Button,
  Group,
  Modal,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  TextInput,
} from '@mantine/core';
import { IconPrinter } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { FieldLabel } from '@credo/base-ui/components';
import type { SalesOrderItem } from '@/types/sales-order';
import {
  PRODUCT_LABEL_SIZES,
  PRODUCT_LABEL_TEMPLATE_FIELDS,
  buildDefaultProductLabelFields,
  printProductLabel,
  type ProductLabelFields,
  type ProductLabelSize,
  type ProductLabelTemplate,
} from '@/utils/salesOrderProductLabel';

type ProductLabelPrintModalProps = {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly items: readonly SalesOrderItem[];
  readonly customerPONumber?: string;
  readonly defaultHeader: string;
};

const FIELD_LABEL_KEY = {
  date: 'salesOrders.detail.printLabelDate',
  header: 'salesOrders.detail.printLabelHeader',
  productCode: 'salesOrders.detail.printLabelProductCode',
  productName: 'salesOrders.detail.printLabelProductName',
  color: 'salesOrders.detail.printLabelColor',
  dimensions: 'salesOrders.detail.printLabelDimensions',
  quantity: 'salesOrders.detail.printLabelQuantity',
  unit: 'salesOrders.detail.printLabelUnit',
  weight: 'salesOrders.detail.printLabelWeight',
  customerPONumber: 'salesOrders.detail.printLabelPONumber',
  packageCount: 'salesOrders.detail.printLabelPackageCount',
} as const satisfies Record<keyof ProductLabelFields, string>;

export function ProductLabelPrintModal({
  opened,
  onClose,
  items,
  customerPONumber,
  defaultHeader,
}: ProductLabelPrintModalProps) {
  const { t } = useTranslation();

  const itemOptions = items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => it.role !== 'set-component')
    .map(({ it, i }) => ({
      value: String(i),
      label: `${it.productName || it.productCode} × ${it.quantity}`,
    }));

  const seedFields = (value: string | null): ProductLabelFields =>
    buildDefaultProductLabelFields({
      item: value === null ? undefined : items[Number(value)],
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

  const setField = (key: keyof ProductLabelFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleItemChange = (value: string | null) => {
    setItemIndex(value);
    setFields(seedFields(value));
  };

  const handlePrint = () => {
    if (!printProductLabel(fields, { size, template })) {
      notifications.show({ color: 'red', message: t('salesOrders.detail.printPopupBlocked') });
    }
  };

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
              label: PRODUCT_LABEL_SIZES[key].label,
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
          {PRODUCT_LABEL_TEMPLATE_FIELDS[template].map((key) => (
            <TextInput
              key={key}
              label={t(FIELD_LABEL_KEY[key])}
              value={fields[key]}
              onChange={(e) => setField(key, e.currentTarget.value)}
            />
          ))}
        </SimpleGrid>
        <Group justify="flex-end" gap="sm">
          <Button variant="light" color="red" size="sm" onClick={onClose}>
            {t('common.actions.cancel')}
          </Button>
          <Button
            size="sm"
            color="primary"
            leftSection={<IconPrinter size={14} />}
            onClick={handlePrint}
            disabled={itemIndex === null}
          >
            {t('salesOrders.detail.printLabel')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
