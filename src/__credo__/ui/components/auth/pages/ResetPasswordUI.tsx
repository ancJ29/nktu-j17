import { Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { Icon } from '../../common/Icon';
import type { IconName } from '../../types';
import type {
  AuthBranding,
  AuthThemeConfig,
  ResetPasswordFormValues,
  ResetPasswordRoutes,
} from '../types';
import {
  AuthButton,
  AuthError,
  AuthHeader,
  AuthLink,
  AuthPageWrapper,
  AuthPasswordInput,
  AuthSubtitle,
  AuthSuccessView,
} from '../ui';

type ResetPasswordUIProps = {
  labels?: {
    title: string;
    subtitle: string;
    invalidTokenTitle: string;
    invalidTokenMessage: string;
    successTitle: string;
    successMessage: string;
    newPasswordLabel: string;
    newPasswordPlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    resetPasswordButton: string;
    requestNewLinkLink: string;
    signInButton: string;
  };
  form: UseFormReturnType<ResetPasswordFormValues>;
  onSubmit: (values: ResetPasswordFormValues) => void;
  onSignIn: () => void;
  isLoading: boolean;
  isSubmitted: boolean;
  hasValidToken: boolean;
  error: string | null;
  themeConfig: AuthThemeConfig & { success: { iconColor: string } };
  routes: ResetPasswordRoutes;
  branding?: AuthBranding;
  lockIconName: IconName;
};

export function ResetPasswordUI({
  labels,
  form,
  onSubmit,
  onSignIn,
  isLoading,
  isSubmitted,
  hasValidToken,
  error,
  themeConfig,
  routes,
  branding,
  lockIconName,
}: ResetPasswordUIProps) {
  const {
    title = 'Reset Password',
    subtitle = 'Enter your new password below',
    invalidTokenTitle = 'Invalid Link',
    invalidTokenMessage = 'This password reset link is invalid or has expired. Please request a new one.',
    successTitle = 'Password Reset',
    successMessage = 'Your password has been successfully reset. You can now sign in with your new password.',
    newPasswordLabel = 'New Password',
    newPasswordPlaceholder = 'Enter your new password',
    confirmPasswordLabel = 'Confirm Password',
    confirmPasswordPlaceholder = 'Confirm your new password',
    resetPasswordButton = 'Reset Password',
    requestNewLinkLink = 'Request new link',
    signInButton = 'Sign In',
  } = labels ?? {};

  if (!hasValidToken) {
    return (
      <AuthPageWrapper layout={themeConfig.layout} card={themeConfig.card} branding={branding}>
        <AuthHeader>{invalidTokenTitle}</AuthHeader>
        <AuthSubtitle>{invalidTokenMessage}</AuthSubtitle>

        <AuthLink
          href={routes.forgotPassword}
          c={themeConfig.link.color}
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          {requestNewLinkLink}
        </AuthLink>
      </AuthPageWrapper>
    );
  }

  if (isSubmitted) {
    return (
      <AuthPageWrapper layout={themeConfig.layout} card={themeConfig.card} branding={branding}>
        <AuthSuccessView
          title={successTitle}
          message={successMessage}
          iconColor={themeConfig.success.iconColor}
        >
          <AuthButton
            gradientStart={themeConfig.button.gradientStart}
            gradientEnd={themeConfig.button.gradientEnd}
            onClick={onSignIn}
          >
            {signInButton}
          </AuthButton>
        </AuthSuccessView>
      </AuthPageWrapper>
    );
  }

  return (
    <AuthPageWrapper layout={themeConfig.layout} card={themeConfig.card}>
      <AuthHeader>{title}</AuthHeader>
      <AuthSubtitle>{subtitle}</AuthSubtitle>

      <AuthError message={error} />

      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="lg">
          <AuthPasswordInput
            label={newPasswordLabel}
            placeholder={newPasswordPlaceholder}
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
            {resetPasswordButton}
          </AuthButton>
        </Stack>
      </form>
    </AuthPageWrapper>
  );
}
