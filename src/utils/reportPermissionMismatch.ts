import { credoSmeConnector } from '@credo/connectors/connector';
import { logger } from '@credo/base-ui/utils';
import { version as appVersion } from '@/config/build-version';
import { readFreshServerPermissions } from '@/stores/useAuthStore';
import { comparePermissions, comparisonSignature } from '@/utils/permissionMismatch';
import type { Permissions } from '@credo/modules/permissions';

const reported = new Set<string>();

export function __resetReportedMismatches(): void {
  reported.clear();
}

export type MismatchContext = {
  employeeId?: string | undefined;
  department?: string | undefined;
  versions: { cfg?: string | undefined; emp?: string | undefined };
};

export function reportPermissionMismatch(browser: Permissions, context: MismatchContext): void {
  const server = readFreshServerPermissions();
  if (!server) return;

  const comparison = comparePermissions(browser, server);
  if (comparison.total === 0) return;

  const signature = comparisonSignature(comparison);
  if (reported.has(signature)) return;
  reported.add(signature);

  logger.warn('[perm] server and browser permission builds disagree', {
    total: comparison.total,
    entries: comparison.entries,
  });

  void credoSmeConnector
    .reportPermissionMismatch({
      entries: comparison.entries,
      total: comparison.total,
      truncated: comparison.truncated,
      versions: context.versions,
      browserEmployeeId: context.employeeId,
      browserDepartment: context.department,
      appVersion,
    })
    .catch((error: unknown) => {
      logger.debug('[perm] mismatch report failed', { error });
    });
}
