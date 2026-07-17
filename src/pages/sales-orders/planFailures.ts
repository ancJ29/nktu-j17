

import type { TFunction } from 'i18next';
import type { Product } from '@/types/product';
import type { PlanFailure } from '@/utils/inventoryReservation';

export function formatPlanFailures(
  failures: PlanFailure[],
  t: TFunction,
  productByCode: Map<string, Product>,
): string {
  const idOf = (code: string) => productByCode.get(code)?.extra?.sku ?? code;
  return failures
    .map((f) => {
      switch (f.kind) {
        case 'no-row-at-location':
          return t('salesOrders.notifications.planFailureNoRow', {
            productName: f.productName || idOf(f.productCode),
            locationCode: f.locationCode,
          });
        case 'unknown-product':
          return t('salesOrders.notifications.planFailureUnknownProduct', {
            sku: idOf(f.productCode),
          });
        case 'unknown-unit':
          return t('salesOrders.notifications.planFailureUnknownUnit', {
            sku: idOf(f.productCode),
            unit: f.unit,
          });
        case 'reservation-mismatch':
          return t('salesOrders.notifications.planFailureReservationMismatch', {
            sku: idOf(f.productCode),
            requested: f.requested.toLocaleString(),
            reserved: f.reserved.toLocaleString(),
          });
        case 'shortage':
          return t('salesOrders.notifications.planFailureShortage', {
            sku: idOf(f.productCode),
            requested: f.requested.toLocaleString(),
            available: f.available.toLocaleString(),
          });
        case 'release-overflow':
          return t('salesOrders.notifications.planFailureReleaseOverflow', {
            sku: idOf(f.productCode),
          });
        case 'unsupported-transition':
          return t('salesOrders.notifications.planFailureUnsupportedTransition', {
            from: f.from,
            to: f.to,
          });
        case 'diff-underflow':
          
          
          
          return t('salesOrders.notifications.planFailureDiffUnderflow', {
            sku: idOf(f.productCode),
            unit: f.unit,
            currentReserved: f.currentReserved.toLocaleString(),
            requestedRelease: f.requestedRelease.toLocaleString(),
          });
      }
    })
    .join('  •  ');
}
