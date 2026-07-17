import { Button, Checkbox, Group, Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { Language } from '../../../types';
import { Icon } from '../../common/Icon';
import type { IconName } from '../../types';
import type { AuthBranding, AuthThemeConfig, LoginFormValues, LoginRoutes } from '../types';
import {
  AuthButton,
  AuthDivider,
  AuthError,
  AuthFooterLink,
  AuthHeader,
  AuthLink,
  AuthPageWrapper,
  AuthPasswordInput,
  AuthSubtitle,
  AuthTextInput,
} from '../ui';

type LoginUIProps = {
  form: UseFormReturnType<LoginFormValues>;
  labels?: {
    title: string;
    subtitle: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    rememberMe: string;
    forgotPasswordLink: string;
    signInButton: string;
    useLoginLinkButton: string;
    noAccountPrefix: string;
    createAccountLink: string;
  };
  onSubmit: (values: LoginFormValues) => void;
  onQrLogin?: () => void;
  isLoading: boolean;
  error: string | null;
  themeConfig: AuthThemeConfig;
  routes: LoginRoutes;
  showForgotPassword?: boolean;
  showRegister?: boolean;
  showQrLogin?: boolean;
  userIconName: IconName;
  lockIconName: IconName;
  qrcodeIconName: IconName;
  branding?: AuthBranding;
  languageSwitcher?: {
    languages: Language[];
    currentLanguage: string;
    onLanguageChange: (languageCode: string) => void;
    tooltipLabel?: string;
  };
};

export function LoginUI({
  labels,
  form,
  onSubmit,
  onQrLogin,
  isLoading,
  error,
  themeConfig,
  routes,
  showForgotPassword = true,
  showRegister = true,
  showQrLogin = true,
  branding,
  userIconName,
  lockIconName,
  qrcodeIconName,
  languageSwitcher,
}: LoginUIProps) {
  const {
    title = 'CREDO ADMIN',
    subtitle = 'Sign in to your account',
    usernameLabel = 'Username',
    usernamePlaceholder = 'Enter your username',
    passwordLabel = 'Password',
    passwordPlaceholder = 'Enter your password',
    rememberMe = 'Remember me',
    forgotPasswordLink = 'Forgot password?',
    signInButton = 'Sign In',
    useLoginLinkButton = 'Use Login Link',
    noAccountPrefix = "Don't have an account? ",
    createAccountLink = 'Create one',
  } = labels ?? {};

  return (
    <AuthPageWrapper
      layout={themeConfig.layout}
      card={themeConfig.card}
      branding={branding}
      languageSwitcher={languageSwitcher}
    >
      <AuthHeader>{title}</AuthHeader>
      <AuthSubtitle>{subtitle}</AuthSubtitle>

      <AuthError message={error} />

      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="lg">
          <AuthTextInput
            label={usernameLabel}
            placeholder={usernamePlaceholder}
            icon={<Icon name={userIconName} size={18} />}
            disabled={isLoading}
            {...form.getInputProps('identifier')}
          />

          <AuthPasswordInput
            label={passwordLabel}
            placeholder={passwordPlaceholder}
            icon={<Icon name={lockIconName} size={18} />}
            disabled={isLoading}
            {...form.getInputProps('password')}
          />

          <Group justify="space-between">
            <Checkbox
              label={rememberMe}
              disabled={isLoading}
              {...form.getInputProps('remember', { type: 'checkbox' })}
            />
            {showForgotPassword && (
              <AuthLink href={routes.forgotPassword} c={themeConfig.link.color}>
                {forgotPasswordLink}
              </AuthLink>
            )}
          </Group>

          <AuthButton
            type="submit"
            gradientStart={themeConfig.button.gradientStart}
            gradientEnd={themeConfig.button.gradientEnd}
            loading={isLoading}
            disabled={isLoading}
          >
            {signInButton}
          </AuthButton>
        </Stack>
      </form>

      {showQrLogin && onQrLogin && (
        <Stack gap="md" mt="xl">
          <AuthDivider />
          <Button
            variant="default"
            fullWidth
            size="md"
            leftSection={<Icon name={qrcodeIconName} size={20} />}
            onClick={onQrLogin}
          >
            {useLoginLinkButton}
          </Button>
        </Stack>
      )}

      {showRegister && (
        <AuthFooterLink
          href={routes.register}
          color={themeConfig.link.color}
          prefix={noAccountPrefix}
        >
          {createAccountLink}
        </AuthFooterLink>
      )}
    </AuthPageWrapper>
  );
}
