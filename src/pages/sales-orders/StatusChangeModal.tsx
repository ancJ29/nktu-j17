import type { TFunction } from 'i18next';
import { StatusChangeModal as SharedStatusChangeModal } from '@/components/StatusChangeModal';

type StatusChangeModalProps = {
  opened: boolean;
  onClose: () => void;
  
  targetStatus: { value: string; label: string; actionLabel: string } | null;
  currentStatus: { value: string; label: string; color: string };
  note: string;
  onNoteChange: (v: string) => void;
  onConfirm: () => void;
  loading: boolean;
  t: TFunction;
};

export function StatusChangeModal({
  opened,
  onClose,
  targetStatus,
  currentStatus,
  note,
  onNoteChange,
  onConfirm,
  loading,
  t,
}: StatusChangeModalProps) {
  if (!targetStatus) return null;

  return (
    <SharedStatusChangeModal
      opened={opened}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      title={t('salesOrders.statusChange.confirmTitle')}
      message={t('salesOrders.statusChange.confirmMessage', {
        from: currentStatus.label,
        to: targetStatus.label,
      })}
      confirmLabel={targetStatus.actionLabel}
      note={note}
      onNoteChange={onNoteChange}
      notePlaceholder={t('salesOrders.statusChange.notePlaceholder')}
    />
  );
}
