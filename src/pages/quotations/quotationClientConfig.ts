import { byClient } from '@/config/client';

const NKTU_DEFAULT_NOTE =
  'Báo giá đã bao gồm VAT 8%, thời gian có hàng 6-7 ngày tính từ ngày nhận được tạm ứng 40% tổng đơn hàng';

export const QUOTATION_DEFAULT_NOTE = byClient({ nktu: NKTU_DEFAULT_NOTE }, '');
