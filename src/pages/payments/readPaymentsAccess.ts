import { featureFlags } from '@/utils/features';
import { isPricingManagementEnabled } from '@/utils/permission';
import { getModulePermissions } from '@/utils/permissionReader';
import type { PaymentsAccessInput } from './paymentsAccess';

const money = (module: string) => {
  const p = getModulePermissions(module);
  return (p.canView ?? false) && (p.actions?.canViewPrice ?? false);
};

export function readPaymentsAccess(): PaymentsAccessInput {
  return {
    salesOrdersEnabled: featureFlags.salesOrders.enabled,
    purchaseOrdersEnabled: featureFlags.purchaseOrders.enabled,
    pricingEnabled: isPricingManagementEnabled(),
    salesOrderMoney: money('salesOrder'),
    purchaseOrderMoney: money('purchaseOrder'),
  };
}
