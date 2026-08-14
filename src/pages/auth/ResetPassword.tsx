import { appBrand, appConfig, themeConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/useAuthStore';
import { Auth, IconName } from '@credo/base-ui/components';
import { useAuthSubmit } from '@credo/base-ui/lib';
import { useForm } from '@mantine/form';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router';

type ResetPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

export function ResetPasswordPage() {
  if (!appConfig.auth.resetPassword) {
    return <Navigate to={ROUTES.NOT_FOUND} replace />;
  }

  return <ResetPasswordForm />;
}

function ResetPasswordForm() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const form = useForm<ResetPasswordFormValues>({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validate: {
      password: (value) =>
        value.length < 6 ? t('auth.resetPassword.validation.passwordMinLength') : null,
      confirmPassword: (value, values) =>
        value !== values.password ? t('auth.resetPassword.validation.passwordsNotMatch') : null,
    },
  });

  const { isLoading, isSubmitted, error, handleSubmit } = useAuthSubmit({
    onSubmit: (values: ResetPasswordFormValues) => {
      if (!token) {
        return Promise.reject(new Error(t('auth.resetPassword.validation.invalidToken')));
      }
      return resetPassword({
        token,
        password: values.password,
      });
    },
    getErrorMessage: (err) =>
      err instanceof Error ? err.message : t('auth.resetPassword.error.failed'),
  });

  const handleSignIn = useCallback(() => {
    navigate(ROUTES.AUTH.LOGIN);
  }, [navigate]);

  return (
    <Auth.ResetPasswordUI
      labels={{
        title: t('auth.resetPassword.title'),
        subtitle: t('auth.resetPassword.subtitle'),
        invalidTokenTitle: t('auth.resetPassword.invalidTokenTitle'),
        invalidTokenMessage: t('auth.resetPassword.invalidTokenMessage'),
        successTitle: t('auth.resetPassword.successTitle'),
        successMessage: t('auth.resetPassword.successMessage'),
        newPasswordLabel: t('auth.resetPassword.newPasswordLabel'),
        newPasswordPlaceholder: t('auth.resetPassword.newPasswordPlaceholder'),
        confirmPasswordLabel: t('auth.resetPassword.confirmPasswordLabel'),
        confirmPasswordPlaceholder: t('auth.resetPassword.confirmPasswordPlaceholder'),
        resetPasswordButton: t('auth.resetPassword.resetPasswordButton'),
        requestNewLinkLink: t('auth.resetPassword.requestNewLinkLink'),
        signInButton: t('auth.resetPassword.signInButton'),
      }}
      form={form}
      onSubmit={handleSubmit}
      onSignIn={handleSignIn}
      isLoading={isLoading}
      isSubmitted={isSubmitted}
      hasValidToken={!!token}
      error={error}
      themeConfig={themeConfig.auth}
      routes={{
        login: ROUTES.AUTH.LOGIN,
        forgotPassword: ROUTES.AUTH.FORGOT_PASSWORD,
      }}
      branding={{
        appName: appBrand.name,
        appNameHtml: appBrand.nameHtml,
        logoUrl: appConfig.app.logoUrl,
        description: appConfig.app.description,
      }}
      lockIconName={IconName.Lock}
    />
  );
}
