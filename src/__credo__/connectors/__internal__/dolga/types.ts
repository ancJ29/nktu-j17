export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type ConfigData = { [key: string]: JsonValue };

export type ConfigRecord = {
  config: ConfigData;

  version: number;

  updatedAt: string;

  adminKeyConfigured: boolean;
};

export type HealthRequest = void;
export type HealthResponse = {
  status: string;
  service: string;
  version: string;
  buildTime: string;
  timestamp: string;
};

export type EchoRequest = void;
export type EchoResponse = {
  headers: Record<string, string>;
};

export type GetConfigRequest = void;
export type GetConfigResponse = ConfigRecord;

export type SetConfigRequest = ConfigData;
export type SetConfigResponse = ConfigRecord;

export type RotateAdminKeyRequest = {
  adminKey: string | null;
};
export type RotateAdminKeyResponse = ConfigRecord;

export type SlackTestRequest = void;
export type SlackTestResponse = { status: string };

export type ApiSlackTestMessageType =
  | 'dev-server-start'
  | 'dev-server-sync-ip'
  | 'dev-server-stop'
  | 'dev-server-status'
  | 'health-heartbeat'
  | 'health-issue-token'
  | 'health-services'
  | 'health-remove-service'
  | 'config-set'
  | 'config-get'
  | 'config-keys'
  | 'config-delete'
  | 'config-read'
  | 'config-create-key'
  | 'config-list-keys'
  | 'config-revoke-key';

export type ApiSlackTestRequest = { type: ApiSlackTestMessageType };

export type ApiSlackTestResponse =
  | {
      success: true;
      type: ApiSlackTestMessageType;
      slackOk: boolean;
      payload: { text: string; blocks?: unknown[] };
    }
  | { success: false; message: string };

export type DevServerState =
  'pending' | 'running' | 'stopping' | 'stopped' | 'shutting-down' | 'terminated' | 'unknown';

export type DevServerSyncIpChange =
  | { port: string; status: 'unchanged'; cidrs: string[] }
  | { port: string; status: 'updated'; revoked: string[]; authorized: string };

export type DevServerOkResponse = {
  success: true;
  instanceId: string;
  state?: DevServerState;

  action?: 'start' | 'stop' | 'sync-ip';

  changed?: boolean;

  previousState?: DevServerState;

  ip?: string;

  ipSource?: 'body' | 'sourceIp';

  sgId?: string;

  ports?: string[];

  changes?: DevServerSyncIpChange[];
};

export type DevServerErrorResponse = {
  success: false;

  message: string;

  ip?: string;
};

export type DevServerResponse = DevServerOkResponse | DevServerErrorResponse;

export type DevServerStatusRequest = void;
export type DevServerStatusResponse = DevServerResponse;

export type DevServerStartRequest = void;
export type DevServerStartResponse = DevServerResponse;

export type DevServerStopRequest = void;
export type DevServerStopResponse = DevServerResponse;

export type DevServerSyncIpRequest = void;
export type DevServerSyncIpResponse = DevServerResponse;

export type HealthService = {
  serviceName: string;

  lastHeartbeat: string;

  nextExpectedAt: string;

  lastAlertedAt: string | null;

  overdue: boolean;
};

export type HealthHeartbeatRequest = {
  serviceName: string;

  ttlSeconds: number;
};
export type HealthHeartbeatResponse =
  | { success: true; serviceName: string; nextExpectedAt: string }
  | { success: false; message: string };

export type HealthIssueTokenRequest = void;
export type HealthIssueTokenResponse =
  { success: true; token: string } | { success: false; message: string };

export type HealthServicesRequest = void;
export type HealthServicesResponse =
  { success: true; services: HealthService[] } | { success: false; message: string };

export type HealthRemoveServiceRequest = { serviceName: string };
export type HealthRemoveServiceResponse =
  { success: true; serviceName: string } | { success: false; message: string };

export type ConfigSetRequest = { key: string; value: JsonValue };
export type ConfigSetResponse =
  { success: true; key: string } | { success: false; message: string };

export type ConfigGetRequest = { key: string };

export type ConfigGetResponse =
  | { success: true; key: string; value: JsonValue | null; exists: boolean }
  | { success: false; message: string };

export type ConfigKeysRequest = void;
export type ConfigKeysResponse =
  { success: true; keys: string[] } | { success: false; message: string };

export type ConfigDeleteRequest = { key: string };
export type ConfigDeleteResponse =
  { success: true; key: string; removed: boolean } | { success: false; message: string };

export type ConfigReadRequest = void;
export type ConfigReadResponse =
  | { success: true; key: string; value: JsonValue | null; exists: boolean }
  | { success: false; message: string };

export type ConfigAccessKeyEntry = {
  accessKey: string;
  configKey: string;
  label: string;

  createdAt: number;
};

export type ConfigCreateKeyRequest = { configKey: string; label: string };
export type ConfigCreateKeyResponse =
  ({ success: true } & ConfigAccessKeyEntry) | { success: false; message: string };

export type ConfigListKeysRequest = void;
export type ConfigListKeysResponse =
  { success: true; keys: ConfigAccessKeyEntry[] } | { success: false; message: string };

export type ConfigRevokeKeyRequest = { accessKey: string };
export type ConfigRevokeKeyResponse =
  { success: true; revoked: boolean } | { success: false; message: string };

export type DnsSyncReportRequest = {
  instanceKey: string;

  secret: string;

  ip?: string;
};
export type DnsSyncReportResponse =
  | { success: true; status: 'seeded'; ip: string }
  | { success: true; status: 'unchanged'; ip: string }
  | {
      success: true;
      status: 'updated';
      oldIp: string;
      ip: string;

      updated: number;

      total: number;
    }
  | { success: false; message: string };

export type DnsSyncSetSecretRequest = {
  secret: string | null;
};
export type DnsSyncSetSecretResponse =
  { success: true; configured: boolean } | { success: false; message: string };

export type DnsSyncEntry = {
  instanceKey: string;
  lastIp: string;

  updatedAt: string;
};

export type DnsSyncListRequest = void;
export type DnsSyncListResponse =
  { success: true; instances: DnsSyncEntry[] } | { success: false; message: string };

export type DnsSyncRemoveRequest = { instanceKey: string };
export type DnsSyncRemoveResponse =
  { success: true; instanceKey: string; removed: boolean } | { success: false; message: string };

export type MediaUploadUrlRequest = {
  imageDirectory: string;

  fileName: string;
};
export type MediaUploadUrlResponse = {
  success: boolean;

  uploadUrl?: string;

  fileUrl?: string;

  expiresIn?: number;

  key?: string;
  error?: string;
};

export type MediaDeleteRequest = {
  key?: string;
  fileUrl?: string;
};
export type MediaDeleteResponse = {
  success: boolean;
  key?: string;
  error?: string;
};

export type Ec2Schedule = {
  instanceId: string;

  label?: string;

  startHour: number;

  stopHour: number;

  skipWeekends?: boolean;

  timezoneOffsetMinutes?: number;

  enabled?: boolean;
};

export type Ec2ScheduleSetRequest = Ec2Schedule;
export type Ec2ScheduleSetResponse =
  { success: true; schedule: Ec2Schedule; count: number } | { success: false; message: string };

export type Ec2ScheduleListRequest = void;
export type Ec2ScheduleListResponse =
  { success: true; schedules: Ec2Schedule[] } | { success: false; message: string };

export type Ec2ScheduleRemoveRequest = { instanceId: string };
export type Ec2ScheduleRemoveResponse =
  { success: true; instanceId: string; removed: boolean } | { success: false; message: string };
