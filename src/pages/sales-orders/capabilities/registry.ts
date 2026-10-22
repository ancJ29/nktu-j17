import type { CapabilityDefinition, CapabilityId, Stage } from './types';
import { z } from 'zod';

const lockLineEditsConfigSchema = z
  .object({
    fields: z.array(z.enum(['quantity', 'unit', 'price', 'fromLocation'])).optional(),
  })
  .optional();

const canCreateDRConfigSchema = z
  .object({
    minRemainder: z.number().nonnegative().optional(),
  })
  .optional();

export const CAPABILITY_REGISTRY: Record<CapabilityId, CapabilityDefinition> = {
  isInitialStatus: {
    id: 'isInitialStatus',
    label: { en: 'Initial status', vi: 'Trạng thái khởi đầu' },
    description: {
      en:
        'New orders start in this status. Allowed on DRAFT (pre-acceptance authoring) ' +
        'or NEW (first post-acceptance stage). When set on DRAFT and ' +
        '`features.salesOrders.allowSkipInitialStage` is true, the create form lets ' +
        'the operator skip DRAFT and go straight to the next status.',
      vi:
        'Đơn hàng mới sẽ ở trạng thái này. Cho phép trên DRAFT (giai đoạn nháp) hoặc ' +
        'NEW (giai đoạn chính thức đầu tiên). Khi đặt trên DRAFT và ' +
        '`features.salesOrders.allowSkipInitialStage` bật, form tạo đơn cho phép bỏ ' +
        'qua DRAFT và sang luôn trạng thái kế.',
    },
    allowedStages: ['DRAFT', 'NEW'],
    singleton: true,
  },

  isAutoCompletionTarget: {
    id: 'isAutoCompletionTarget',
    label: { en: 'Auto-completion target', vi: 'Đích tự động hoàn thành' },
    description: {
      en: 'When all linked DRs report full delivery, the order auto-advances to this status.',
      vi: 'Khi tất cả DR liên quan báo đã giao đủ, đơn hàng tự động chuyển vào trạng thái này.',
    },
    allowedStages: ['COMPLETED'],
    singleton: true,
  },

  isAutoShippingTarget: {
    id: 'isAutoShippingTarget',
    label: { en: 'Auto-shipping target', vi: 'Đích tự động xuất kho' },
    description: {
      en:
        'When a linked DR transitions to a triggersAutoShipping status, the order auto-' +
        'advances to this status (which should carry shipsStock so inventory deducts ' +
        'properly at dispatch time).',
      vi:
        'Khi phiếu giao hàng liên quan chuyển sang trạng thái mang triggersAutoShipping, ' +
        'đơn hàng tự động chuyển sang trạng thái này (nên mang shipsStock để trừ tồn kho ' +
        'đúng lúc xuất kho).',
    },
    allowedStages: ['IN_PROGRESS'],
    singleton: true,
    optional: true,
  },

  isCancellationTarget: {
    id: 'isCancellationTarget',
    label: { en: 'Cancellation target', vi: 'Đích khi hủy' },
    description: {
      en:
        'When set, the Cancel button transitions the order into this status (in addition to ' +
        'setting the orthogonal cancellation flag). Leave unset to keep cancellation as a pure ' +
        'flag without a status change.',
      vi:
        'Khi được đặt, nút Hủy sẽ chuyển đơn hàng sang trạng thái này (cùng với cờ hủy độc lập). ' +
        'Bỏ trống để giữ hành vi cũ — chỉ đặt cờ, không đổi trạng thái.',
    },
    allowedStages: ['EXCEPTIONAL'],
    singleton: true,
    optional: true,
  },

  terminal: {
    id: 'terminal',
    label: { en: 'Terminal', vi: 'Kết thúc' },
    description: {
      en: 'Orders in this status are considered closed for partition / archival purposes.',
      vi: 'Đơn hàng ở trạng thái này được coi là đã đóng.',
    },
    allowedStages: ['COMPLETED', 'EXCEPTIONAL'],
  },

  lockLineEdits: {
    id: 'lockLineEdits',
    label: { en: 'Lock line edits', vi: 'Khóa sửa dòng' },
    description: {
      en: 'Form disables structural edits on order lines while in this status.',
      vi: 'Form sẽ khóa các sửa đổi trên dòng đơn hàng khi ở trạng thái này.',
    },
    allowedStages: ['IN_PROGRESS', 'COMPLETED', 'EXCEPTIONAL'],
    configSchema: lockLineEditsConfigSchema,
  },

  canCreateDR: {
    id: 'canCreateDR',
    label: { en: 'Can create delivery request', vi: 'Có thể tạo phiếu giao hàng' },
    description: {
      en: 'Detail page surfaces a "Create Delivery Request" button while in this status.',
      vi: 'Trang chi tiết hiện nút "Tạo yêu cầu giao nhận" khi ở trạng thái này.',
    },
    allowedStages: ['IN_PROGRESS'],
    configSchema: canCreateDRConfigSchema,
  },

  autoAdvanceOnFullDelivery: {
    id: 'autoAdvanceOnFullDelivery',
    label: { en: 'Auto-advance on full delivery', vi: 'Tự động chuyển khi giao đủ' },
    description: {
      en:
        'When all linked DRs report full delivery, advance the order from this status to ' +
        'the configured auto-completion target.',
      vi:
        'Khi tất cả DR liên quan báo đã giao đủ, chuyển đơn từ trạng thái này sang ' +
        'trạng thái đích đã cấu hình.',
    },
    allowedStages: ['IN_PROGRESS'],
  },

  autoAdvanceOnDispatch: {
    id: 'autoAdvanceOnDispatch',
    label: { en: 'Auto-advance on DR dispatch', vi: 'Tự động chuyển khi DR xuất kho' },
    description: {
      en:
        'When any linked DR enters a triggersAutoShipping status, advance the order from ' +
        'this status to the configured auto-shipping target. Used so the SO shipsStock ' +
        'handler fires automatically at dispatch time rather than leaving reservations ' +
        'stuck after goods leave the warehouse.',
      vi:
        'Khi bất kỳ phiếu giao hàng nào vào trạng thái triggersAutoShipping, chuyển đơn ' +
        'từ trạng thái này sang trạng thái auto-shipping đã cấu hình. Dùng để handler ' +
        'shipsStock tự động chạy lúc xuất kho, tránh reservation bị kẹt sau khi hàng đã ' +
        'ra khỏi kho.',
    },
    allowedStages: ['IN_PROGRESS'],
  },

  releasesDR: {
    id: 'releasesDR',
    label: { en: 'Releases linked DRs', vi: 'Mở khóa phiếu giao hàng liên quan' },
    description: {
      en:
        'On entry, advance every linked DR currently in its initial status to the DR ' +
        'status carrying isReleaseTarget. Best-effort follow-up: failures show a yellow ' +
        'toast but never block the SO transition.',
      vi:
        'Khi vào trạng thái này, mọi phiếu giao hàng đang ở trạng thái khởi đầu sẽ được ' +
        'tự động chuyển sang trạng thái mang isReleaseTarget. Best-effort: lỗi sẽ hiển thị ' +
        'cảnh báo nhưng không chặn chuyển trạng thái đơn hàng.',
    },
    allowedStages: ['IN_PROGRESS'],
  },

  reservesStock: {
    id: 'reservesStock',
    label: { en: 'Reserves stock', vi: 'Giữ hàng' },
    description: {
      en:
        "Reserves per-line stock at each line's picking location on entry. " +
        'Shortage behavior is driven by the global `features.salesOrders.shortagePolicy` ' +
        'flag (block / allow); the previous per-binding `blockOnShortage` config is gone.',
      vi:
        'Giữ hàng theo từng dòng tại địa điểm lấy hàng khi chuyển vào trạng thái. ' +
        'Cách xử lý khi thiếu hàng được điều khiển bởi cờ chung ' +
        '`features.salesOrders.shortagePolicy` (block / allow); cấu hình `blockOnShortage` ' +
        'theo từng binding trước đây đã được loại bỏ.',
    },
    allowedStages: ['IN_PROGRESS'],
    conflictsWith: ['shipsStock'],
    priority: 100,
    onEnter: 'reserve',
  },

  autoShipsOnCompletion: {
    id: 'autoShipsOnCompletion',
    label: { en: 'Auto-ships on completion', vi: 'Tự động xuất kho khi hoàn tất' },
    description: {
      en:
        'Auto-bound to every COMPLETED-stage status. When entering a ' +
        'COMPLETED-stage status while still holding a reservation (and no ' +
        '`shipsStock` cap fired explicitly), the engine ships from the ' +
        'linkage snapshot. Configuring this capability explicitly is a docs ' +
        'choice — the behavior fires regardless.',
      vi:
        'Tự động áp dụng cho mọi trạng thái ở giai đoạn COMPLETED. Khi đơn ' +
        'vào trạng thái COMPLETED mà vẫn đang giữ tồn (và không có ' +
        '`shipsStock` được kích hoạt rõ ràng), engine sẽ xuất kho từ snapshot. ' +
        'Cấu hình rõ ràng capability này là vì mục đích tài liệu — hành vi ' +
        'vẫn chạy dù có khai báo hay không.',
    },
    allowedStages: ['COMPLETED'],
    optional: true,
  },

  shipsStock: {
    id: 'shipsStock',
    label: { en: 'Ships stock', vi: 'Xuất kho' },
    description: {
      en:
        'Deducts on-hand and releases the matching reservation atomically per row. ' +
        "Requires a prior reserving status in the order's history. Allowed on " +
        'IN_PROGRESS (explicit "Shipped" step) or COMPLETED (one-shot ship-and-close).',
      vi:
        'Trừ tồn kho và giải phóng phần đã giữ tương ứng trên cùng một bản ghi. ' +
        'Yêu cầu trước đó đơn đã đi qua một trạng thái có giữ hàng. Cho phép trên ' +
        'IN_PROGRESS (bước "Đã gửi" rõ ràng) hoặc COMPLETED (gộp xuất kho + đóng đơn).',
    },
    allowedStages: ['IN_PROGRESS', 'COMPLETED'],
    requires: ['reservesStock'],
    supersedes: ['reservesStock'],
    priority: 200,
    onEnter: 'ship',
  },
};

export function getCapability(id: CapabilityId): CapabilityDefinition | undefined {
  return CAPABILITY_REGISTRY[id];
}

export function listCapabilitiesForStage(stage: Stage): CapabilityDefinition[] {
  return Object.values(CAPABILITY_REGISTRY).filter((c) => c.allowedStages.includes(stage));
}
