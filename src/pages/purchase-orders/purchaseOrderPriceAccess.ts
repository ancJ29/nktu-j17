import type { PurchaseOrder } from '@/types';
import { isPricingManagementEnabled, perms } from '@/utils/permission';
import { hasPrice, lineTypedTax, poCurrency, poItems } from './purchaseOrderModel';

export const isPriceBlindAuthor = (): boolean =>
  isPricingManagementEnabled() && !perms.purchaseOrder.canViewPrice();

export function carriesPriceFigure(order: PurchaseOrder): boolean {
  const currency = poCurrency(order);
  return poItems(order).some((i) => hasPrice(i) || lineTypedTax(i, currency) !== undefined);
}
