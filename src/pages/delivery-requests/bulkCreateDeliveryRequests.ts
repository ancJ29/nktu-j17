import { appConfig } from '@/config';
import { buildDailySequentialCode, businessDateString } from '@/utils/code';
import { cMngtConnector } from '@credo/connectors/connector';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { logActivity } from '@/utils/activityLogger';
import { getCurrentEmployeeStamp } from '@/hooks/useCurrentEmployee';
import { statusHasCapability as soStatusHasCapability } from '@/pages/sales-orders/transitionEngine';
import { getInitialStatusValue, getInitialStatusValueForCreate } from './transitionEngine';
import { partyMemo } from './activityMemo';
import {
  mergeSalesOrderDriverNote,
  salesOrderHasLinkedDeliveryRequest,
} from './createDeliveryRequest';
import { linkDRToSalesOrder } from './linkToSalesOrder';
import type {
  DeliveryRequestActivityEntry,
  DeliveryRequestExtra,
  Employee,
  SalesOrder,
  SalesOrderExtra,
} from '@/types';

const deliveryRequestCodePrefix = appConfig.features.deliveryRequests.codePrefix;

export type BulkDrFailure = { salesOrderNumber: string; reason: string };

export type BulkDrCreateResult = {
  created: { id: string; requestNumber: string; salesOrderNumber: string }[];

  failures: BulkDrFailure[];

  linkFailures: number;
};

export type BulkDrCreateInput = {
  salesOrders: SalesOrder[];

  driver: Employee;

  scheduledDate: Date | null;

  notes?: string;

  isUrgent?: boolean;

  resolveCustomerName: (so: SalesOrder) => string | undefined;
};

export async function bulkCreateOutboundDeliveryRequests(
  input: BulkDrCreateInput,
): Promise<BulkDrCreateResult> {
  const { salesOrders, driver, scheduledDate, resolveCustomerName } = input;
  const stamp = getCurrentEmployeeStamp();
  const scheduledIso = scheduledDate ? scheduledDate.toISOString() : undefined;
  const sharedNotes = input.notes?.trim() ?? '';

  const today = businessDateString();
  const todays = await cMngtConnector.queryDeliveryRequests<DeliveryRequestExtra>({
    fromPeriod: today,
    toPeriod: today,
  });
  const allocated = todays.deliveryRequests.map((r) => r.requestNumber);

  const defaultStatus = getInitialStatusValue() ?? '';
  const created: BulkDrCreateResult['created'] = [];
  const failures: BulkDrFailure[] = [];
  let linkFailures = 0;

  for (const so of salesOrders) {
    try {
      const soExtra = (so.extra ?? {}) as SalesOrderExtra;
      const soStatus = soExtra.status ?? '';

      const soStatusCarriesReleasesDR = !!soStatus && soStatusHasCapability(soStatus, 'releasesDR');
      const initialStatus =
        getInitialStatusValueForCreate({ soStatusCarriesReleasesDR }) ?? defaultStatus;

      const createdEntry: DeliveryRequestActivityEntry = {
        timestamp: new Date().toISOString(),
        action: 'created',
        toStatus: initialStatus,
        ...stamp,
      };

      const customerName = resolveCustomerName(so) ?? '';

      const customerCode = soExtra.customerCode?.trim() ?? '';
      const deliveryAddress = soExtra.deliveryAddress ?? '';
      const googleMapUrl = soExtra.googleMapUrl ?? '';

      const extra: DeliveryRequestExtra = {
        status: initialStatus,
        activityLog: [createdEntry],
        deliveryAddress,
        ...(customerCode && { customerCode }),
        ...(googleMapUrl && { googleMapUrl }),
        assignedDriverId: driver.id,
        assignedDriverName: driver.name,
        ...(input.isUrgent && { isUrgent: true }),

        ...(salesOrderHasLinkedDeliveryRequest(so.id) && { isAdditional: true }),
      };

      const requestNumber = buildDailySequentialCode(deliveryRequestCodePrefix, allocated);

      const res = await cMngtConnector.createDeliveryRequest<DeliveryRequestExtra>({
        requestNumber,
        direction: 'outbound',
        salesOrderId: so.id,
        salesOrderNumber: so.orderNumber,
        customerName,
        vendorCode: '',
        vendorName: '',
        scheduledDate: scheduledIso,

        notes: mergeSalesOrderDriverNote(sharedNotes, so),
        items: [],
        extra,
      });

      allocated.push(requestNumber);
      created.push({ id: res.deliveryRequest.id, requestNumber, salesOrderNumber: so.orderNumber });

      logActivity('deliveryRequest.create', res.deliveryRequest.id, {
        requestNumber,
        ...partyMemo({
          direction: 'outbound',
          salesOrderId: so.id,
          salesOrderNumber: so.orderNumber,
          customerCode,
          customerName,
        }),
        lineCount: 0,
        items: [],
      });

      try {
        await linkDRToSalesOrder(so.id, res.deliveryRequest.id);
      } catch {
        linkFailures += 1;
      }
    } catch (err) {
      failures.push({
        salesOrderNumber: so.orderNumber,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (created.length > 0) useDeliveryRequestStore.getState().invalidate();

  return { created, failures, linkFailures };
}
