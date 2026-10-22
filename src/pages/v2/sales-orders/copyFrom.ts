import { readCustomFieldValue, type ViewerCustomField } from '@/utils/customFields';
import type { SalesOrderV2, SalesOrderV2CopyFrom } from '@/types/sales-order-v2';

export function salesOrderCopyFrom(
  order: SalesOrderV2,

  customFields: readonly ViewerCustomField[],
): SalesOrderV2CopyFrom {
  return {
    ...(order.customerId ? { customerId: order.customerId } : {}),

    ...(order.customerName ? { customerName: order.customerName } : {}),
    ...(order.customerPhone ? { customerPhone: order.customerPhone } : {}),
    ...(order.customerAddress ? { customerAddress: order.customerAddress } : {}),
    ...(order.reference ? { reference: order.reference } : {}),
    ...(order.notes ? { notes: order.notes } : {}),
    items: order.items.map((line) => ({
      itemType: line.itemType,
      itemId: line.itemId,
      quantity: line.quantity,
      itemCode: line.itemCode,
      itemName: line.itemName,

      ...(line.unitPrice !== undefined ? { unitPrice: line.unitPrice } : {}),
      ...(line.unit ? { unit: line.unit } : {}),
      ...(line.note ? { note: line.note } : {}),
    })),
    sourceOrderNumber: order.orderNumber,

    extra: Object.fromEntries(
      customFields.flatMap((field) => {
        const value = readCustomFieldValue(order.extra, field);
        return value === undefined ? [] : [[field.key, value] as const];
      }),
    ),
  };
}
