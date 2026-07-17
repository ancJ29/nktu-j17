import { Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { Icon } from '../../common/Icon';
import type { IconName } from '../../types';
import type { AuthBranding, AuthThemeConfig, RegisterFormValues, RegisterRoutes } from '../types';
import {
  AuthButton,
  AuthError,
  AuthFooterLink,
  AuthHeader,
  AuthPageWrapper,
  AuthPasswordInput,
  AuthSubtitle,
  AuthTextInput,
} from '../ui';

type RegisterUIProps = {
  labels?: {
    title: string;
    subtitle: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    createAccountButton: string;
    hasAccountPrefix: string;
    signInLink: string;
  };
  form: UseFormReturnType<RegisterFormValues>;
  onSubmit: (values: RegisterFormValues) => void;
  isLoading: boolean;
  error: string | null;
  themeConfig: AuthThemeConfig;
  routes: RegisterRoutes;
  branding?: AuthBranding;
  userIconName: IconName;
  mailIconName: IconName;
  lockIconName: IconName;
};

export function RegisterUI({
  labels,
  form,
  onSubmit,
  isLoading,
  error,
  themeConfig,
  routes,
  branding,
  userIconName,
  mailIconName,
  lockIconName,
}: RegisterUIProps) {
  const {
    title = 'Create Account',
    subtitle = 'Register for a new account',
    usernameLabel = 'Username',
    usernamePlaceholder = 'Enter your username',
    emailLabel = 'Email',
    emailPlaceholder = 'Enter your email',
    passwordLabel = 'Password',
    passwordPlaceholder = 'Enter your password',
    confirmPasswordLabel = 'Confirm Password',
    confirmPasswordPlaceholder = 'Confirm your password',
    createAccountButton = 'Create Account',
    hasAccountPrefix = 'Already have an account? ',
    signInLink = 'Sign in',
  } = labels ?? {};

  return (
    <AuthPageWrapper layout={themeConfig.layout} card={themeConfig.card} branding={branding}>
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
            {...form.getInputProps('username')}
          />

          <AuthTextInput
            label={emailLabel}
            placeholder={emailPlaceholder}
            icon={<Icon name={mailIconName} size={18} />}
            disabled={isLoading}
            {...form.getInputProps('email')}
          />

          <AuthPasswordInput
            label={passwordLabel}
            placeholder={passwordPlaceholder}
            icon={<Icon name={lockIconName} size={18} />}
            disabled={isLoading}
            {...form.getInputProps('password')}
          />

          <AuthPasswordInput
            label={confirmPasswordLabel}
            placeholder={confirmPasswordPlaceholder}
            icon={<Icon name={lockIconName} size={18} />}
            disabled={isLoading}
            {...form.getInputProps('confirmPassword')}
          />

          <AuthButton
            type="submit"
            gradientStart={themeConfig.button.gradientStart}
            gradientEnd={themeConfig.button.gradientEnd}
            loading={isLoading}
            disabled={isLoading}
          >
            {createAccountButton}
          </AuthButton>
        </Stack>
      </form>

      <AuthFooterLink href={routes.login} color={themeConfig.link.color} prefix={hasAccountPrefix}>
        {signInLink}
      </AuthFooterLink>
    </AuthPageWrapper>
  );
}
