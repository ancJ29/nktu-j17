

import {
  getSalesOrderStatusOptions,
  getSalesOrderStatusTransitions,
  getSalesOrderDeliveryMethodOptions,
  getSalesOrderTagOptions,
  resolveStatusOptions,
  createStatusResolver,
  resolveOptions,
  resolveTagOptions,
  createOptionLabelResolver,
} from '@/utils/permission';

const DEFAULT_DELIVERY_METHODS = [
  { value: 'pickup', label: { en: 'Pickup at warehouse', vi: 'Tự lấy tại kho' } },
  { value: 'post_courier', label: { en: 'Post / Courier', vi: 'Bưu điện / Chuyển phát' } },
  { value: 'truck', label: { en: 'Truck delivery', vi: 'Xe tải' } },
];

const statusOptionsCfg = getSalesOrderStatusOptions();
const deliveryMethodOptionsCfg = getSalesOrderDeliveryMethodOptions();
const tagOptionsCfg = getSalesOrderTagOptions();

const effectiveDmCfg =
  deliveryMethodOptionsCfg.length > 0 ? deliveryMethodOptionsCfg : DEFAULT_DELIVERY_METHODS;

export const salesOrderFieldOptions = {
  statusOptions: resolveStatusOptions(statusOptionsCfg),
  resolveStatus: createStatusResolver(resolveStatusOptions(statusOptionsCfg)),
  statusTransitions: getSalesOrderStatusTransitions(),
  deliveryMethodOptions: resolveOptions(effectiveDmCfg),
  resolveDeliveryMethod: createOptionLabelResolver(resolveOptions(effectiveDmCfg)),
  tagOptions: resolveTagOptions(tagOptionsCfg),
};
