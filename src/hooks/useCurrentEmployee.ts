import { useEffect, useMemo, useRef } from 'react';
import { appConfig } from '@/config';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { loadAllMasterData } from '@/stores/loadMasterData';
import type { EmployeeExtra } from '@/types';
import type { CMngtAppConfig } from '@credo/kits/types';
import { cacheGet, cacheSet, cacheClear, cacheFlush } from '@/utils/appCache';
import { findEmployeeByLoginEmail } from '@/utils/loginEmail';
import { sharedUserStorage, SharedStorageKey } from '@/utils/storage';
import { buildEffectivePermissions } from '@/utils/permission';
import { useEmpBootSignal } from '@/hooks/useEmpBootSignal';
import { scheduleReload } from '@/utils/scheduleReload';
import { tickPostLoginReload, POST_LOGIN_RELOAD_DELAY_MS } from '@/utils/postLoginReload';
import { logActivity } from '@/utils/activityLogger';
import { consumePendingLogin } from '@/utils/pendingLoginLog';
import { logger } from '@credo/base-ui/utils';

type UseCurrentEmployeeOptions = {
  isProfileLoaded: boolean;

  email: string | undefined | null;

  token: string | undefined | null;
};

let _currentEmployeeId: string | null = null;

export function getCurrentEmployeeId(): string | null {
  if (_currentEmployeeId) return _currentEmployeeId;
  const email = useAuthStore.getState().user?.email;
  if (!email) return null;

  const match = findEmployeeByLoginEmail(useEmployeeStore.getState().items, email);
  if (!match) return null;
  _currentEmployeeId = match.id;
  return match.id;
}

export function getCurrentIsRoot(): boolean {
  return useAuthStore.getState().user?.isRoot ?? false;
}

export function getCurrentActorId(): string {
  return getCurrentEmployeeId() ?? useAuthStore.getState().user?.email ?? 'unknown';
}

export function getCurrentEmployeeStamp(): { userId?: string; userName?: string } {
  const id = getCurrentEmployeeId();
  if (!id) return {};
  const match = useEmployeeStore.getState().items.find((e) => e.id === id);
  return match?.name ? { userId: id, userName: match.name } : { userId: id };
}

function decodeEmailFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.data?.email ?? decoded.email ?? decoded.sub ?? null;
  } catch {
    return null;
  }
}

export function useCurrentEmployee({ isProfileLoaded, email, token }: UseCurrentEmployeeOptions) {
  const hasResolved = useRef(false);
  const lockedHandled = useRef(false);
  const { items: employees, initialized } = useEmployeeStore();
  const isRoot = useAuthStore((state) => state.user?.isRoot ?? false);

  const { setResolvedOk, markMasterDataSettled } = useEmpBootSignal();

  const resolvedEmail = useMemo(
    () => email || (token ? decodeEmailFromToken(token) : null),
    [email, token],
  );

  useEffect(() => {
    if (isProfileLoaded && resolvedEmail && !initialized) {
      loadAllMasterData().finally(markMasterDataSettled);
    }
  }, [isProfileLoaded, resolvedEmail, initialized, markMasterDataSettled]);

  useEffect(() => {
    if (!isProfileLoaded || !resolvedEmail || !initialized) return;

    const match = findEmployeeByLoginEmail(employees, resolvedEmail);
    const extra = match?.extra as EmployeeExtra | undefined;

    if (match && !match.isActive) {
      if (!lockedHandled.current) {
        lockedHandled.current = true;
        logger.info('Current employee is locked — forcing logout', {
          id: match.id,
          isDeleted: extra?.isDeleted ?? false,
        });
        useAuthStore.getState().logout('account-locked');

        scheduleReload('current employee locked', 2000);
      }
      setResolvedOk(false);
      return;
    }

    const empPermVersion = extra?.permissionsVersion;
    const cachedPrv = cacheGet('prv') as { cfg?: string; emp?: string } | undefined;
    if (hasResolved.current && empPermVersion === cachedPrv?.emp) return;
    hasResolved.current = true;

    _currentEmployeeId = null;

    const config = appConfig as CMngtAppConfig;
    const clientPerms = config.permissions;
    const deptOptions = config.features?.employees?.departmentOptions ?? [];
    const cfgVersion = config.version;

    if (match) {
      _currentEmployeeId = match.id;

      if (match.department) {
        sharedUserStorage.set(SharedStorageKey.DEPARTMENT, match.department);
      }

      const versions = { cfg: cfgVersion, emp: empPermVersion };
      const cachedVersions = cachedPrv;

      const isFirstResolve = cachedVersions == null;
      const versionChanged = !isFirstResolve && hasVersionChanged(cachedVersions, versions);
      const needsReload = isFirstResolve || versionChanged;

      buildEffectivePermissions(
        clientPerms,
        match.department,
        deptOptions,
        extra?.permissions,
        versions,
      );

      cacheSet('emo', { o: extra?.permissions, v: empPermVersion });

      if (needsReload) {
        const reason = versionChanged
          ? 'employee permissions version mismatch'
          : 'first-resolve: full permissions written post-bootstrap';
        logger.info('Permissions rebuilt, reloading', {
          cached: cachedVersions,
          current: versions,
          reason,
        });

        setResolvedOk(false);
        scheduleReload(reason);
        return;
      }
      cacheFlush();

      if (tickPostLoginReload()) {
        setResolvedOk(false);
        scheduleReload('post-login permission settle', POST_LOGIN_RELOAD_DELAY_MS);
        return;
      }

      syncProfileIfNeeded(match.name, resolvedEmail);

      logger.debug('currentEmployee resolved', {
        id: match.id,
        name: match.name,
        department: match.department,
        hasPermOverrides: !!extra?.permissions,
        versions,
      });
      setResolvedOk(true);
      firePendingLoginLog();
    } else {
      const versions = { cfg: cfgVersion };
      buildEffectivePermissions(clientPerms, null, deptOptions, null, versions);

      cacheClear('emo');
      cacheFlush();

      if (tickPostLoginReload()) {
        setResolvedOk(false);
        scheduleReload('post-login permission settle', POST_LOGIN_RELOAD_DELAY_MS);
        return;
      }

      logger.debug('currentEmployee: no match for', resolvedEmail);
      setResolvedOk(true);
      firePendingLoginLog();
    }
  }, [isProfileLoaded, resolvedEmail, initialized, employees, setResolvedOk]);

  return { isRoot };
}

function firePendingLoginLog() {
  const method = consumePendingLogin();
  if (!method) return;
  logActivity('auth.login', undefined, { method });
}

function hasVersionChanged(
  cached: { cfg?: string; emp?: string },
  current: { cfg?: string; emp?: string },
): boolean {
  if (cached.emp && current.emp && cached.emp !== current.emp) return true;
  return false;
}

function syncProfileIfNeeded(employeeName: string, employeeEmail: string) {
  const state = useAuthStore.getState();
  const user = state.user;
  if (!user) return;

  const needsName = !user.name && employeeName;
  const needsEmail = !user.email && employeeEmail;

  if (!needsName && !needsEmail) return;

  useAuthStore.setState({
    user: {
      ...user,
      name: user.name || employeeName,
      email: user.email || employeeEmail,
    },
  });

  // Deliberately local-only since 2026-08-13: the SSO profile's `name`/`email`
  // are no longer written back. `currentEmployee.name` already wins wherever
  // both are shown, so a stale SSO name changes nothing the user sees.
}
