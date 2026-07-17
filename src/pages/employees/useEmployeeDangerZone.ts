

import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { cMngtConnector } from '@credo/connectors/connector';
import { PASSWORD_REGEX } from '@credo/kits/string';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { EntityConflictError } from '@/stores/createEntityStore';
import type { Employee } from '@/types';
import { logActivity } from '@/utils/activityLogger';
import { deepDiff } from '@/utils/deepDiff';

export function useEmployeeDangerZone(id: string | undefined, employee: Employee | null) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  
  
  
  const [updatedEmployee, setUpdatedEmployee] = useState<Employee | null>(null);

  
  const surfaceConflict = useCallback(
    (latest: Employee) => {
      setUpdatedEmployee(latest);
      notifications.show({
        color: 'yellow',
        title: t('common.conflict.title'),
        message: t('common.conflict.message'),
        autoClose: 8000,
      });
    },
    [t],
  );

  
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!id || !employee) return;
    setDeleting(true);
    try {
      const { meta } = await useEmployeeStore.getState().updateSafelyWithMeta({
        id,
        version: employee.version,
        patch: {
          isActive: false,
          extra: { ...employee.extra, isDeleted: true },
        },
      });
      logActivity('employee.delete', id);

      
      
      
      
      if (meta?.ssoWarning) {
        notifications.show({
          color: 'yellow',
          title: t('__new__.07-entities.employees.dangerZone.disableSsoWarningTitle'),
          message: meta.ssoWarning,
          autoClose: false,
        });
        return;
      }

      notifications.show({
        color: 'green',
        message: t('employees.notifications.deleteSuccess'),
      });
      navigate(ROUTES.EMPLOYEES.LIST);
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) surfaceConflict(err.latest as Employee);
      } else {
        notifications.show({
          color: 'red',
          message: t('employees.notifications.deleteError'),
        });
      }
    } finally {
      setDeleting(false);
      closeDeleteModal();
    }
  }, [id, employee, t, navigate, closeDeleteModal, surfaceConflict]);

  
  const [passwordModalOpened, { open: openPasswordModal, close: closePasswordModal }] =
    useDisclosure(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  
  
  const [savedPassword, setSavedPassword] = useState<string | null>(null);

  const passwordForm = useForm({
    initialValues: {
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      newPassword: (v) => {
        if (!v.trim()) return t('__new__.07-entities.employees.dangerZone.passwordRequired');
        if (!PASSWORD_REGEX.test(v))
          return t('__new__.07-entities.employees.dangerZone.passwordPolicy');
        return null;
      },
      confirmPassword: (v, values) =>
        v !== values.newPassword
          ? t('__new__.07-entities.employees.dangerZone.passwordMismatch')
          : null,
    },
  });

  const handlePasswordChange = useCallback(
    async (values: { newPassword: string; confirmPassword: string }) => {
      if (!id) return;
      setChangingPassword(true);
      try {
        
        
        const res = await cMngtConnector.updateEmployeeLoginPassword({
          id,
          password: values.newPassword,
        });
        logActivity('employee.passwordChange', id);

        
        
        
        
        
        
        
        if (res.ssoWarning) {
          notifications.show({
            color: 'yellow',
            title: t('__new__.07-entities.employees.dangerZone.passwordChangeWarningTitle'),
            message: t('__new__.07-entities.employees.dangerZone.passwordChangeWarning'),
            autoClose: false,
          });
        } else {
          notifications.show({
            color: 'green',
            message: t('__new__.07-entities.employees.dangerZone.passwordChangeSuccess'),
          });
        }
        
        setSavedPassword(values.newPassword);
      } catch {
        notifications.show({
          color: 'red',
          message: t('__new__.07-entities.employees.dangerZone.passwordChangeError'),
        });
      } finally {
        setChangingPassword(false);
      }
    },
    [id, t],
  );

  const closePasswordModalAndReset = useCallback(() => {
    closePasswordModal();
    passwordForm.reset();
    setSavedPassword(null);
  }, [closePasswordModal, passwordForm]);

  
  const [toggleStatusOpened, { open: openToggleStatus, close: closeToggleStatus }] =
    useDisclosure(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const handleToggleStatus = useCallback(async () => {
    if (!id || !employee) return;
    setTogglingStatus(true);
    try {
      const newIsActive = !employee.isActive;
      const { item: updated, meta } = await useEmployeeStore.getState().updateSafelyWithMeta({
        id,
        version: employee.version,
        patch: { isActive: newIsActive },
      });
      logActivity(
        'employee.toggleStatus',
        id,
        deepDiff({ isActive: employee.isActive }, { isActive: newIsActive }),
      );
      setUpdatedEmployee(updated);

      
      
      
      
      
      if (meta?.ssoWarning) {
        notifications.show({
          color: 'yellow',
          title: newIsActive
            ? t('__new__.07-entities.employees.dangerZone.enableSsoWarningTitle')
            : t('__new__.07-entities.employees.dangerZone.disableSsoWarningTitle'),
          message: meta.ssoWarning,
          autoClose: false,
        });
      } else {
        notifications.show({
          color: 'green',
          message: newIsActive
            ? t('__new__.07-entities.employees.dangerZone.enableSuccess')
            : t('__new__.07-entities.employees.dangerZone.disableSuccess'),
        });
      }

      
      
      if (meta?.loginPassword) {
        setSavedPassword(meta.loginPassword);
        openPasswordModal();
      }

      closeToggleStatus();
    } catch (err) {
      if (err instanceof EntityConflictError) {
        if (err.latest) surfaceConflict(err.latest as Employee);
        closeToggleStatus();
      } else {
        notifications.show({
          color: 'red',
          message: t('__new__.07-entities.employees.dangerZone.disableError'),
        });
      }
    } finally {
      setTogglingStatus(false);
    }
  }, [id, employee, t, closeToggleStatus, surfaceConflict, openPasswordModal]);

  return {
    
    deleteModalOpened,
    openDeleteModal,
    closeDeleteModal,
    deleting,
    handleDelete,
    
    passwordModalOpened,
    openPasswordModal,
    closePasswordModalAndReset,
    changingPassword,
    passwordForm,
    handlePasswordChange,
    
    savedPassword,
    
    toggleStatusOpened,
    openToggleStatus,
    closeToggleStatus,
    togglingStatus,
    handleToggleStatus,
    
    updatedEmployee,
  };
}
