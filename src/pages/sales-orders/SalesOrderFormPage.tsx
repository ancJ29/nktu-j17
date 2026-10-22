import { SalesOrderForm } from './SalesOrderForm';
import { DEFAULT_SALES_ORDER_FORM_VARIANT } from './salesOrderFormVariant';

export function SalesOrderFormPage() {
  return <SalesOrderForm variant={DEFAULT_SALES_ORDER_FORM_VARIANT} />;
}
