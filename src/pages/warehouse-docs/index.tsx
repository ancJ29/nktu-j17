import { WAREHOUSE_DELIVERY_NOTE_KIND, WAREHOUSE_RECEIPT_KIND } from './kinds';
import { WarehouseDocList } from './WarehouseDocList';
import { WarehouseDocDetail } from './WarehouseDocDetail';
import { WarehouseDocForm } from './WarehouseDocForm';

export const WarehouseReceiptListPage = () => <WarehouseDocList kind={WAREHOUSE_RECEIPT_KIND} />;
export const WarehouseReceiptDetailPage = () => (
  <WarehouseDocDetail kind={WAREHOUSE_RECEIPT_KIND} />
);
export const WarehouseReceiptFormPage = () => <WarehouseDocForm kind={WAREHOUSE_RECEIPT_KIND} />;

export const WarehouseDeliveryNoteListPage = () => (
  <WarehouseDocList kind={WAREHOUSE_DELIVERY_NOTE_KIND} />
);
export const WarehouseDeliveryNoteDetailPage = () => (
  <WarehouseDocDetail kind={WAREHOUSE_DELIVERY_NOTE_KIND} />
);
export const WarehouseDeliveryNoteFormPage = () => (
  <WarehouseDocForm kind={WAREHOUSE_DELIVERY_NOTE_KIND} />
);
