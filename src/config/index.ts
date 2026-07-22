import {
  buildThemeConfig,
  logger,
  setDynamicDocumentTitle,
  setDynamicFavicon,
  setDynamicManifest,
  setDynamicThemeColor,
  validateConfig,
} from '@credo/base-ui/utils';
import { defaultAppConfig, CMngtAppConfigSchema, type CMngtAppConfig } from './schema';
import { buildHash, buildTimestamp, version } from './build-version';
import { baseEnvConfig } from '@credo/base-ui/utils';
import { isLocalhost } from '@credo/kits/misc';
import { reloadPage } from '@credo/base-ui/utils';
import { activityLoggerConnector, cMngtConnector } from '@credo/connectors/connector';
import { appActivityLoggerInternalAccessKey, isAdmin } from './env';
import { initAppCache, cacheGet, cacheSet, cacheFlush } from '@/utils/appCache';
import { markCfgReady, markClientUnconfigured } from '@/utils/bootState';
import { resolveClientCode } from './client-code';
import { ONE_HOUR, ONE_MINUTE } from '@credo/kits/time';
import { buildNavigation } from './navigation';
import { bootstrapPermissionCache } from '@/utils/permissionReader';
import {
  validateSalesOrderConfig,
  formatInvariantError,
} from '@/pages/sales-orders/capabilities/validateConfig';
import {
  validateDeliveryRequestConfig,
  formatInvariantError as formatDrInvariantError,
} from '@/pages/delivery-requests/capabilities/validateConfig';
import {
  validateTransportOrderConfig,
  formatTransportOrderInvariantError,
  type TransportOrderConfigInvariantError,
} from '@/pages/transport-orders/validateConfig';
import type { ConfigInvariantError } from '@/pages/sales-orders/capabilities/types';
import type { ConfigInvariantError as DrConfigInvariantError } from '@/pages/delivery-requests/capabilities/types';
import type { NavigationConfig } from '@/types';

initAppCache();

const cached = cacheGet('cfg') ?? null;

export const isFirstBoot = cached === null;

const { config: validated, warnings } = validateConfig(
  CMngtAppConfigSchema,
  defaultAppConfig,
  cached,
);

if (warnings.length > 0) {
  warnings.forEach((w) => logger.warn(w));
}

const validatedConfig = validated as CMngtAppConfig;
export const salesOrderConfigErrors: ConfigInvariantError[] = (() => {
  const so = validatedConfig.features?.salesOrders;
  if (!so) return [];
  const knownDepartments = new Set(
    (validatedConfig.features?.employees?.departmentOptions ?? []).map((d) => d.value),
  );
  const result = validateSalesOrderConfig(so, knownDepartments);
  if (result.ok) return [];
  for (const err of result.errors) logger.error('SO config invariant', formatInvariantError(err));
  
  validatedConfig.features.salesOrders.enabled = false;
  return result.errors;
})();

export const deliveryRequestConfigErrors: DrConfigInvariantError[] = (() => {
  const dr = validatedConfig.features?.deliveryRequests;
  if (!dr) return [];
  const result = validateDeliveryRequestConfig(dr);
  if (result.ok) return [];
  for (const err of result.errors) {
    logger.error('DR config invariant', formatDrInvariantError(err));
  }
  validatedConfig.features.deliveryRequests.enabled = false;
  return result.errors;
})();

export const transportOrderConfigErrors: TransportOrderConfigInvariantError[] = (() => {
  const to = validatedConfig.features?.transportOrders;
  if (!to) return [];
  const knownDepartments = new Set(
    (validatedConfig.features?.employees?.departmentOptions ?? []).map((d) => d.value),
  );
  const result = validateTransportOrderConfig(to, knownDepartments);
  if (result.ok) return [];
  for (const err of result.errors) {
    logger.error('TO config invariant', formatTransportOrderInvariantError(err));
  }
  validatedConfig.features.transportOrders.enabled = false;
  return result.errors;
})();

bootstrapPermissionCache({
  clientPerms: validatedConfig.permissions,
  departmentOptions: validatedConfig.features?.employees?.departmentOptions,
  cfgVersion: validatedConfig.version,
});

const features = validatedConfig.features;
const configNav =
  validated.navigation.pc.length > 0 || validated.navigation.mobile.length > 0
    ? (validated.navigation as NavigationConfig)
    : null;

const navigation = buildNavigation({
  configNav,
  features,
  isAdmin,
  showRestrictedItems: features?.permissionManagement?.showRestrictedItems ?? false,
});

export const appConfig: Omit<CMngtAppConfig, 'navigation'> & { navigation: NavigationConfig } = {
  ...validated,
  navigation,
  themeConfig: buildThemeConfig(validated.themeConfig.mainColor),
  env: {
    ...baseEnvConfig(),
  },
  build: {
    version,
    buildHash,
    buildTimestampReadable: new Date(buildTimestamp).toLocaleString(),
    buildTimestamp: [
      Math.floor(buildTimestamp / ONE_HOUR).toString(36),
      (buildTimestamp % ONE_HOUR).toString(36),
    ].join('.'),
  },
};

logger.debug('appConfig:', appConfig);

export async function refreshConfigFromBackend(): Promise<void> {
  
  
  
  let reloading = false;
  try {
    
    const limit = isLocalhost() ? ONE_MINUTE : 30 * ONE_MINUTE;

    const ts = cacheGet('crt') ?? 0;
    if (ts > 0 && Date.now() - ts < limit) {
      logger.debug('config already refreshed within limit, skipping');
      return;
    }

    
    
    

    const clientServiceCode = resolveClientCode();
    if (!clientServiceCode) {
      logger.debug('no clientServiceCode resolved, skipping config refresh');
      return;
    }

    const res = await cMngtConnector.getAppConfig({ clientServiceCode });

    
    
    
    
    
    
    if (res.config === null) {
      logger.debug('client not found for clientServiceCode — surfacing client-code prompt');
      markClientUnconfigured();
      return;
    }

    const parsedResult = CMngtAppConfigSchema.safeParse(res.config);
    

    if (!parsedResult.success) {
      logger.error('config validation failed', parsedResult.error.issues);
      return;
    }
    const config = parsedResult.data;

    
    cacheSet('crt', Date.now());

    logger.info('config version check', {
      version: config.version,
      currentVersion: appConfig.version,
    });

    
    
    
    
    cacheSet('cfg', config);

    
    if (config.version && config.version !== appConfig.version) {
      logger.info('new version of remote config found, reloading...', config.version);
      
      
      cacheFlush();
      
      
      reloading = reloadPage('config version mismatch');
    }
    // Ignore config with older version
  } finally {
    if (!reloading) markCfgReady();
  }
}

export async function forceRefreshConfig(): Promise<void> {
  cacheSet('crt', 0); 
  await refreshConfigFromBackend();
}

const clientCode = resolveClientCode();
if (clientCode) {
  cMngtConnector.setClientCode(clientCode);
}
const activityLoggerKey = appActivityLoggerInternalAccessKey ?? '';
if (activityLoggerKey) {
  activityLoggerConnector.setInternalAccessKey(activityLoggerKey);
}

setDynamicFavicon(appConfig.themeConfig.mainColor, appConfig.app.faviconUrl);
setDynamicDocumentTitle(appConfig.app.name);
setDynamicThemeColor(appConfig.themeConfig.mainColor);
setDynamicManifest({
  name: appConfig.app.name,
  description: appConfig.app.description,
  mainColor: appConfig.themeConfig.mainColor,
  pwaIcon192Url: appConfig.app.pwaIcon192Url,
  pwaIcon512Url: appConfig.app.pwaIcon512Url,
  pwaIconMaskableUrl: appConfig.app.pwaIconMaskableUrl,
});

export const { themeConfig } = appConfig;

export const featureFlags = (validated as import('./schema').CMngtAppConfig).features;

refreshConfigFromBackend().catch(console.error);

const CFG_READY_WATCHDOG_MS = 15000;
setTimeout(() => markCfgReady(), CFG_READY_WATCHDOG_MS);
