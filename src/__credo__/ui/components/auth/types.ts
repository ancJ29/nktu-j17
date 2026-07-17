import type { MantineColor } from '@mantine/core';
import type { ComponentType } from 'react';

export type IconProps = {
  size?: number;
  color?: string;
};

export type IconComponent = ComponentType<IconProps>;

export type AuthBranding = {
  appName?: string;
  description?: string;
  logoUrl?: string;
};

export type AuthLayoutTheme = {
  bgGradientStart: MantineColor;
  bgGradientEnd: MantineColor;
};

export type AuthCardTheme = {
  borderColor: MantineColor;
  topGradientStart: MantineColor;
  topGradientEnd: MantineColor;
};

export type AuthButtonTheme = {
  gradientStart: MantineColor;
  gradientEnd: MantineColor;
};

export type AuthLinkTheme = {
  color: MantineColor;
};

export type AuthSuccessTheme = {
  iconColor: MantineColor;
};

export type AuthThemeConfig = {
  layout: AuthLayoutTheme;
  card: AuthCardTheme;
  button: AuthButtonTheme;
  link: AuthLinkTheme;
  success?: AuthSuccessTheme;
};

export type LoginFormValues = {
  identifier: string;
  password: string;
  remember: boolean;
};

export type RegisterFormValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type ForgotPasswordFormValues = {
  email: string;
};

export type ResetPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

export type LoginRoutes = {
  forgotPassword: string;
  register: string;
  loginViaQRCode: string;
};

export type RegisterRoutes = {
  login: string;
};

export type ForgotPasswordRoutes = {
  login: string;
};

export type ResetPasswordRoutes = {
  login: string;
  forgotPassword: string;
};

export type LoginViaQRCodeRoutes = {
  login: string;
};
