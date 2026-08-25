import { Avatar, Group, Table, Text } from '@mantine/core';
import { IconPhoto } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { ProductLink } from '@/components/ProductLink';
import { lookupLabelOf, useLookupV2Labels, useProductPhotoByCode } from '@/hooks';
import { formatNumber } from '@/utils/number';
import { hasImagesForProducts, isQuotationTierPricingEnabled } from '@/utils/permission';
import { quotationTotal, type QuotationLine } from './types';

const showProductPhoto = hasImagesForProducts();
const showPriceTiers = isQuotationTierPricingEnabled();

export function QuotationLinesTable({ lines }: { readonly lines: readonly QuotationLine[] }) {
  const { t } = useTranslation();
  const unitLabels = useLookupV2Labels('unit');
  const photoByCode = useProductPhotoByCode();

  if (lines.length === 0) {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        —
      </Text>
    );
  }

  return (
    <Table striped withRowBorders={false}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t('quotations.form.productLabel')}</Table.Th>
          <Table.Th style={{ textAlign: 'right' }}>{t('quotations.form.quantityLabel')}</Table.Th>
          <Table.Th style={{ textAlign: 'right' }}>{t('quotations.form.priceLabel')}</Table.Th>
          <Table.Th style={{ textAlign: 'right' }}>{t('quotations.form.amountLabel')}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {lines.map((l, i) => (
          <Table.Tr key={`${l.productCode}-${i}`}>
            <Table.Td>
              <Group gap="sm" wrap="nowrap">
                {showProductPhoto && (
                  <Avatar
                    src={photoByCode.get(l.productCode) ?? null}
                    radius="sm"
                    size={40}
                    color="gray"
                  >
                    <IconPhoto size={18} />
                  </Avatar>
                )}
                <div style={{ minWidth: 0 }}>
                  <ProductLink code={l.productCode} name={l.productName} size="sm" />
                  <Text size="xs" c="dimmed" ff="monospace">
                    {l.productCode}
                  </Text>
                </div>
              </Group>
            </Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
              <Text>{formatNumber(l.quantity)}</Text>
              {l.unit && (
                <Text size="xs" c="dimmed">
                  {lookupLabelOf(unitLabels, l.unit)}
                </Text>
              )}
            </Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
              <Text>{formatNumber(l.unitPrice)}</Text>
              {showPriceTiers &&
                l.priceTiers?.map((tier) => (
                  <Text key={tier.minQuantity} size="xs" c="dimmed" lh={1.3}>
                    {t('quotations.form.priceTiers.rung', {
                      quantity: formatNumber(tier.minQuantity),
                      price: formatNumber(tier.unitPrice),
                    })}
                  </Text>
                ))}
            </Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
              <Text fw={600}>{formatNumber(l.quantity * l.unitPrice)}</Text>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
      <Table.Tfoot>
        <Table.Tr>
          <Table.Td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>
            {t('quotations.form.totalLabel')}
          </Table.Td>
          <Table.Td style={{ textAlign: 'right' }}>
            <Text fw={700}>{formatNumber(quotationTotal([...lines]))}</Text>
          </Table.Td>
        </Table.Tr>
      </Table.Tfoot>
    </Table>
  );
}
