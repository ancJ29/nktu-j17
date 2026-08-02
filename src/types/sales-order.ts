import type { DateTimeInput, NullableDateTimeInput } from '@credo/kits/types';
import type { CMngtSalesOrder as BaseSalesOrder } from '@credo/connectors/types';
import type { CMngtSalesOrderItem as BaseSalesOrderItem } from '@credo/connectors/types';

export type SalesOrderSetRole = 'set' | 'set-component';

export type SalesOrderItem = BaseSalesOrderItem & {
  groupId?: string;

  role?: SalesOrderSetRole;

  sourceSetCode?: string;

  memo?: string;

  extraQuantity?: number;
};

export type SalesOrderActivityEntry = {
  timestamp: DateTimeInput;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  userId?: string;
  userName?: string;
  note?: string;
};

export type SalesOrderChatEntry = {
  timestamp: DateTimeInput;
  userId?: string;
  userName?: string;
  message: string;
};

export type SalesOrderPhoto = {
  url: string;
  timestamp: DateTimeInput;
  userId?: string;
  userName?: string;
  fileName?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  isDeleted?: boolean;
};

export type SalesOrderAttachment = {
  url: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  timestamp: DateTimeInput;
  userId?: string;
  userName?: string;
  isDeleted?: boolean;
};

export type SalesOrderCancellation = {
  at: DateTimeInput;
  by?: { id: string; name: string };
  reason?: string;
  fromStatus: string;
};

export type InventoryLinkageState = 'none' | 'reserved' | 'shipped' | 'released';

export type BreakdownRemainderCredit = {
  itemCode: string;
  unit: string;
  quantity: number;
};

export type InventoryLinkageSnapshotEntry = {
  rowId: string;
  itemCode: string;
  locationCode: string;

  byUnit: Record<string, number>;

  remainderCredits?: BreakdownRemainderCredit[];
};

export type InventoryLinkageVia =
  | { kind: 'capability'; capabilityId: string; statusValue: string }
  | { kind: 'cancel-auto-release' }
  | { kind: 'manual-release' }
  /**
   * The transition engine synthesised a ship when an order entered a
   * COMPLETED-stage status without ever having passed through a `shipsStock`
   * capability — see "Auto-ship on completion" in
   * `docs/memo/modules/sales-orders.md`. Carries the destination status
   * value so the audit timeline can name where the deduction happened.
   */
  | { kind: 'completion-auto-ship'; statusValue: string }
  /**
   * Form-edit on an already-reserved SO: the operator changed line items
   * (quantity / unit / location / add / remove) and the orchestrator
   * applied the diff to inventory atomically with the SO patch. The
   * timeline names this so the auditor can tell a quantity-edit-driven
   * inventory move apart from a transition-driven one.
   */
  | { kind: 'form-edit-diff' }
  /**
   * The transition engine synthesised a release when an order reverted
   * backward into a DRAFT-stage status (e.g. `new → draft` to re-author the
   * order) while still holding a reservation — see "Auto-release on revert to
   * draft" in `docs/memo/modules/sales-orders.md`. DRAFT-stage statuses carry
   * no inventory capability, so nothing else would give the reservation back;
   * the engine undoes exactly what the snapshot held. Carries the destination
   * status value so the audit timeline can name where the release happened.
   */
  | { kind: 'revert-to-draft'; statusValue: string }
  /**
   * A set product's on-hand changed (an operator composed or decomposed
   * bundles, or received set stock), so the reservation was recomputed in
   * place to reserve the set's own stock first and push the remainder onto
   * its components — see "Set-stock rebalance" in
   * `docs/memo/product-sets.md`. `trigger` names what moved the stock.
   */
  | { kind: 'set-rebalance'; trigger: 'compose' | 'decompose' | 'goods-receipt' }
  /**
   * The detail-page Delete action rolled back the inventory this SO was still
   * holding as part of a soft-delete — either releasing a live reservation or
   * adding back stock that had been shipped (`unship`). Distinguishes a
   * delete-driven inventory move from a cancel-driven one in the audit trail.
   * See `useSalesOrderDetail.handleDelete`.
   */
  | { kind: 'delete-rollback' }
  /**
   * The detail-page delivery-reconciliation repair (`handleReconcileRepair`)
   * moved this order's inventory — realigning a drifted reservation, shipping
   * a completed-but-never-deducted order, or releasing orphaned holds. See
   * `deliveryReconciliation.ts` + "Delivery reconciliation" in
   * `docs/memo/modules/sales-orders.md`.
   */
  | { kind: 'reconcile-repair' };

export type InventoryLinkageTransition = {
  action: 'reserve' | 'ship' | 'release';
  at: DateTimeInput;
  by?: { id: string; name: string };
  via: InventoryLinkageVia;
};

export type PendingInventoryShip = {
  snapshot: InventoryLinkageSnapshotEntry[];
  at: DateTimeInput;
  by?: { id: string; name: string };
  via: InventoryLinkageVia;
};

export type InventoryLinkage = {
  state: InventoryLinkageState;

  reservedSnapshot?: InventoryLinkageSnapshotEntry[];

  shippedSnapshot?: InventoryLinkageSnapshotEntry[];

  pendingShip?: PendingInventoryShip;
  lastTransition?: InventoryLinkageTransition;
};

export type SalesOrderExtra = {
  status?: string;

  readyAt?: number;
  cancellation?: SalesOrderCancellation;
  inventoryLinkage?: InventoryLinkage;

  cheatAutoComplete?: { at: number; drNumbers: string[] };

  isDeleted?: boolean;

  customerName?: string;

  customerCode?: string;

  isIndividualCustomer?: boolean;

  isInternalDelivery?: boolean;

  orderDate?: NullableDateTimeInput;

  customerPONumber?: string;
  deliveryAddress?: string;

  googleMapUrl?: string;
  deliveryDate?: NullableDateTimeInput;
  deliveryMethod?: string;

  deliveryPackageSize?: string;
  assignedStaff?: string;
  createdBy?: string;
  isUrgent?: boolean;
  tags?: string[];

  needVAT?: boolean;

  needShippingFee?: boolean;

  vatRate?: number;

  vatTag?: string;

  shippingFee?: number;

  isPaid?: boolean;

  paidAmount?: number;

  invoiceIssued?: boolean;

  billingNotRequired?: boolean;
  activityLog?: SalesOrderActivityEntry[];
  chatHistory?: SalesOrderChatEntry[];
  photos?: SalesOrderPhoto[];
  attachments?: SalesOrderAttachment[];

  deliveryRequestIds?: string[];

  quotationId?: string;
  quotationCode?: string;

  clientSpecific?: {
    NKTU?: {
      warehouseNote?: string;
      driverNote?: string;

      quotationId?: string;
      quotationCode?: string;
    };
  };
  [key: string]: unknown;
};

export type SalesOrder = Omit<BaseSalesOrder<SalesOrderExtra>, 'items'> & {
  items: SalesOrderItem[];
};
