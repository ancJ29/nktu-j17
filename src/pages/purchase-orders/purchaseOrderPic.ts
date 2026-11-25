export function defaultPurchaseOrderPic<E extends { id: string }>(
  creator: E | undefined,
  isPic: (e: E) => boolean,
): string {
  return creator && isPic(creator) ? creator.id : '';
}
