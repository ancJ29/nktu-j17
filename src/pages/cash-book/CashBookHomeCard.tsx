import { Button, Card, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { logger } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { bookTotals, monthKeyOf, type BookTotals } from '@/pages/books/bookModel';
import { balanceColor } from '@/pages/odometer-logs/balanceColor';
import { cashBookBundle } from '@/stores/useBookStores';
import { todayInVnDateString } from '@/utils/dateTimeField';
import { featureFlags } from '@/utils/features';
import { formatNumber } from '@/utils/number';
import { perms } from '@/utils/permission';

/**
 * This month's Thu, Chi and Thu − Chi, with a button to the book. Reads **one
 * partition** (the month), as the odometer card reads one day. A failed read
 * says so: zeros would read as "nothing was spent".
 */
export function CashBookHomeCard() {
  const { t } = useTranslation();
  const [month] = useState(() => monthKeyOf(todayInVnDateString()));
  const [totals, setTotals] = useState<BookTotals | null>(null);
  const [failed, setFailed] = useState(false);

  const eligible = featureFlags.nktuCashBook.enabled && perms.cashBook.canView();

  useEffect(() => {
    if (!eligible) return;
    let cancelled = false;
    cashBookBundle
      .queryPartition(month)
      .then((rows) => {
        if (!cancelled) setTotals(bookTotals(rows));
      })
      .catch((err) => {
        logger.error('Cash book month lookup failed:', err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [eligible, month]);

  if (!eligible) return null;

  const amount = (n: number) => `${formatNumber(n)} đ`;

  return (
    <Card withBorder radius="md" padding="sm">
      <Group justify="space-between" align="center" wrap="nowrap" gap="md">
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <ThemeIcon size={38} radius="md" variant="light" color="primary">
            <IconCash size={20} stroke={1.75} />
          </ThemeIcon>
          <Stack gap={2}>
            <Text fw={600} size="sm">
              {t('books.cashBook.homeCard.title')}
            </Text>
            {failed ? (
              <Text size="sm" c="red">
                {t('books.table.loadFailed')}
              </Text>
            ) : totals ? (
              <>
                <Text size="sm" c="gray.7">
                  {t('books.cashBook.balance')}{' '}
                  <Text
                    span
                    fw={700}
                    size="lg"
                    c={balanceColor(totals.balance)}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {amount(totals.balance)}
                  </Text>
                </Text>
                <Text size="xs" c="gray.7" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {t('books.cashBook.columns.in')}: {formatNumber(totals.inTotal)} ·{' '}
                  {t('books.cashBook.columns.out')}: {formatNumber(totals.outTotal)}
                </Text>
              </>
            ) : (
              <Text size="sm" c="dimmed">
                …
              </Text>
            )}
          </Stack>
        </Group>
        <Button
          component={Link}
          to={ROUTES.CASH_BOOK.LIST}
          variant="light"
          size="xs"
          leftSection={<IconCash size={14} />}
        >
          {t('books.cashBook.homeCard.open')}
        </Button>
      </Group>
    </Card>
  );
}
