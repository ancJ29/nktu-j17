
export const DOLGA_ROUTES = {
  HEALTH: {
    PATH: '/health',
    METHOD: 'GET',
  },
  ECHO: {
    PATH: '/echo',
    METHOD: 'GET',
  },
  GET_CONFIG: {
    PATH: '/app-config',
    METHOD: 'GET',
  },
  SET_CONFIG: {
    PATH: '/app-config',
    METHOD: 'POST',
  },
  ROTATE_ADMIN_KEY: {
    PATH: '/app-config/admin-key',
    METHOD: 'PUT',
  },
  SLACK_TEST: {
    PATH: '/slack-test',
    METHOD: 'POST',
  },
  API_SLACK_TEST: {
    PATH: '/api/slack-test',
    METHOD: 'POST',
  },
  DEV_SERVER_STATUS: {
    PATH: '/dev-server/status',
    METHOD: 'POST',
  },
  DEV_SERVER_START: {
    PATH: '/dev-server/start',
    METHOD: 'POST',
  },
  DEV_SERVER_STOP: {
    PATH: '/dev-server/stop',
    METHOD: 'POST',
  },
  DEV_SERVER_SYNC_IP: {
    PATH: '/dev-server/sync-ip',
    METHOD: 'POST',
  },
  HEALTH_HEARTBEAT: {
    PATH: '/health/heartbeat',
    METHOD: 'POST',
  },
  HEALTH_ISSUE_TOKEN: {
    PATH: '/health/issue-token',
    METHOD: 'POST',
  },
  HEALTH_SERVICES: {
    PATH: '/health/services',
    METHOD: 'POST',
  },
  HEALTH_REMOVE_SERVICE: {
    PATH: '/health/remove-service',
    METHOD: 'POST',
  },
  CONFIG_SET: {
    PATH: '/config/set',
    METHOD: 'POST',
  },
  CONFIG_GET: {
    PATH: '/config/get',
    METHOD: 'POST',
  },
  CONFIG_KEYS: {
    PATH: '/config/keys',
    METHOD: 'POST',
  },
  CONFIG_DELETE: {
    PATH: '/config/delete',
    METHOD: 'POST',
  },
  CONFIG_READ: {
    PATH: '/config/read',
    METHOD: 'POST',
  },
  CONFIG_CREATE_KEY: {
    PATH: '/config/create-key',
    METHOD: 'POST',
  },
  CONFIG_LIST_KEYS: {
    PATH: '/config/list-keys',
    METHOD: 'POST',
  },
  CONFIG_REVOKE_KEY: {
    PATH: '/config/revoke-key',
    METHOD: 'POST',
  },
  MEDIA_UPLOAD_URL: {
    PATH: '/media/upload-url',
    METHOD: 'POST',
  },
  MEDIA_DELETE: {
    PATH: '/media/delete',
    METHOD: 'POST',
  },
  DNS_SYNC: {
    PATH: '/dns-sync',
    METHOD: 'POST',
  },
  DNS_SYNC_SET_SECRET: {
    PATH: '/dns-sync/secret',
    METHOD: 'PUT',
  },
  DNS_SYNC_LIST: {
    PATH: '/dns-sync/list',
    METHOD: 'POST',
  },
  DNS_SYNC_REMOVE: {
    PATH: '/dns-sync/remove',
    METHOD: 'POST',
  },
  EC2_SCHEDULE_SET: {
    PATH: '/ec2-schedule/set',
    METHOD: 'POST',
  },
  EC2_SCHEDULE_LIST: {
    PATH: '/ec2-schedule/list',
    METHOD: 'POST',
  },
  EC2_SCHEDULE_REMOVE: {
    PATH: '/ec2-schedule/remove',
    METHOD: 'POST',
  },
} as const;
