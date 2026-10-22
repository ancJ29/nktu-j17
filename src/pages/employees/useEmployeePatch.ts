import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { EntityConflictError } from '@/stores/createEntityStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import type { Employee } from '@/types';
import { logActivity } from '@/utils/activityLogger';

export type PatchEmployeeOptions = {
  verb?: string;
  memo?: Record<string, unknown>;

  rethrow?: boolean;
};

export type PatchEmployee = (
  patch: Partial<Employee>,
  opts?: PatchEmployeeOptions,
) => Promise<boolean>;

export function useEmployeePatch(
  id: string | undefined,
  employee: Employee | null,
  onEmployeeChange: (next: Employee) => void,
): PatchEmployee {
  const { t } = useTranslation();

  return useCallback(
    async (patch, opts = {}) => {
      if (!employee || !id) return false;
      try {
        const { item: updated, meta } = await useEmployeeStore.getState().updateSafelyWithMeta({
          id,
          version: employee.version,
          patch,
        });
        onEmployeeChange(updated);
        if (opts.verb) logActivity(opts.verb, id, opts.memo);
        if (meta?.ssoWarning) {
          notifications.show({
            color: 'yellow',
            title: t('employees.notifications.updateSuccess'),
            message: t('employees.notifications.updateSsoWarning', { reason: meta.ssoWarning }),
            autoClose: false,
          });
        } else {
          notifications.show({
            color: 'green',
            message: t('employees.notifications.updateSuccess'),
          });
        }

        if (meta?.loginPassword) {
          notifications.show({
            color: 'teal',
            message: t('employees.notifications.mintedPassword', { password: meta.loginPassword }),
            autoClose: false,
          });
        }
        return true;
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) onEmployeeChange(err.latest as Employee);
          notifications.show({
            color: 'yellow',
            title: t('common.conflict.title'),
            message: t('common.conflict.message'),
            autoClose: 8000,
          });
        } else {
          notifications.show({
            color: 'red',
            message: t('employees.notifications.updateError'),
          });
        }
        if (opts.rethrow) throw err;
        return false;
      }
    },
    [employee, id, onEmployeeChange, t],
  );
}
