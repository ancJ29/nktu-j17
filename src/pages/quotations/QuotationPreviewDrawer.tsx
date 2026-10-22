import {
  Anchor,
  Badge,
  Card,
  Divider,
  Drawer,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { device } from '@credo/base-ui/utils';
import { DetailField } from '@/components/DetailField';
import { EmployeeLink } from '@/components/EmployeeLink';
import { ROUTES } from '@/constants/routes';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { QuotationLinesTable } from './QuotationLinesTable';
import { quotationBadgeProps, quotationListDate, type Quotation } from './types';

const isMobile = device.isMobile;

type QuotationPreviewDrawerProps = {
  readonly quotation: Quotation | null;
  readonly onClose: () => void;

  readonly customerName: string | undefined;
};

export function QuotationPreviewDrawer({
  quotation,
  onClose,
  customerName,
}: QuotationPreviewDrawerProps) {
  const { t } = useTranslation();

  const extra = quotation?.extra;
  const status = extra?.status ?? 'draft';
  const badge = quotationBadgeProps(status);
  const date = quotation ? quotationListDate(quotation) : null;

  return (
    <Drawer
      opened={quotation !== null}
      onClose={onClose}
      position="bottom"
      size={isMobile ? '85%' : '75%'}
      title={
        quotation && (
          <Group gap="xs" wrap="nowrap">
            <Text fw={700}>{t('quotations.previewTitle')}</Text>
            {/* The code links through to the detail page — the drawer is a
                preview, so the escape hatch to the full record is the one
                navigation affordance it should offer. */}
            <Anchor
              component={Link}
              to={ROUTES.QUOTATIONS.DETAIL.replace(':id', quotation.id)}
              fw={600}
              ff="monospace"
            >
              {extra?.code}
            </Anchor>
            <Text c="dimmed">{customerName ?? ''}</Text>
          </Group>
        )
      }
    >
      {quotation && extra && (
        <Stack gap="md">
          <Card withBorder radius="md" padding="md">
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
                <DetailField label={t('__new__.01-common.labels.status')}>
                  <Badge color={badge.color} variant={badge.variant}>
                    {t(`quotations.status.${status}`)}
                  </Badge>
                </DetailField>
                <DetailField label={t('salesOrders.columns.assignedStaff')}>
                  {extra.assignedStaff ? <EmployeeLink id={extra.assignedStaff} /> : null}
                </DetailField>
                {/* The lifecycle date the row shows, with the same caption —
                    the drawer must not date the quotation differently. */}
                {date && (
                  <DetailField label={t('quotations.columns.date')}>
                    <Text size="sm">{formatDate(date.at)}</Text>
                    <Text size="xs" c="dimmed">
                      {t(`quotations.dateKind.${date.kind}`)}
                    </Text>
                  </DetailField>
                )}
                <DetailField label={t('common.labels.createdAt')}>
                  {formatDateTime(quotation.createdAt)}
                </DetailField>
              </SimpleGrid>

              {extra.note && (
                <DetailField label={t('quotations.form.note')}>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {extra.note}
                  </Text>
                </DetailField>
              )}
            </Stack>
          </Card>

          <Divider variant="dashed" />

          <QuotationLinesTable lines={extra.lines ?? []} />
        </Stack>
      )}
    </Drawer>
  );
}
