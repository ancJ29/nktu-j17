import { appBrand, appConfig, themeConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/useAuthStore';
import { Auth, IconName } from '@credo/base-ui/components';
import { useAuthSubmit } from '@credo/base-ui/lib';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router';

type RegisterFormValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export function RegisterPage() {
  if (!appConfig.auth.register) {
    return <Navigate to={ROUTES.NOT_FOUND} replace />;
  }

  return <RegisterForm />;
}

function RegisterForm() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const register = useAuthStore((state) => state.register);

  const form = useForm<RegisterFormValues>({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      username: (value) =>
        value.length < 3 ? t('auth.register.validation.usernameMinLength') : null,
      email: (value) =>
        /^\S+@\S+$/.test(value) ? null : t('auth.register.validation.emailInvalid'),
      password: (value) =>
        value.length < 6 ? t('auth.register.validation.passwordMinLength') : null,
      confirmPassword: (value, values) =>
        value !== values.password ? t('auth.register.validation.passwordsNotMatch') : null,
    },
  });

  const { isLoading, error, handleSubmit } = useAuthSubmit({
    onSubmit: (values: RegisterFormValues) =>
      register({
        username: values.username,
        email: values.email,
        password: values.password,
      }),
    onSuccess: () => navigate(ROUTES.AUTH.LOGIN),
    getErrorMessage: (err) =>
      err instanceof Error ? err.message : t('auth.register.error.failed'),
  });

  return (
    <Auth.RegisterUI
      labels={{
        title: t('auth.register.title'),
        subtitle: t('auth.register.subtitle'),
        usernameLabel: t('auth.register.usernameLabel'),
        usernamePlaceholder: t('auth.register.usernamePlaceholder'),
        emailLabel: t('common.labels.email'),
        emailPlaceholder: t('auth.register.emailPlaceholder'),
        passwordLabel: t('auth.register.passwordLabel'),
        passwordPlaceholder: t('auth.register.passwordPlaceholder'),
        confirmPasswordLabel: t('auth.register.confirmPasswordLabel'),
        confirmPasswordPlaceholder: t('auth.register.confirmPasswordPlaceholder'),
        createAccountButton: t('auth.register.createAccountButton'),
        hasAccountPrefix: t('auth.register.hasAccountPrefix'),
        signInLink: t('auth.register.signInLink'),
      }}
      form={form}
      onSubmit={handleSubmit}
      isLoading={isLoading}
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
      userIconName={IconName.User}
      mailIconName={IconName.Mail}
      lockIconName={IconName.Lock}
    />
  );
}
