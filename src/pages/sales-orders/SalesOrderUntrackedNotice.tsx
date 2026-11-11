import { Badge, Button, Stack } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function SalesOrderUntrackedNotice({
  canUndo,
  onUndo,
}: {
  readonly canUndo: boolean;

  readonly onUndo: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  return (
    <Stack gap={4} align="flex-start">
      <Badge variant="light" color="gray" size="sm" radius="sm">
        {t('salesOrders.billing.untracked')}
      </Badge>
      {canUndo && (
        <Button
          variant="light"
          size="compact-sm"
          loading={busy}
          onClick={() => {
            setBusy(true);
            onUndo()
              .catch(() => {})
              .finally(() => setBusy(false));
          }}
        >
          {t('salesOrders.billing.trackAgain')}
        </Button>
      )}
    </Stack>
  );
}
