export function canRecordSalesOrderPayment(a: {
  readonly showPrice: boolean;
  readonly canManagePayment: boolean;
  readonly cancelled: boolean;
}): boolean {
  return a.showPrice && a.canManagePayment && !a.cancelled;
}
