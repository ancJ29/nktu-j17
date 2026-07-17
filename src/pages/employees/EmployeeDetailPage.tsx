import {
  Button,
  CopyButton,
  Divider,
  Grid,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Tooltip,
} from '@mantine/core';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DetailField } from '@/components/DetailField';
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconCopy,
  IconEdit,
  IconHistory,
  IconInfoCircle,
  IconLicense,
  IconRefresh,
  IconShield,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { AUTO_LOGIN_DOMAIN } from '@/utils/loginEmail';
import { cMngtConnector } from '@credo/connectors/connector';
import { generatePassword } from '@credo/kits/string';
import { asyncDeduplicator, device } from '@credo/base-ui/utils';
import { notifications } from '@mantine/notifications';
import { EntityConflictError } from '@/stores/createEntityStore';
import type { Employee, EmployeeExtra } from '@/types';
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
import { Tabs } from '@credo/base-ui/components';
import { EmployeeActivityPanel } from './EmployeeActivityPanel';
import { EmployeeDetailHeader } from './detail/EmployeeDetailHeader';
import { EmployeeDriverTab } from './detail/EmployeeDriverTab';
import { EmployeeQuickActionsCard } from './detail/EmployeeQuickActionsCard';
import { EmployeeDangerZoneCard } from './detail/EmployeeDangerZoneCard';
import {
  EmployeeContactsCard,
  EmployeeNotesCard,
  EmployeePersonalCard,
  EmployeeTimesheetTab,
} from './detail/EmployeeInfoCards';
import { EmployeeLoginTokenModal } from './EmployeeLoginTokenModal';
import { EmployeeProfileImageModal } from './EmployeeProfileImageModal';
import { PermissionsPanel } from '@/pages/profile/PermissionsPanel';
import { useEmployeeDangerZone } from './useEmployeeDangerZone';
import { useEmployeeFieldOptions } from './useEmployeeFieldOptions';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { logActivity } from '@/utils/activityLogger';
import { deepDiff } from '@/utils/deepDiff';
import { useDisclosure } from '@mantine/hooks';

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

export function EmployeeDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isRootUser = useAuthStore((s) => s.user?.isRoot ?? false);
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
      edit: t('__new__.01-common.actions.edit'),
      save: t('__new__.01-common.actions.save'),
      cancel: t('__new__.01-common.actions.cancel'),
    }),
    [t],
  );

  
  
  
  
  
  const patchEmployee = useCallback(
    async (
      patch: Partial<Employee>,
      opts: { verb?: string; memo?: Record<string, unknown>; rethrow?: boolean } = {},
    ): Promise<boolean> => {
      if (!employee || !id) return false;
      try {
        const updated = await useEmployeeStore.getState().updateSafely({
          id,
          version: employee.version,
          patch,
        });
        setEmployee(updated);
        if (opts.verb) logActivity(opts.verb, id, opts.memo);
        notifications.show({
          color: 'green',
          message: t('employees.notifications.updateSuccess'),
        });
        return true;
      } catch (err) {
        if (err instanceof EntityConflictError) {
          if (err.latest) setEmployee(err.latest as Employee);
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
    [employee, id, t],
  );

  
  
  
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
      await cMngtConnector
        .getEmployeeById<EmployeeExtra>({ id })
        .then((res) => {
          if (res.employee.extra?.isDeleted) {
            navigate(ROUTES.EMPLOYEES.LIST, { replace: true });
            return;
          }
          setEmployee(res.employee);
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

  if (loading || !employee) return null;

  
  
  
  const topActions = isMobile ? null : (
    <Group justify="space-between">
      <Button
        onClick={() => window.history.back()}
        variant="subtle"
        size="compact-sm"
        leftSection={<IconArrowLeft size={16} />}
      >
        {t('__new__.01-common.actions.back')}
      </Button>
      {canEdit && (
        <Button
          component={Link}
          to={ROUTES.EMPLOYEES.EDIT.replace(':id', employee.id)}
          variant="default"
          size="compact-sm"
          leftSection={<IconEdit size={14} />}
        >
          {t('__new__.01-common.actions.edit')}
        </Button>
      )}
    </Group>
  );

  
  
  
  
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

  
  
  
  const detailsContent = isMobile ? (
    <Stack gap="md">
      {quickActionsCard}
      {personalCard}
      {contactsCard}
      {notesCard}
    </Stack>
  ) : (
    <Grid gutter="md">
      <Grid.Col span={{ base: 12, md: 7 }}>
        <Stack gap="md">
          {personalCard}
          {contactsCard}
          {notesCard}
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Stack gap="md">
          {quickActionsCard}
          {dangerZoneCard}
        </Stack>
      </Grid.Col>
    </Grid>
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

  return (
    <>
      <Stack gap="lg">
        {topActions}
        {header}
        <Divider />
        <Tabs value={visibleTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="details" leftSection={<IconInfoCircle size={16} />}>
              {t('employees.employeeDetails')}
            </Tabs.Tab>
            <Tabs.Tab value="timesheet" leftSection={<IconClock size={16} />}>
              {t('employees.detail.timesheet')}
            </Tabs.Tab>
            {isDriver && (
              <Tabs.Tab value="driver" leftSection={<IconLicense size={16} />}>
                {t('employees.driver.tab')}
              </Tabs.Tab>
            )}
            {isActivityTabVisible && (
              <Tabs.Tab value="activity" leftSection={<IconHistory size={16} />}>
                {t('employees.detail.recentActivities')}
              </Tabs.Tab>
            )}
            {canViewPerms && !isMobile && (
              <Tabs.Tab value="permissions" leftSection={<IconShield size={16} />}>
                {t('profile.permissions')}
              </Tabs.Tab>
            )}
          </Tabs.List>

          <Tabs.Panel value="details" pt="md">
            {detailsContent}
          </Tabs.Panel>

          <Tabs.Panel value="timesheet" pt="md">
            <EmployeeTimesheetTab />
          </Tabs.Panel>

          {isDriver && (
            <Tabs.Panel value="driver" pt="md">
              <EmployeeDriverTab employee={employee} isVisible={visibleTab === 'driver'} />
            </Tabs.Panel>
          )}

          {isActivityTabVisible && (
            <Tabs.Panel value="activity" pt="md">
              {/* Lazy-mount: only fetch when this tab is selected. */}
              {visibleTab === 'activity' && <EmployeeActivityPanel employeeId={employee.id} />}
            </Tabs.Panel>
          )}

          {canViewPerms && !isMobile && (
            <Tabs.Panel value="permissions" pt="md">
              {permissionsContent}
            </Tabs.Panel>
          )}
        </Tabs>
      </Stack>

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
            <form onSubmit={dangerZone.passwordForm.onSubmit(dangerZone.handlePasswordChange)}>
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
                          label={
                            copied ? t('common.labels.copied') : t('__new__.01-common.actions.copy')
                          }
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
                    {t('__new__.01-common.actions.cancel')}
                  </Button>
                  <Button type="submit" loading={dangerZone.changingPassword} size="sm">
                    {t('__new__.07-entities.employees.dangerZone.changePasswordButton')}
                  </Button>
                </Group>
              </Stack>
            </form>
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
}
