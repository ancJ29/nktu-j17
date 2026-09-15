import type { ReportViewProps } from '@/pages/v2/reports/registry';
import type { SalesOrderV2 } from '@/types/sales-order-v2';
import BreakdownReport, { type BreakdownReportProps } from './BreakdownReport';
import { customerLink, salesOrdersLink } from './reportShared';

const dimensionOf = (o: SalesOrderV2): { key: string; label: string } =>
  o.customerId
    ? { key: o.customerId, label: o.customerName || o.customerCode || o.customerId }
    : { key: '__none__', label: 'Không có khách hàng' };

const NONE = '__none__';

const links: NonNullable<BreakdownReportProps['links']> = {
  entry: (e) => (e.key === NONE ? undefined : customerLink(e.key)),
  orders: (e, range) =>
    e.key === NONE || e.orders === 0 ? undefined : salesOrdersLink(range, { customerId: e.key }),
};

export default function TopCustomersReport(props: ReportViewProps) {
  return (
    <BreakdownReport
      {...props}
      title="Khách hàng theo doanh thu"
      subtitle="Đơn hàng đã xác nhận hoặc hoàn tất, xếp hạng theo khách"
      dimensionHeader="Khách hàng"
      dimensionOf={dimensionOf}
      links={links}
    />
  );
}
