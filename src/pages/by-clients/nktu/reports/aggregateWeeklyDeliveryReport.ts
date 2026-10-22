

import { cMngtConnector } from '@credo/connectors/connector';
import type { DeliveryRequest, DeliveryRequestExtra } from '@/types';
import { deliveryRequestStatusOptions } from '@/pages/delivery-requests/useDeliveryRequestStatusOptions';
import { buildDeliveryWeeklyReport, effectiveDate, sourceHashOf } from './buildDeliveryReport';
import { addDays, resolveIsoWeek, type ResolvedWeek } from './reportPeriods';
import type { DeliveryWeeklyReportData } from './types';

const LOOKBACK_DAYS = 60;
const LOOKAHEAD_DAYS = 14;

export interface WeekRequests {
  week: ResolvedWeek;
  requests: DeliveryRequest[];
  
  sourceHash: string;
}

export async function collectWeekRequests(periodKey: string): Promise<WeekRequests> {
  const week = resolveIsoWeek(periodKey);
  const res = await cMngtConnector.queryDeliveryRequests<DeliveryRequestExtra>({
    fromPeriod: addDays(week.mondayStr, -LOOKBACK_DAYS),
    toPeriod: addDays(week.endStr, LOOKAHEAD_DAYS),
  });
  const requests = res.deliveryRequests.filter((dr) => {
    if (dr.extra?.isDeleted) return false;
    const d = effectiveDate(dr);
    return d >= week.mondayStr && d <= week.endStr;
  });
  return { week, requests, sourceHash: sourceHashOf(requests) };
}

export interface WeekSnapshotInput {
  data: DeliveryWeeklyReportData;
  sourceHash: string;
}

export async function aggregateWeeklyDeliveryReport(periodKey: string): Promise<WeekSnapshotInput> {
  const { week, requests, sourceHash } = await collectWeekRequests(periodKey);
  const data = buildDeliveryWeeklyReport(
    week,
    requests,
    deliveryRequestStatusOptions.statusOptions,
  );
  return { data, sourceHash };
}
