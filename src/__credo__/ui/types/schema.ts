import { z } from 'zod';
import { IconName } from '../components/types/icon';
import { brandPalettes } from '../utils/palettes';
import type { EnvConfig } from './env';

const BRAND_PALETTE_NAMES = Object.keys(brandPalettes) as [string, ...string[]];

export const AppInfoSchema = z.object({
  name: z.string().max(100),

  description: z.string().optional(),

  logoUrl: z.string().optional(),

  logoDarkBgUrl: z.string().optional(),

  faviconUrl: z.string().optional(),

  pwaIcon192Url: z.string().optional(),

  pwaIcon512Url: z.string().optional(),

  pwaIconMaskableUrl: z.string().optional(),
});

export type AppInfo = z.infer<typeof AppInfoSchema>;

export const AuthFeaturesSchema = z.object({
  register: z.boolean(),
  forgotPassword: z.boolean(),
  resetPassword: z.boolean(),
  loginViaQRCode: z.boolean(),
});

export type AuthFeatures = z.infer<typeof AuthFeaturesSchema>;

const PaletteShadeSchema = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
  message: 'must be a hex color, e.g. #3e618c',
});

export const ThemeConfigSchema = z.object({
  mainColor: z.enum(BRAND_PALETTE_NAMES),

  customPalette: z.array(PaletteShadeSchema).length(10).optional(),
});

export type StorableThemeConfig = z.infer<typeof ThemeConfigSchema>;

export type CredoThemeConfig = {
  mainColor: string;
  auth: {
    layout: { bgGradientStart: string; bgGradientEnd: string };
    button: { color: string; borderColor: string; gradientStart: string; gradientEnd: string };
    link: { color: string };
    card: { borderColor: string; topGradientStart: string; topGradientEnd: string };
    success: { iconColor: string };
  };
  app: {
    header: { gradientStart: string; gradientEnd: string };
    main: { backgroundColor: string };
    navbar: {
      backgroundColor: string;
      borderColor: string;
      activeGradientStart: string;
      activeGradientEnd: string;
      activeAccentStart: string;
      activeAccentEnd: string;
      activeTextColor: string;
      iconColor: string;
      activeIconColor: string;
      hoverBgColor: string;
    };
  };
};

export const LanguageSchema = z.object({
  code: z.string().min(2).max(5),

  label: z.string().min(1),

  flag: z.string().min(1),
});

export type Language = z.infer<typeof LanguageSchema>;

export const NavigationItemSchema = z.object({
  id: z.string().min(1),

  path: z.string().optional(),

  labelKey: z.string().min(1).optional(),

  label: z.string().min(1),

  icon: z.enum(IconName),

  hidden: z.boolean().optional(),

  navbar: z.boolean().optional(),

  get subs() {
    return z.array(NavigationItemSchema).optional();
  },
});

export type CredoNavigationItem = {
  id: string;
  path?: string;

  labelKey?: string;
  label: string;
  icon: IconName;
  hidden?: boolean;
  navbar?: boolean;
  subs?: CredoNavigationItem[];
};

export const NavigationConfigSchema = z.object({
  pc: z.array(NavigationItemSchema),

  mobile: z.array(NavigationItemSchema),
});

export type NavigationConfig = {
  pc: CredoNavigationItem[];
  mobile: CredoNavigationItem[];
};

export const UserSettingsSchema = z.object({
  syncDebounceDelay: z.number().min(0),
});

export type UserSettingsConfig = z.infer<typeof UserSettingsSchema>;

export const CredoAppConfigSchema = z.object({
  version: z.string().min(1),
  app: AppInfoSchema,
  auth: AuthFeaturesSchema,
  themeConfig: ThemeConfigSchema,
  languages: z.array(LanguageSchema).min(1),
  defaultLanguage: z.string().min(2).max(5),
  navigation: NavigationConfigSchema,
  userSettings: UserSettingsSchema,
});

export type CredoAppConfig = Omit<z.infer<typeof CredoAppConfigSchema>, 'themeConfig'> & {
  version?: string;

  themeConfig: CredoThemeConfig;

  env?: EnvConfig;

  build?: {
    version: string;
    buildHash: string;
    buildTimestamp: string;
    buildTimestampReadable?: string;
  };
};
