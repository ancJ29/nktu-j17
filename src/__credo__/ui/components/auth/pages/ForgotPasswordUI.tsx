import { Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { Icon } from '../../common/Icon';
import type { IconName } from '../../types';
import type {
  AuthBranding,
  AuthThemeConfig,
  ForgotPasswordFormValues,
  ForgotPasswordRoutes,
} from '../types';
import {
  AuthButton,
  AuthError,
  AuthFooterLink,
  AuthHeader,
  AuthLink,
  AuthPageWrapper,
  AuthSubtitle,
  AuthTextInput,
} from '../ui';

type ForgotPasswordUIProps = {
  labels?: {
    emailLabel: string;
    emailPlaceholder: string;
    sendResetLinkButton: string;
    backToLoginLink: string;
    title: string;
    subtitle: string;
    successTitle: string;
    successMessage: string;
  };
  form: UseFormReturnType<ForgotPasswordFormValues>;
  onSubmit: (values: ForgotPasswordFormValues) => void;
  isLoading: boolean;
  isSubmitted: boolean;
  error: string | null;
  themeConfig: AuthThemeConfig;
  routes: ForgotPasswordRoutes;
  branding?: AuthBranding;
  mailIconName: IconName;
  goBackIconName: IconName;
};

export function ForgotPasswordUI({
  labels,
  form,
  onSubmit,
  isLoading,
  isSubmitted,
  error,
  themeConfig,
  routes,
  branding,
  mailIconName,
  goBackIconName,
}: ForgotPasswordUIProps) {
  const {
    emailLabel = 'Email',
    emailPlaceholder = 'Enter your email',
    sendResetLinkButton = 'Send Reset Link',
    backToLoginLink = 'Back to login',
    title = 'Forgot Password',
    subtitle = "Enter your email address and we'll send you a link to reset your password",
    successTitle = 'Check Your Email',
    successMessage = 'We have sent a password reset link to your email address. Please check your inbox and follow the instructions.',
  } = labels ?? {};

  if (isSubmitted) {
    return (
      <AuthPageWrapper layout={themeConfig.layout} card={themeConfig.card} branding={branding}>
        <AuthHeader>{successTitle}</AuthHeader>
        <AuthSubtitle>{successMessage}</AuthSubtitle>

        <AuthLink
          href={routes.login}
          c={themeConfig.link.color}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Icon name={goBackIconName} size={16} />
          {backToLoginLink}
        </AuthLink>
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
          <AuthTextInput
            label={emailLabel}
            placeholder={emailPlaceholder}
            icon={<Icon name={mailIconName} size={18} />}
            disabled={isLoading}
            {...form.getInputProps('email')}
          />

          <AuthButton
            type="submit"
            gradientStart={themeConfig.button.gradientStart}
            gradientEnd={themeConfig.button.gradientEnd}
            loading={isLoading}
            disabled={isLoading}
          >
            {sendResetLinkButton}
          </AuthButton>
        </Stack>
      </form>

      <AuthFooterLink href={routes.login} color={themeConfig.link.color} showBackIcon>
        {backToLoginLink}
      </AuthFooterLink>
    </AuthPageWrapper>
  );
}
