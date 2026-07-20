import { appConfig, featureFlags } from '@/config';
import { useAuthStore } from '@/stores/useAuthStore';
import { findEmployeeByLoginEmail, isAutoLoginEmail } from '@/utils/loginEmail';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { sharedUserStorage, SharedStorageKey } from '@/utils/storage';
import { cacheFlush } from '@/utils/appCache';
import { FieldLabel, PhoneNumber } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import {
  ActionIcon,
  Box,
  Card,
  Divider,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { useDisclosure } from '@mantine/hooks';
import { IconCamera, IconLanguage, IconPalette, IconSparkles, IconUser } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  hasAvatarForEmployees,
  hasDepartmentForEmployees,
  hasEmailForEmployees,
  hasPositionForEmployees,
  isPermissionManagementEnabled,
  isPermissionManagementRootUserOnly,
  perms,
} from '@/utils/permission';
import { EmployeeProfileImageModal } from '@/pages/employees/EmployeeProfileImageModal';
import type { Employee } from '@/types';
import { useEmployeeFieldOptions } from '@/pages/employees/useEmployeeFieldOptions';
import { PermissionsPanel } from './PermissionsPanel';
import { reloadPage } from '@credo/base-ui/utils';

const isMobile = device.isMobile;
const pad = isMobile ? 'md' : 'lg';

const hasDepartment = hasDepartmentForEmployees();
const hasPosition = hasPositionForEmployees();
const hasEmail = hasEmailForEmployees();
const hasAvatar = hasAvatarForEmployees();
const hasLanguageSwitcher = featureFlags.common.languageSwitcher;
const permMngtEnabled = isPermissionManagementEnabled();
const permMngtRootUserOnly = isPermissionManagementRootUserOnly();
const hasViewPermsRight = permMngtEnabled && perms.permissionManagement.canView();

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { resolveDepartment, resolvePosition } = useEmployeeFieldOptions();
  const { user, saveProfile } = useAuthStore();
  const isRootUser = user?.isRoot ?? false;
  const canViewPerms = hasViewPermsRight && (!permMngtRootUserOnly || isRootUser);
  const employees = useEmployeeStore((s) => s.items);
  const [profileImageOpened, { open: openProfileImage, close: closeProfileImage }] =
    useDisclosure(false);
  const [employeeOverride, setEmployeeOverride] = useState<Employee | null>(null);

  const { userEmail, storedEmployee } = useMemo(() => {
    const userEmail = user.email;
    const isAutoLogin = isAutoLoginEmail(userEmail || '');
    return {
      storedEmployee: findEmployeeByLoginEmail(employees, userEmail),
      userEmail: isAutoLogin ? undefined : userEmail,
    };
  }, [user.email, employees]);

  const currentEmployee = employeeOverride ?? storedEmployee;
  const profileImageUrl = hasAvatar ? currentEmployee?.extra?.profileImage : undefined;
  const canEditAvatar = hasAvatar && !isMobile && !!currentEmployee;
  
  
  const displayName = currentEmployee?.name || user.name || '';

  
  const handleLanguageChange = useCallback(
    async (code: string) => {
      sharedUserStorage.set(SharedStorageKey.LANGUAGE, code);
      await i18n.changeLanguage(code);
      await saveProfile().catch(() => {});
      cacheFlush();
      reloadPage('language change');
    },
    [i18n, saveProfile],
  );

  const hasAnyPreference = hasLanguageSwitcher;

  const languageOptions = appConfig.languages.map((lang) => ({
    value: lang.code,
    label: `${lang.flag} ${lang.label}`,
  }));

  return (
    <>
      <Stack gap={isMobile ? 'md' : 'lg'}>
        <Title order={isMobile ? 4 : 3}>{t('profile.title')}</Title>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* ---- Account Card ---- */}
          <Card withBorder padding={pad}>
            <Group gap="xs" mb="sm">
              <IconUser size={18} style={{ opacity: 0.5 }} />
              <FieldLabel size="sm" lts={0.5}>
                {t('profile.account')}
              </FieldLabel>
            </Group>

            <Divider mb="md" />

            <Group gap="md" mb="md">
              {canEditAvatar ? (
                <Tooltip label={t('employees.detail.profileImageChange')} withArrow>
                  <Box
                    role="button"
                    tabIndex={0}
                    onClick={openProfileImage}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openProfileImage();
                      }
                    }}
                    pos="relative"
                    style={{ cursor: 'pointer', display: 'inline-block', flexShrink: 0 }}
                  >
                    <EmployeeAvatar
                      name={displayName}
                      imageUrl={profileImageUrl}
                      size={isMobile ? 56 : 72}
                      initialSize={isMobile ? '24px' : '30px'}
                    />
                    <ActionIcon
                      component="span"
                      size="sm"
                      radius="xl"
                      variant="filled"
                      aria-hidden
                      pos="absolute"
                      style={{ bottom: -4, right: -4, pointerEvents: 'none' }}
                    >
                      <IconCamera size={12} />
                    </ActionIcon>
                  </Box>
                </Tooltip>
              ) : (
                <EmployeeAvatar
                  name={displayName}
                  imageUrl={profileImageUrl}
                  size={isMobile ? 56 : 72}
                  initialSize={isMobile ? '24px' : '30px'}
                />
              )}
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text size="lg" fw={600} lineClamp={1}>
                  {user.name || '-'}
                </Text>
                {hasEmail && userEmail && (
                  <Text size="sm" c="dimmed" lineClamp={1}>
                    {userEmail}
                  </Text>
                )}
              </Stack>
            </Group>

            {currentEmployee && (
              <Stack gap="xs">
                {hasDepartment && currentEmployee.department && (
                  <InfoRow
                    label={t('common.labels.department')}
                    value={resolveDepartment(currentEmployee.department)}
                  />
                )}
                {hasPosition && currentEmployee.position && (
                  <InfoRow
                    label={t('common.labels.position')}
                    value={resolvePosition(currentEmployee.position)}
                  />
                )}
                {currentEmployee.phone && (
                  <Group gap="sm">
                    <Text size="sm" c="dimmed" w={100}>
                      {t('common.labels.phone')}
                    </Text>
                    <PhoneNumber
                      value={currentEmployee.phone}
                      size="sm"
                      copyTooltip={t('__new__.01-common.actions.copy')}
                      copiedTooltip={t('common.labels.copied')}
                    />
                  </Group>
                )}
              </Stack>
            )}
          </Card>

          {/* ---- Preferences Card ---- */}
          <Card withBorder padding={pad}>
            <Group gap="xs" mb="sm">
              <IconPalette size={18} style={{ opacity: 0.5 }} />
              <FieldLabel size="sm" lts={0.5}>
                {t('profile.preferences')}
              </FieldLabel>
            </Group>

            <Divider mb="md" />

            <Stack gap="lg">
              {/* Language */}
              {hasLanguageSwitcher && (
                <PreferenceRow
                  icon={<IconLanguage size={18} />}
                  label={t('profile.language')}
                  description={t('profile.languageDesc')}
                >
                  <SegmentedControl
                    size="xs"
                    data={languageOptions}
                    value={i18n.language}
                    onChange={handleLanguageChange}
                  />
                </PreferenceRow>
              )}

              {!hasAnyPreference && (
                <Stack align="center" gap="sm" py="xl">
                  <ThemeIcon size={56} radius="xl" variant="light" color="gray">
                    <IconSparkles size={28} stroke={1.5} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">
                    {t('profile.preferencesComingSoon')}
                  </Text>
                  <Text size="xs" c="dimmed" ta="center" maw={320}>
                    {t('profile.preferencesComingSoonDesc')}
                  </Text>
                </Stack>
              )}
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Permissions — PC only, feature must be enabled + canView */}
        {!isMobile && canViewPerms && <PermissionsPanel />}
      </Stack>

      {currentEmployee && (
        <EmployeeProfileImageModal
          opened={profileImageOpened}
          onClose={closeProfileImage}
          employee={currentEmployee}
          onUpdated={setEmployeeOverride}
        />
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Group gap="sm">
      <Text size="sm" c="dimmed" w={100}>
        {label}
      </Text>
      <Text size="sm">{value}</Text>
    </Group>
  );
}

function PreferenceRow({
  icon,
  label,
  description,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md">
      <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
        <Box c="dimmed" style={{ flexShrink: 0 }}>
          {icon}
        </Box>
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text size="sm" fw={500}>
            {label}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={2}>
            {description}
          </Text>
        </Stack>
      </Group>
      <Box style={{ flexShrink: 0 }}>{children}</Box>
    </Group>
  );
}
