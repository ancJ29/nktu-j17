import {
  IconChartPie,
  IconCoin,
  IconPackage,
  IconPackageImport,
  IconTruckDelivery,
  IconUsers,
} from '@tabler/icons-react';
import type { ClientReportEntry } from '@/pages/v2/reports/registry';
import DeliveriesReport from './DeliveriesReport';
import ReceivingReport from './ReceivingReport';
import RevenueByChannelReport from './RevenueByChannelReport';
import RevenueReport from './RevenueReport';
import TopCustomersReport from './TopCustomersReport';
import TopProductsReport from './TopProductsReport';

export const ACME_REPORTS: ClientReportEntry[] = [
  {
    key: 'revenue',
    title: 'Doanh thu',
    desc: 'Doanh thu theo ngày, tuần hoặc tháng — tính trên đơn hàng đã xác nhận hoặc hoàn tất.',
    icon: IconCoin,
    color: 'primary',
    Component: RevenueReport,
  },
  {
    key: 'revenue-by-channel',
    title: 'Doanh thu theo kênh bán',
    desc: 'Trực tiếp, đại lý hay online — doanh thu và số đơn theo từng kênh.',
    icon: IconChartPie,
    color: 'teal',
    Component: RevenueByChannelReport,
  },
  {
    key: 'top-customers',
    title: 'Khách hàng theo doanh thu',
    desc: 'Xếp hạng khách hàng theo doanh thu và số đơn trong kỳ.',
    icon: IconUsers,
    color: 'indigo',
    Component: TopCustomersReport,
  },
  {
    key: 'top-products',
    title: 'Sản phẩm bán ra',
    desc: 'Số lượng và doanh thu theo từng sản phẩm, xếp hạng trong kỳ.',
    icon: IconPackage,
    color: 'orange',
    Component: TopProductsReport,
  },
  {
    key: 'deliveries',
    title: 'Tình hình giao hàng',
    desc: 'Phiếu giao đã giao, đang thực hiện, đã huỷ — theo nhân viên phụ trách.',
    icon: IconTruckDelivery,
    color: 'grape',
    Component: DeliveriesReport,
  },
  {
    key: 'receiving',
    title: 'Nhập hàng theo nhà cung cấp',
    desc: 'Phiếu nhập đã nhận và số dòng hàng, theo từng nhà cung cấp.',
    icon: IconPackageImport,
    color: 'cyan',
    Component: ReceivingReport,
  },
];
