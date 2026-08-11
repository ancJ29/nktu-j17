import { lazy, Suspense } from 'react';
import { Loader, Group } from '@mantine/core';
import { clientCode } from '@/config/client';

const EntitySalesPanelNKTU = lazy(() => import('../by-clients/nktu/reports/EntitySalesPanel'));

export type EntitySalesTarget =
  | { kind: 'customer'; code: string; name: string }
  /** Products are matched by `code` when they have one (SO lines snapshot
   *  `product.code`), else by name — the same fallback the report keys on. */
  | { kind: 'product'; code?: string; name: string };

export default function EntitySalesPanel({ target }: { target: EntitySalesTarget }) {
  if (clientCode !== 'nktu') return null;
  return (
    <Suspense
      fallback={
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      }
    >
      <EntitySalesPanelNKTU target={target} />
    </Suspense>
  );
}
