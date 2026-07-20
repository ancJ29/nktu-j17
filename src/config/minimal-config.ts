

import type { CMngtAppConfig as AppConfig } from '@credo/kits/types';
import { CMngtAppConfigSchema } from './schema';

const name = 'C-Mngt';
const baseUrl = 'https://c6769e-r2.cr3do.dev/c-mngt/profile/acme';
export const minimalAppConfig = CMngtAppConfigSchema.parse({
  version: '1.0.0',
  schemaVersion: 2,
  app: {
    name,
    logoUrl: `${baseUrl}/acme.svg`,
    logoDarkBgUrl: `${baseUrl}/acme-white.svg`,
    faviconUrl: `${baseUrl}/acme.svg`,
    pwaIcon192Url: `${baseUrl}/pwa-192x192.png`,
    pwaIcon512Url: `${baseUrl}/pwa-512x512.png`,
    pwaIconMaskableUrl: `${baseUrl}/maskable-512x512.png`,
  },
  auth: {
    register: false,
    forgotPassword: false,
    resetPassword: false,
    loginViaQRCode: true,
  },
  themeConfig: { mainColor: 'steel' },
  languages: [
    {
      code: 'vi',
      
      label: 'Tiếng Việt',
      flag: '🇻🇳',
    },
  ],
  defaultLanguage: 'vi',
  navigation: {
    pc: [
      {
        id: 'home',
        path: '/',
        labelKey: 'common.labels.home',
        label: 'Home',
        icon: 'IconHome',
      },
      {
        id: 'employees',
        path: '/employees',
        labelKey: '__new__.07-entities.employees.title',
        label: 'Employees',
        icon: 'IconUsers',
      },
    ],
    mobile: [
      {
        id: 'home',
        path: '/',
        labelKey: 'common.labels.home',
        label: 'Home',
        icon: 'IconHome',
        navbar: true,
      },
      {
        id: 'employees',
        path: '/employees',
        labelKey: '__new__.07-entities.employees.title',
        label: 'Employees',
        icon: 'IconUsers',
      },
    ],
  },
  userSettings: { syncDebounceDelay: 5000 },
  
  
  
  
  
  features: {
    common: {
      darkMode: false,
      languageSwitcher: false,
    },
    employees: {
      enabled: true,
      allowLogin: true,
    },
  },
  
  
  
  
  
  
  permissions: {
    employee: {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      actions: {
        canSetPassword: true,
        canIssueMagicLink: true,
        canToggleStatus: true,
        canViewActivityLog: true,
      },
    },
    activityLog: {
      enabled: true,
    },
  },
}) satisfies Omit<AppConfig, 'env' | 'navigation' | 'translations'>;
