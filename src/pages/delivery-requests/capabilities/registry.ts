import { z } from 'zod';
import type { CapabilityDefinition, CapabilityId, Stage } from './types';

const lockLineEditsConfigSchema = z
  .object({
    fields: z.array(z.enum(['quantity', 'unit', 'price'])).optional(),
  })
  .optional();

export const CAPABILITY_REGISTRY: Record<CapabilityId, CapabilityDefinition> = {
  isInitialStatus: {
    id: 'isInitialStatus',
    label: { en: 'Initial status', vi: 'Trạng thái khởi đầu' },
    description: {
      en: 'New delivery requests start in this status.',
      vi: 'Phiếu giao hàng mới sẽ ở trạng thái này.',
    },
    allowedStages: ['NEW'],
    singleton: true,
  },

  isReleaseTarget: {
    id: 'isReleaseTarget',
    label: { en: 'Release target', vi: 'Đích khi SO sẵn sàng' },
    description: {
      en:
        'When the linked sales order enters a status carrying releasesDR, DRs sitting in ' +
        'their initial status advance to this status. Also used as the initial status when ' +
        'a DR is created against an SO that is already in a releasesDR status.',
      vi:
        'Khi đơn hàng liên quan vào trạng thái mang releasesDR, các phiếu giao hàng đang ở ' +
        'trạng thái khởi đầu sẽ chuyển sang trạng thái này. Cũng được dùng làm trạng thái ' +
        'khởi đầu khi tạo phiếu giao hàng cho đơn hàng đã sẵn sàng.',
    },
    allowedStages: ['IN_PROGRESS'],
    singleton: true,
    optional: true,
  },

  triggersAutoShipping: {
    id: 'triggersAutoShipping',
    label: { en: 'Triggers SO auto-shipping', vi: 'Kích hoạt SO auto-ship' },
    description: {
      en:
        'When the DR enters this status, the linked SO is advanced to its ' +
        "isAutoShippingTarget if the SO's current status carries autoAdvanceOnDispatch. " +
        'Use to deduct inventory via the SO shipsStock handler at dispatch time, ' +
        'so reservations do not stay stuck after the goods leave the warehouse.',
      vi:
        'Khi phiếu giao hàng vào trạng thái này, đơn hàng liên quan sẽ được chuyển sang ' +
        'isAutoShippingTarget nếu trạng thái hiện tại của đơn hàng mang autoAdvanceOnDispatch. ' +
        'Dùng để trừ tồn kho qua handler shipsStock của đơn hàng tại thời điểm xuất kho, ' +
        'tránh việc reservation bị kẹt sau khi hàng đã ra khỏi kho.',
    },
    allowedStages: ['IN_PROGRESS'],
  },

  terminal: {
    id: 'terminal',
    label: { en: 'Terminal', vi: 'Kết thúc' },
    description: {
      en: 'Requests in this status are considered closed for partition / archival purposes.',
      vi: 'Phiếu ở trạng thái này được coi là đã đóng.',
    },
    allowedStages: ['COMPLETED', 'EXCEPTIONAL'],
  },

  lockLineEdits: {
    id: 'lockLineEdits',
    label: { en: 'Lock line edits', vi: 'Khóa sửa dòng' },
    description: {
      en: 'Form disables structural edits on item lines while in this status.',
      vi: 'Form sẽ khóa các sửa đổi trên dòng phiếu khi ở trạng thái này.',
    },
    allowedStages: ['IN_PROGRESS', 'COMPLETED', 'EXCEPTIONAL'],
    configSchema: lockLineEditsConfigSchema,
  },
};

export function getCapability(id: CapabilityId): CapabilityDefinition | undefined {
  return CAPABILITY_REGISTRY[id];
}

export function listCapabilities(): CapabilityDefinition[] {
  return Object.values(CAPABILITY_REGISTRY);
}

export function listCapabilitiesForStage(stage: Stage): CapabilityDefinition[] {
  return Object.values(CAPABILITY_REGISTRY).filter((c) => c.allowedStages.includes(stage));
}
