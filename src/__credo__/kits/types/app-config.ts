export type AppInfo = {
  name: string;

  nameHtml?: string;
  description?: string;
  logoUrl?: string;

  logoDarkBgUrl?: string;

  faviconUrl?: string;

  pwaIcon192Url?: string;

  pwaIcon512Url?: string;

  pwaIconMaskableUrl?: string;
};

export type AuthFeatures = {
  loginViaQRCode: boolean;
};

export type ThemeConfig = {
  mainColor: string;

  customPalette?: string[];
};

export type Language = {
  code: string;
  label: string;
  flag: string;
};

export type NavigationItem = {
  id: string;
  path?: string;

  labelKey?: string;
  label: string;
  icon: string;
  subs?: NavigationItem[];
};

export type NavigationConfig = {
  pc: NavigationItem[];
  mobile: NavigationItem[];
};

export type AppConfig = {
  version: string;
  schemaVersion?: number;
  app: AppInfo;
  auth: AuthFeatures;
  themeConfig: ThemeConfig;
  languages: Language[];
  defaultLanguage: string;
  navigation: NavigationConfig;
};
