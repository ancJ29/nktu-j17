import { Button, CopyButton, Group, Modal, PasswordInput, Stack, Tooltip } from '@mantine/core';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DetailField } from '@/components/DetailField';
import { IconCheck, IconCopy, IconRefresh } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { AUTO_LOGIN_DOMAIN } from '@/utils/loginEmail';
import { generatePassword } from '@credo/kits/string';
import { asyncDeduplicator, device } from '@credo/base-ui/utils';
import { notifications } from '@mantine/notifications';
import type { Employee } from '@/types';
import {
  hasAllowLoginForEmployees,
  hasAvatarForEmployees,
  hasLoginViaQRCode,
  isDriverDepartment,
  deepMergePermissions,
  isActivityLoggingEnabled,
  isPermissionManagementEnabled,
  isPermissionManagementRootUserOnly,
  perms,
} from '@/utils/permission';
import { appConfig } from '@/config';
import { BASE_PERMISSIONS, type PartialPermissions } from '@/types/permissions';
import type { CMngtAppConfig } from '@credo/kits/types';
import { EmployeeActivityPanel } from '../EmployeeActivityPanel';
import { EmployeeDetailHeader } from './EmployeeDetailHeader';
import { EmployeeDriverTab } from './EmployeeDriverTab';
import { EmployeeQuickActionsCard } from './EmployeeQuickActionsCard';
import { EmployeeDangerZoneCard } from './EmployeeDangerZoneCard';
import {
  EmployeeContactsCard,
  EmployeeNotesCard,
  EmployeePersonalCard,
  EmployeeTimesheetTab,
} from './EmployeeInfoCards';
import { EmployeeLoginTokenModal } from '../EmployeeLoginTokenModal';
import { EmployeeProfileImageModal } from '../EmployeeProfileImageModal';
import { PermissionsPanel } from '@/pages/profile/PermissionsPanel';
import { useEmployeeDangerZone } from '../useEmployeeDangerZone';
import { useEmployeeFieldOptions } from '../useEmployeeFieldOptions';
import { useEmployeePatch } from '../useEmployeePatch';
import { useIsRoot } from '@/hooks/useIsRoot';
import { fetchEmployeeById, useEmployeeStore } from '@/stores/useEmployeeStore';
import { deepDiff } from '@/utils/deepDiff';
import { useDisclosure } from '@mantine/hooks';
import { Form } from '@/components/Form';

const hasQRLogin = hasLoginViaQRCode();
const hasAllowLogin = hasAllowLoginForEmployees();
const hasAvatar = hasAvatarForEmployees();
const isMobile = device.isMobile;
const canEdit = perms.employee.canEdit();
const canIssueMagicLink = perms.employee.canIssueMagicLink();
const canViewActivityLog = perms.employee.canViewActivityLog();
const permMngtEnabled = isPermissionManagementEnabled();
const permMngtRootUserOnly = isPermissionManagementRootUserOnly();
const activityLoggingEnabled = isActivityLoggingEnabled();
const activityTabVisible = activityLoggingEnabled && canViewActivityLog;
const hasViewPermsRight = permMngtEnabled && perms.permissionManagement.canView();
const hasModifyPermsRight = hasViewPermsRight && perms.permissionManagement.canModify();

export type EmployeeDetailParts =
  | { ready: false; loading: boolean }
  | {
      ready: true;
      employee: Employee;
      canEdit: boolean;

      header: ReactNode;

      cards: {
        personal: ReactNode;
        contacts: ReactNode;
        notes: ReactNode;
        quickActions: ReactNode;
        dangerZone: ReactNode;
      };
      tabs: {
        value: string | null;
        onChange: (value: string | null) => void;
        isDriver: boolean;
        showActivity: boolean;
        showPermissions: boolean;
      };

      panels: {
        timesheet: ReactNode;
        driver: ReactNode;
        activity: ReactNode;
        permissions: ReactNode;
      };

      modals: ReactNode;
    };

export function useEmployeeDetail(): EmployeeDetailParts {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isRootUser = useIsRoot();
  const canViewPerms = hasViewPermsRight && (!permMngtRootUserOnly || isRootUser);
  const canModifyPerms = hasModifyPermsRight && (!permMngtRootUserOnly || isRootUser);
  const { resolveDepartment, resolvePosition } = useEmployeeFieldOptions();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>('details');
  const [loginTokenOpened, { open: openLoginToken, close: closeLoginToken }] = useDisclosure(false);
  const [profileImageOpened, { open: openProfileImage, close: closeProfileImage }] =
    useDisclosure(false);

  const dangerZone = useEmployeeDangerZone(id, employee);

  const isActivityTabVisible = useMemo(() => {
    if (!activityLoggingEnabled) return false;
    if (isRootUser) return true;
    return activityTabVisible;
  }, [isRootUser]);

  useEffect(() => {
    if (dangerZone.updatedEmployee) {
      setEmployee(dangerZone.updatedEmployee);
    }
  }, [dangerZone.updatedEmployee]);

  const allowLogin = useMemo(() => {
    if (!hasAllowLogin || !hasQRLogin || !employee?.isActive) {
      return false;
    }
    if (!canIssueMagicLink) {
      return false;
    }
    return employee?.extra?.allowLogin ?? true;
  }, [employee]);

  const department = employee?.department;
  const resolvedDeptPerms = useMemo(() => {
    const clientPerms = (appConfig as CMngtAppConfig).permissions;
    const afterClient = deepMergePermissions(BASE_PERMISSIONS, clientPerms);
    if (!department) return afterClient;
    const deptOptions = (appConfig as CMngtAppConfig).features?.employees?.departmentOptions ?? [];
    const deptOpt = deptOptions.find((d) => d.value === department);
    return deepMergePermissions(afterClient, deptOpt?.permissions);
  }, [department]);

  const inlineEditLabels = useMemo(
    () => ({
      edit: t('common.actions.edit'),
      save: t('common.actions.save'),
      cancel: t('common.actions.cancel'),
    }),
    [t],
  );

  const patchEmployee = useEmployeePatch(id, employee, setEmployee);

  const handleEmailSave = useCallback(
    async (next: string) => {
      const patch = { email: next.trim() };
      await patchEmployee(patch, {
        verb: 'employee.update',
        memo: deepDiff({ email: employee?.email }, patch),
        rethrow: true,
      });
    },
    [employee, patchEmployee],
  );

  const handleNoteSave = useCallback(
    async (next: string) => {
      const note = next.trim() || undefined;
      await patchEmployee(
        { extra: { ...employee?.extra, note } },
        {
          verb: 'employee.update',
          memo: deepDiff({ note: employee?.extra?.note }, { note }),
          rethrow: true,
        },
      );
    },
    [employee, patchEmployee],
  );

  const handlePermissionsSave = useCallback(
    async (next: PartialPermissions) => {
      const permissions = Object.keys(next).length > 0 ? next : undefined;
      await patchEmployee(
        {
          extra: {
            ...employee?.extra,
            permissions,
            permissionsVersion: `v_${Date.now().toString(36)}`,
          },
        },
        {
          verb: 'employee.updatePermissions',
          memo: deepDiff({ permissions: employee?.extra?.permissions }, { permissions }),
        },
      );
    },
    [employee, patchEmployee],
  );

  useEffect(() => {
    if (!id) return;
    const cached = useEmployeeStore.getState().getById(id) as Employee | undefined;
    if (cached) {
      if (cached.extra?.isDeleted) {
        navigate(ROUTES.EMPLOYEES.LIST, { replace: true });
        return;
      }

      setEmployee(cached);
      setLoading(false);
      return;
    }
    setLoading(true);

    asyncDeduplicator.call(`employee:${id}`, async () => {
      await fetchEmployeeById(id)
        .then((employee) => {
          if (employee.extra?.isDeleted) {
            navigate(ROUTES.EMPLOYEES.LIST, { replace: true });
            return;
          }
          setEmployee(employee);
        })
        .catch(() => {
          notifications.show({
            color: 'red',
            message: t('employees.notifications.fetchError'),
          });
          navigate(ROUTES.EMPLOYEES.LIST);
        })
        .finally(() => setLoading(false));
    });
  }, [id, t, navigate]);

  if (loading || !employee) return { ready: false, loading };

  const profileImageUrl = hasAvatar ? employee.extra?.profileImage : undefined;
  const canEditProfileImage = hasAvatar && canEdit && !isMobile;

  const header = (
    <EmployeeDetailHeader
      employee={employee}
      profileImageUrl={profileImageUrl}
      canEditProfileImage={canEditProfileImage}
      onOpenProfileImage={openProfileImage}
      resolveDepartment={resolveDepartment}
      resolvePosition={resolvePosition}
    />
  );

  const personalCard = (
    <EmployeePersonalCard
      employee={employee}
      isRootUser={isRootUser}
      inlineEditLabels={inlineEditLabels}
      resolveDepartment={resolveDepartment}
      resolvePosition={resolvePosition}
      onEmailSave={handleEmailSave}
    />
  );
  const contactsCard = <EmployeeContactsCard employee={employee} />;
  const notesCard = (
    <EmployeeNotesCard
      employee={employee}
      inlineEditLabels={inlineEditLabels}
      onNoteSave={handleNoteSave}
    />
  );
  const quickActionsCard = (
    <EmployeeQuickActionsCard
      allowLogin={allowLogin}
      onOpenLoginToken={openLoginToken}
      onOpenPasswordModal={dangerZone.openPasswordModal}
    />
  );
  const dangerZoneCard = (
    <EmployeeDangerZoneCard
      employee={employee}
      onToggleStatus={dangerZone.openToggleStatus}
      onDelete={dangerZone.openDeleteModal}
    />
  );

  const permissionsContent = canViewPerms ? (
    <PermissionsPanel
      permissions={employee.extra?.permissions ?? {}}
      resolvedBase={resolvedDeptPerms}
      onSave={canModifyPerms ? handlePermissionsSave : undefined}
    />
  ) : null;

  const isDriver = isDriverDepartment(employee.department);

  const tabIsGone =
    (activeTab === 'driver' && !isDriver) ||
    (activeTab === 'activity' && !isActivityTabVisible) ||
    (activeTab === 'permissions' && !(canViewPerms && !isMobile));
  const visibleTab = tabIsGone ? 'details' : activeTab;

  const modals = (
    <>
      {/* Modals */}
      <ConfirmModal
        opened={dangerZone.deleteModalOpened}
        onClose={dangerZone.closeDeleteModal}
        onConfirm={dangerZone.handleDelete}
        title={t('employees.deleteConfirm.title')}
        message={t('employees.deleteConfirm.message')}
        loading={dangerZone.deleting}
      />

      <Modal
        opened={dangerZone.passwordModalOpened}
        onClose={dangerZone.closePasswordModalAndReset}
        title={t('__new__.07-entities.employees.dangerZone.changePassword')}
        centered
        size="lg"
      >
        {(() => {
          const rawLoginEmail = employee.email || '';

          const loginEmail = rawLoginEmail.endsWith(`@${AUTO_LOGIN_DOMAIN}`)
            ? rawLoginEmail.slice(0, -`@${AUTO_LOGIN_DOMAIN}`.length)
            : rawLoginEmail;
          const currentPassword = dangerZone.passwordForm.values.newPassword;

          const canCopyCredentials =
            !!loginEmail && !!currentPassword && currentPassword === dangerZone.savedPassword;
          const credentialsText = `${t('__new__.07-entities.employees.dangerZone.loginIdentifier')}: ${loginEmail}\n${t('__new__.07-entities.employees.dangerZone.newPassword')}: ${currentPassword}`;
          const handleGenerate = () => {
            const pw = generatePassword();
            dangerZone.passwordForm.setValues({ newPassword: pw, confirmPassword: pw });
            dangerZone.passwordForm.setFieldError('newPassword', null);
            dangerZone.passwordForm.setFieldError('confirmPassword', null);
          };
          return (
            <Form form={dangerZone.passwordForm} onSubmit={dangerZone.handlePasswordChange}>
              <Stack gap="md">
                <Group gap="xs" wrap="nowrap" justify="space-between" align="end">
                  <DetailField
                    label={t('__new__.07-entities.employees.dangerZone.loginIdentifier')}
                  >
                    {loginEmail || '—'}
                  </DetailField>
                  <Group gap="xs" wrap="nowrap">
                    <Button
                      variant="default"
                      size="xs"
                      leftSection={<IconRefresh size={14} />}
                      onClick={handleGenerate}
                    >
                      {t('__new__.07-entities.employees.dangerZone.generatePassword')}
                    </Button>
                    <CopyButton value={credentialsText} timeout={1500}>
                      {({ copied, copy }) => (
                        <Tooltip
                          label={copied ? t('common.labels.copied') : t('common.actions.copy')}
                          withArrow
                        >
                          <Button
                            variant="default"
                            size="xs"
                            color={copied ? 'teal' : undefined}
                            leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            onClick={copy}
                            disabled={!canCopyCredentials}
                          >
                            {t('__new__.07-entities.employees.dangerZone.copyCredentials')}
                          </Button>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </Group>
                <PasswordInput
                  label={t('__new__.07-entities.employees.dangerZone.newPassword')}
                  {...dangerZone.passwordForm.getInputProps('newPassword')}
                />
                <PasswordInput
                  label={t('__new__.07-entities.employees.dangerZone.confirmPassword')}
                  {...dangerZone.passwordForm.getInputProps('confirmPassword')}
                />
                <Group gap="sm" justify="flex-end">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={dangerZone.closePasswordModalAndReset}
                  >
                    {t('common.actions.cancel')}
                  </Button>
                  <Button type="submit" loading={dangerZone.changingPassword} size="sm">
                    {t('__new__.07-entities.employees.dangerZone.changePasswordButton')}
                  </Button>
                </Group>
              </Stack>
            </Form>
          );
        })()}
      </Modal>

      <ConfirmModal
        opened={dangerZone.toggleStatusOpened}
        onClose={dangerZone.closeToggleStatus}
        onConfirm={dangerZone.handleToggleStatus}
        title={
          employee?.isActive
            ? t('__new__.07-entities.employees.dangerZone.disableEmployee')
            : t('__new__.07-entities.employees.dangerZone.enableEmployee')
        }
        message={
          employee?.isActive
            ? t('__new__.07-entities.employees.dangerZone.disableConfirm')
            : t('__new__.07-entities.employees.dangerZone.enableConfirm')
        }
        confirmLabel={
          employee?.isActive
            ? t('__new__.07-entities.employees.dangerZone.disableButton')
            : t('__new__.07-entities.employees.dangerZone.enableButton')
        }
        confirmColor={employee?.isActive ? 'orange' : 'green'}
        loading={dangerZone.togglingStatus}
      />

      <EmployeeLoginTokenModal
        opened={loginTokenOpened}
        onClose={closeLoginToken}
        employee={employee}
      />

      <EmployeeProfileImageModal
        opened={profileImageOpened}
        onClose={closeProfileImage}
        employee={employee}
        onUpdated={setEmployee}
      />
    </>
  );

  return {
    ready: true,
    employee,
    canEdit,
    header,
    cards: {
      personal: personalCard,
      contacts: contactsCard,
      notes: notesCard,
      quickActions: quickActionsCard,
      dangerZone: dangerZoneCard,
    },
    tabs: {
      value: visibleTab,
      onChange: setActiveTab,
      isDriver,
      showActivity: isActivityTabVisible,
      showPermissions: canViewPerms && !isMobile,
    },
    panels: {
      timesheet: <EmployeeTimesheetTab />,
      driver: <EmployeeDriverTab employee={employee} isVisible={visibleTab === 'driver'} />,

      activity:
        visibleTab === 'activity' ? <EmployeeActivityPanel employeeId={employee.id} /> : null,
      permissions: permissionsContent,
    },
    modals,
  };
}
