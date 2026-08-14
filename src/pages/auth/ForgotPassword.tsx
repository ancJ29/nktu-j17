import { appBrand, appConfig, themeConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/useAuthStore';
import { Auth, IconName } from '@credo/base-ui/components';
import { useAuthSubmit } from '@credo/base-ui/lib';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';

type ForgotPasswordFormValues = {
  email: string;
};

export function ForgotPasswordPage() {
  if (!appConfig.auth.forgotPassword) {
    return <Navigate to={ROUTES.NOT_FOUND} replace />;
  }

  return <ForgotPasswordForm />;
}

function ForgotPasswordForm() {
  const { t } = useTranslation();
  const forgotPassword = useAuthStore((state) => state.forgotPassword);

  const form = useForm<ForgotPasswordFormValues>({
    initialValues: {
      email: '',
    },
    validate: {
      email: (value) =>
        /^\S+@\S+$/.test(value) ? null : t('auth.forgotPassword.validation.emailInvalid'),
    },
  });

  const { isLoading, isSubmitted, error, handleSubmit } = useAuthSubmit({
    onSubmit: (values: ForgotPasswordFormValues) => forgotPassword({ email: values.email }),
    getErrorMessage: (err) =>
      err instanceof Error ? err.message : t('auth.forgotPassword.error.failed'),
  });

  return (
    <Auth.ForgotPasswordUI
      labels={{
        emailLabel: t('common.labels.email'),
        emailPlaceholder: t('auth.forgotPassword.emailPlaceholder'),
        sendResetLinkButton: t('auth.forgotPassword.sendResetLinkButton'),
        backToLoginLink: t('auth.forgotPassword.backToLoginLink'),
        title: t('auth.forgotPassword.title'),
        subtitle: t('auth.forgotPassword.subtitle'),
        successTitle: t('auth.forgotPassword.successTitle'),
        successMessage: t('auth.forgotPassword.successMessage'),
      }}
      form={form}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      isSubmitted={isSubmitted}
      error={error}
      themeConfig={themeConfig.auth}
      routes={{
        login: ROUTES.AUTH.LOGIN,
      }}
      branding={{
        appName: appBrand.name,
        appNameHtml: appBrand.nameHtml,
        logoUrl: appConfig.app.logoUrl,
        description: appConfig.app.description,
      }}
      mailIconName={IconName.Mail}
      goBackIconName={IconName.ArrowLeft}
    />
  );
}
