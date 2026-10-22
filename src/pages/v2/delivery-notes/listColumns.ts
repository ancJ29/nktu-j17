import { appConfig } from '@/config';
import type { CMngtAppConfig } from '@/config/schema';

export const DELIVERY_NOTE_LIST_COLUMNS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'noteNumber', label: 'Number' },
  { key: 'salesOrderNumber', label: 'Sales order' },
  { key: 'customerName', label: 'Customer' },
  { key: 'deliveryType', label: 'Carried by' },
  { key: 'assignedToName', label: 'Assigned to' },
  { key: 'deliveryDate', label: 'Delivery date' },
  { key: 'items', label: 'Lines' },
  { key: 'totalQuantity', label: 'Total qty' },
  { key: 'status', label: 'Status' },
];

export const deliveryNoteListColumns: string[] =
  (appConfig as unknown as CMngtAppConfig)?.features?.deliveryNotesV2?.listColumns ?? [];

export const deliveryNoteHiddenColumns: string[] =
  (appConfig as unknown as CMngtAppConfig)?.features?.deliveryNotesV2?.hiddenColumns ?? [];
