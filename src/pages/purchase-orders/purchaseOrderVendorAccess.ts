import { perms } from '@/utils/permission';

export const showPurchaseOrderVendor = (): boolean => perms.vendor.canView();
