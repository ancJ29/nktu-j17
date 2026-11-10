import { Box, Card, Group, Stack, Table, Text, UnstyledButton } from '@mantine/core';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProductLink } from '@/components/ProductLink';
import { lookupLabelOf, type useLookupV2Labels } from '@/hooks';
import { useProductStore } from '@/stores/useProductStore';
import { hasImagesForProducts } from '@/utils/permission';
import { ProductThumb } from '@/pages/products/ProductThumb';
import { ProductPhotoModal } from '@/pages/sales-orders/ProductPhotoModal';
import type { PurchaseOrder } from '@/types';
import { packageCountOf } from '@/pages/goods-receipts/goodsReceiptPackageCount';
import {
  formatMoney,
  lineAmount,
  lineTax,
  lineTotal,
  orderSubtotal,
  orderTax,
  orderTotal,
  poCurrency,
  poItems,
} from './purchaseOrderModel';

export type PurchaseOrderItemsProps = {
  readonly order: PurchaseOrder;
  readonly unitLabels: ReturnType<typeof useLookupV2Labels>;

  readonly showPrice: boolean;
};

export function PurchaseOrderItemsTableDesktop({
  order,
  unitLabels,
  showPrice,
}: PurchaseOrderItemsProps) {
  const { t } = useTranslation();
  const items = poItems(order);
  const currency = poCurrency(order);
  const showPackageCount = items.some((it) => packageCountOf(it) !== null);
  return (
    <Box style={{ overflowX: 'auto' }}>
      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={36}>#</Table.Th>
            <Table.Th>{t('common.labels.name')}</Table.Th>
            <Table.Th w={140} ta="right">
              {t('common.labels.quantity')}
            </Table.Th>
            {showPackageCount && (
              <Table.Th w={110} ta="right">
                {t('purchaseOrders.columns.packageCount')}
              </Table.Th>
            )}
            {showPrice && (
              <>
                <Table.Th w={150} ta="right">
                  {t('purchaseOrders.columns.unitPrice')}
                </Table.Th>
                <Table.Th w={130} ta="right">
                  {t('purchaseOrders.columns.tax')}
                </Table.Th>
                <Table.Th w={170} ta="right">
                  {t('purchaseOrders.columns.amount')}
                </Table.Th>
              </>
            )}
            <Table.Th ta="right">{t('__new__.01-common.labels.note')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((item, idx) => (
            <Table.Tr key={idx}>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {idx + 1}
                </Text>
              </Table.Td>
              <Table.Td>
                <ProductLink
                  code={item.itemCode}
                  name={item.itemName}
                  photoOnHover={hasImagesForProducts()}
                />
              </Table.Td>
              <Table.Td ta="right">
                <Group gap={4} wrap="nowrap" justify="flex-end" align="baseline">
                  <Text size="sm" fw={700}>
                    {(item.quantity ?? 0).toLocaleString()}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {lookupLabelOf(unitLabels, item.unit)}
                  </Text>
                </Group>
              </Table.Td>
              {showPackageCount && (
                <Table.Td ta="right">
                  <Text size="sm">{packageCountOf(item)?.toLocaleString() ?? ''}</Text>
                </Table.Td>
              )}
              {showPrice && (
                <>
                  <Table.Td ta="right">
                    <Text size="sm">
                      {typeof item.unitPrice === 'number'
                        ? formatMoney(item.unitPrice, currency)
                        : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm">{formatMoney(lineTax(item, currency), currency)}</Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm" fw={600}>
                      {typeof item.unitPrice === 'number'
                        ? formatMoney(lineTotal(item, currency), currency)
                        : '—'}
                    </Text>
                  </Table.Td>
                </>
              )}
              <Table.Td ta="right">
                <Text
                  size="sm"
                  c={item.note ? undefined : 'dimmed'}
                  fs={item.note ? undefined : 'italic'}
                >
                  {item.note || '—'}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
        {showPrice && items.length > 0 && (
          <Table.Tfoot>
            <Table.Tr>
              <Table.Td colSpan={showPackageCount ? 6 : 5} ta="right">
                <Text size="sm" fw={600}>
                  {t('purchaseOrders.columns.subtotal')}
                </Text>
              </Table.Td>
              <Table.Td ta="right">
                <Text size="sm">{formatMoney(orderSubtotal(order), currency)}</Text>
              </Table.Td>
              <Table.Td />
            </Table.Tr>
            <Table.Tr>
              <Table.Td colSpan={showPackageCount ? 6 : 5} ta="right">
                <Text size="sm" fw={600}>
                  {t('purchaseOrders.columns.tax')}
                </Text>
              </Table.Td>
              <Table.Td ta="right">
                <Text size="sm">{formatMoney(orderTax(order), currency)}</Text>
              </Table.Td>
              <Table.Td />
            </Table.Tr>
            <Table.Tr>
              <Table.Td colSpan={showPackageCount ? 6 : 5} ta="right">
                <Text size="sm" fw={600}>
                  {t('purchaseOrders.form.totalLabel', { currency })}
                </Text>
              </Table.Td>
              <Table.Td ta="right">
                <Text size="sm" fw={800}>
                  {formatMoney(orderTotal(order), currency)}
                </Text>
              </Table.Td>
              <Table.Td />
            </Table.Tr>
          </Table.Tfoot>
        )}
      </Table>
    </Box>
  );
}

export function PurchaseOrderItemsListMobile({
  order,
  unitLabels,
  showPrice,
}: PurchaseOrderItemsProps) {
  const { t } = useTranslation();
  const currency = poCurrency(order);
  const products = useProductStore((s) => s.items);
  const productByCode = useMemo(() => new Map(products.map((p) => [p.code, p])), [products]);
  const imagesEnabled = hasImagesForProducts();

  const [photoProduct, setPhotoProduct] = useState<{ code: string; name: string } | null>(null);
  return (
    <Stack gap="xs">
      {poItems(order).map((item, idx) => {
        const packageCount = packageCountOf(item);
        const lineProduct = productByCode.get(item.itemCode);
        return (
          <Card key={idx} withBorder padding="sm" radius="sm">
            <Stack gap={6}>
              <Group gap="sm" wrap="nowrap" align="flex-start">
                {/* A phone matches a line to a shelf by its photo; tappable only when there is one. */}
                {imagesEnabled &&
                  lineProduct &&
                  (lineProduct.extra?.images?.[0]?.url ? (
                    <UnstyledButton
                      aria-label={t('salesOrders.detail.viewProductPhotos')}
                      onClick={() =>
                        setPhotoProduct({
                          code: lineProduct.code,
                          name: item.itemName?.trim() || lineProduct.name,
                        })
                      }
                    >
                      <ProductThumb product={lineProduct} size={48} />
                    </UnstyledButton>
                  ) : (
                    <ProductThumb product={lineProduct} size={48} />
                  ))}
                <Text size="sm" fw={600} lh={1.3} style={{ flex: 1, minWidth: 0 }}>
                  <ProductLink code={item.itemCode} name={item.itemName} size="sm" />
                </Text>
              </Group>
              <Group gap={6} wrap="wrap" align="baseline">
                <Text size="lg" fw={800} lh={1}>
                  {(item.quantity ?? 0).toLocaleString()}
                </Text>
                <Text size="sm" c="dimmed">
                  {lookupLabelOf(unitLabels, item.unit)}
                </Text>
                {packageCount !== null && (
                  <Text size="xs" c="dimmed">
                    · {t('purchaseOrders.columns.packageCount')} {packageCount.toLocaleString()}
                  </Text>
                )}
              </Group>
              {showPrice && typeof item.unitPrice === 'number' && (
                <Text size="sm">
                  {formatMoney(item.unitPrice, currency)} × {(item.quantity ?? 0).toLocaleString()}{' '}
                  ={' '}
                  <Text span fw={700}>
                    {formatMoney(lineAmount(item, currency), currency)}
                  </Text>
                  {lineTax(item, currency) > 0 && (
                    <>
                      {' '}
                      + {t('purchaseOrders.columns.tax')}{' '}
                      {formatMoney(lineTax(item, currency), currency)}
                      {' = '}
                      <Text span fw={700}>
                        {formatMoney(lineTotal(item, currency), currency)}
                      </Text>
                    </>
                  )}
                </Text>
              )}
              {item.note && (
                <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                  {item.note}
                </Text>
              )}
            </Stack>
          </Card>
        );
      })}
      {photoProduct && (
        <ProductPhotoModal
          key={photoProduct.code}
          opened
          onClose={() => setPhotoProduct(null)}
          productCode={photoProduct.code}
          productName={photoProduct.name}
        />
      )}
      {showPrice && (
        <Group justify="space-between" px="xs">
          <Text size="sm" fw={600}>
            {t('purchaseOrders.form.totalLabel', { currency })}
          </Text>
          <Text size="sm" fw={800}>
            {formatMoney(orderTotal(order), currency)}
          </Text>
        </Group>
      )}
    </Stack>
  );
}
