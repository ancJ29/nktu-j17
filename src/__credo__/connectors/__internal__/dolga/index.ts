import { createApiGroup } from '../shared/api-group';
import { setTransportMode } from '../shared/transport-state';
import { DOLGA_ROUTES } from './routes';
import type {
  ConfigCreateKeyRequest,
  ConfigCreateKeyResponse,
  ConfigData,
  ConfigDeleteRequest,
  ConfigDeleteResponse,
  ConfigGetRequest,
  ConfigGetResponse,
  ConfigKeysResponse,
  ConfigListKeysResponse,
  ConfigReadResponse,
  ConfigRevokeKeyRequest,
  ConfigRevokeKeyResponse,
  ConfigSetRequest,
  ConfigSetResponse,
  EchoResponse,
  DnsSyncReportRequest,
  DnsSyncReportResponse,
  DnsSyncSetSecretRequest,
  DnsSyncSetSecretResponse,
  DnsSyncListResponse,
  DnsSyncRemoveRequest,
  DnsSyncRemoveResponse,
  Ec2ScheduleSetRequest,
  Ec2ScheduleSetResponse,
  Ec2ScheduleListResponse,
  Ec2ScheduleRemoveRequest,
  Ec2ScheduleRemoveResponse,
  DevServerStartResponse,
  DevServerStatusResponse,
  DevServerStopResponse,
  DevServerSyncIpResponse,
  GetConfigResponse,
  HealthHeartbeatRequest,
  HealthHeartbeatResponse,
  HealthIssueTokenResponse,
  HealthRemoveServiceRequest,
  HealthRemoveServiceResponse,
  HealthResponse,
  HealthServicesResponse,
  MediaUploadUrlRequest,
  MediaUploadUrlResponse,
  MediaDeleteRequest,
  MediaDeleteResponse,
  RotateAdminKeyRequest,
  RotateAdminKeyResponse,
  SetConfigResponse,
  SlackTestResponse,
  ApiSlackTestRequest,
  ApiSlackTestResponse,
} from './types';

export * from './routes';

const storages = {
  adminKey: '',
  healthAccessKey: '',
  baseUrl: 'https://dolga.hau-750.workers.dev',
  
  
  
  
  
  
  transportMode: 'body-encode' as 'plain' | 'body-encode' | undefined,
};

const getBaseUrl = () => storages.baseUrl;

function applyTransportMode(): void {
  if (!storages.baseUrl || !storages.transportMode) return;
  setTransportMode(new URL(storages.baseUrl).origin, storages.transportMode);
}

const api = createApiGroup({
  storages,
  prefix: '',
  getBaseUrl,
});

export const dolgaConnector = {
  setBaseUrl: (baseUrl: string) => {
    storages.baseUrl = baseUrl;
    applyTransportMode();
    return dolgaConnector;
  },
  setAdminKey: (adminKey: string) => {
    storages.adminKey = adminKey;
    return dolgaConnector;
  },
  clearAdminKey: () => {
    storages.adminKey = '';
    return dolgaConnector;
  },
  
  setHealthAccessKey: (accessKey: string) => {
    storages.healthAccessKey = accessKey;
    return dolgaConnector;
  },
  clearHealthAccessKey: () => {
    storages.healthAccessKey = '';
    return dolgaConnector;
  },
  
  setTransportMode: (mode: 'plain' | 'body-encode') => {
    storages.transportMode = mode;
    applyTransportMode();
    return dolgaConnector;
  },
  
  useBodyEncoding: () => dolgaConnector.setTransportMode('body-encode'),

  
  
  

  health: () => api<HealthResponse>(DOLGA_ROUTES.HEALTH),

  
  echo: () => api<EchoResponse>(DOLGA_ROUTES.ECHO),

  getConfig: () => api<GetConfigResponse>(DOLGA_ROUTES.GET_CONFIG),

  setConfig: (config: ConfigData) =>
    api<SetConfigResponse>(DOLGA_ROUTES.SET_CONFIG, { body: config }),

  
  rotateAdminKey: ({ adminKey }: RotateAdminKeyRequest) =>
    api<RotateAdminKeyResponse>(DOLGA_ROUTES.ROTATE_ADMIN_KEY, {
      body: { adminKey },
    }),

  slackTest: () => api<SlackTestResponse>(DOLGA_ROUTES.SLACK_TEST),

  
  
  

  
  mediaUploadUrl: (payload: MediaUploadUrlRequest) =>
    api<MediaUploadUrlResponse>(DOLGA_ROUTES.MEDIA_UPLOAD_URL, { body: payload }),

  
  mediaDelete: (payload: MediaDeleteRequest) =>
    api<MediaDeleteResponse>(DOLGA_ROUTES.MEDIA_DELETE, { body: payload }),

  
  apiSlackTest: (req: ApiSlackTestRequest) =>
    api<ApiSlackTestResponse>(DOLGA_ROUTES.API_SLACK_TEST, { body: req }),

  
  
  

  devServerStatus: () => api<DevServerStatusResponse>(DOLGA_ROUTES.DEV_SERVER_STATUS),

  devServerStart: () => api<DevServerStartResponse>(DOLGA_ROUTES.DEV_SERVER_START),

  devServerStop: () => api<DevServerStopResponse>(DOLGA_ROUTES.DEV_SERVER_STOP),

  
  devServerSyncIp: () => api<DevServerSyncIpResponse>(DOLGA_ROUTES.DEV_SERVER_SYNC_IP),

  
  
  
  
  
  
  
  
  

  issueHealthToken: () => api<HealthIssueTokenResponse>(DOLGA_ROUTES.HEALTH_ISSUE_TOKEN),

  
  heartbeat: ({ serviceName, ttlSeconds }: HealthHeartbeatRequest, accessKey?: string) =>
    api<HealthHeartbeatResponse>(DOLGA_ROUTES.HEALTH_HEARTBEAT, {
      body: { serviceName, ttlSeconds },
      extraHeaders: {
        'X-Health-Access-Key': accessKey ?? storages.healthAccessKey,
      },
    }),

  healthServices: () => api<HealthServicesResponse>(DOLGA_ROUTES.HEALTH_SERVICES),

  removeHealthService: ({ serviceName }: HealthRemoveServiceRequest) =>
    api<HealthRemoveServiceResponse>(DOLGA_ROUTES.HEALTH_REMOVE_SERVICE, {
      body: { serviceName },
    }),

  
  
  
  
  
  
  

  configSet: ({ key, value }: ConfigSetRequest) =>
    api<ConfigSetResponse>(DOLGA_ROUTES.CONFIG_SET, { body: { key, value } }),

  configGet: ({ key }: ConfigGetRequest) =>
    api<ConfigGetResponse>(DOLGA_ROUTES.CONFIG_GET, { body: { key } }),

  configKeys: () => api<ConfigKeysResponse>(DOLGA_ROUTES.CONFIG_KEYS),

  configDelete: ({ key }: ConfigDeleteRequest) =>
    api<ConfigDeleteResponse>(DOLGA_ROUTES.CONFIG_DELETE, { body: { key } }),

  
  configRead: (accessKey: string) =>
    api<ConfigReadResponse>(DOLGA_ROUTES.CONFIG_READ, {
      extraHeaders: { 'X-Config-Access-Key': accessKey },
    }),

  configCreateKey: ({ configKey, label }: ConfigCreateKeyRequest) =>
    api<ConfigCreateKeyResponse>(DOLGA_ROUTES.CONFIG_CREATE_KEY, {
      body: { configKey, label },
    }),

  configListKeys: () => api<ConfigListKeysResponse>(DOLGA_ROUTES.CONFIG_LIST_KEYS),

  configRevokeKey: ({ accessKey }: ConfigRevokeKeyRequest) =>
    api<ConfigRevokeKeyResponse>(DOLGA_ROUTES.CONFIG_REVOKE_KEY, {
      body: { accessKey },
    }),

  
  
  
  
  
  
  
  
  
  

  dnsSyncReport: ({ instanceKey, secret, ip }: DnsSyncReportRequest) =>
    api<DnsSyncReportResponse>(DOLGA_ROUTES.DNS_SYNC, { body: { instanceKey, secret, ip } }),

  dnsSyncSetSecret: ({ secret }: DnsSyncSetSecretRequest) =>
    api<DnsSyncSetSecretResponse>(DOLGA_ROUTES.DNS_SYNC_SET_SECRET, { body: { secret } }),

  
  dnsSyncList: () => api<DnsSyncListResponse>(DOLGA_ROUTES.DNS_SYNC_LIST),

  
  dnsSyncRemove: ({ instanceKey }: DnsSyncRemoveRequest) =>
    api<DnsSyncRemoveResponse>(DOLGA_ROUTES.DNS_SYNC_REMOVE, { body: { instanceKey } }),

  
  
  
  
  
  
  
  
  

  
  ec2ScheduleSet: (schedule: Ec2ScheduleSetRequest) =>
    api<Ec2ScheduleSetResponse>(DOLGA_ROUTES.EC2_SCHEDULE_SET, { body: schedule }),

  
  ec2ScheduleList: () => api<Ec2ScheduleListResponse>(DOLGA_ROUTES.EC2_SCHEDULE_LIST),

  
  ec2ScheduleRemove: ({ instanceId }: Ec2ScheduleRemoveRequest) =>
    api<Ec2ScheduleRemoveResponse>(DOLGA_ROUTES.EC2_SCHEDULE_REMOVE, { body: { instanceId } }),
};

applyTransportMode();
