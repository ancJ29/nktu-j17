import type { ReportViewProps } from '@/pages/v2/reports/registry';
import type { SalesOrderV2 } from '@/types/sales-order-v2';
import BreakdownReport from './BreakdownReport';

const dimensionOf = (o: SalesOrderV2): { key: string; label: string } => {
  const v = o.extra?.['channel'];
  const s = typeof v === 'string' && v.trim() ? v.trim() : '';

  return s ? { key: s, label: s } : { key: '__none__', label: 'Chưa chọn kênh' };
};

export default function RevenueByChannelReport(props: ReportViewProps) {
  return (
    <BreakdownReport
      {...props}
      title="Doanh thu theo kênh bán"
      subtitle="Đơn hàng đã xác nhận hoặc hoàn tất, theo trường Kênh bán"
      dimensionHeader="Kênh bán"
      dimensionOf={dimensionOf}
    />
  );
}
