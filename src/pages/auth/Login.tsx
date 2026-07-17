import { appConfig, themeConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import { SESSION_EXPIRED_NOTICE_KEY, useAuthStore } from '@/stores/useAuthStore';
import { resolveLoginIdentifier } from '@/utils/loginEmail';
import { markPendingLogin } from '@/utils/pendingLoginLog';
import { markPostLoginReloads } from '@/utils/postLoginReload';
import { Auth, IconName } from '@credo/base-ui/components';
import { useAuthSubmit } from '@credo/base-ui/lib';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { isLocalhost } from '@/config/env';
import { resolveClientCode } from '@/config/client-code';

const clientCode = resolveClientCode();

type LoginFormValues = {
  identifier: string;
  password: string;
  remember: boolean;
};

export function LoginPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const login = useAuthStore((state) => state.login);

  
  
  
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_EXPIRED_NOTICE_KEY)) {
      sessionStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
      notifications.show({
        color: 'yellow',
        title: t('auth.session.expiredTitle'),
        message: t('auth.session.expiredMessage'),
      });
    }
  }, [t]);

  const handleLanguageChange = useCallback(
    (languageCode: string) => {
      i18n.changeLanguage(languageCode);
    },
    [i18n],
  );

  
  const form = useForm<LoginFormValues>({
    initialValues: {
      identifier: isLocalhost ? `${clientCode}@internal.cr3do.dev` : '',
      password: isLocalhost ? 'hH@7lc@WBOFwDJ9!' : '',
      remember: true,
    },
    validate: {
      identifier: (value) =>
        value.length < 1 ? t('auth.login.validation.usernameRequired') : null,
      password: (value) => (value.length < 1 ? t('auth.login.validation.passwordRequired') : null),
    },
  });

  const { isLoading, error, handleSubmit } = useAuthSubmit({
    onSubmit: (values: LoginFormValues) =>
      login({
        
        
        email: resolveLoginIdentifier(values.identifier),
        password: values.password,
        remember: values.remember,
      }),
    onSuccess: () => {
      markPendingLogin('password');
      
      
      
      markPostLoginReloads();
      navigate('/');
    },
    getErrorMessage: (err) => (err instanceof Error ? err.message : t('auth.login.error.failed')),
  });

  const handleQrLogin = useCallback(() => {
    navigate(ROUTES.AUTH.LOGIN_VIA_QR_CODE);
  }, [navigate]);

  return (
    <Auth.LoginUI
      labels={{
        title: t('auth.login.subtitle'),
        subtitle: '',
        usernameLabel: t('auth.login.usernameLabel'),
        usernamePlaceholder: t('auth.login.usernamePlaceholder'),
        passwordLabel: t('auth.login.passwordLabel'),
        passwordPlaceholder: t('auth.login.passwordPlaceholder'),
        rememberMe: t('auth.login.rememberMe'),
        forgotPasswordLink: t('auth.login.forgotPasswordLink'),
        signInButton: t('auth.login.signInButton'),
        useLoginLinkButton: t('auth.login.useLoginLinkButton'),
        noAccountPrefix: t('auth.login.noAccountPrefix'),
        createAccountLink: t('auth.login.createAccountLink'),
      }}
      form={form}
      onSubmit={handleSubmit}
      onQrLogin={handleQrLogin}
      isLoading={isLoading}
      error={error}
      themeConfig={themeConfig.auth}
      routes={{
        forgotPassword: ROUTES.AUTH.FORGOT_PASSWORD,
        register: ROUTES.AUTH.REGISTER,
        loginViaQRCode: ROUTES.AUTH.LOGIN_VIA_QR_CODE,
      }}
      showForgotPassword={appConfig.auth.forgotPassword}
      showRegister={appConfig.auth.register}
      showQrLogin={appConfig.auth.loginViaQRCode}
      branding={{
        appName: appConfig.app.name,
        logoUrl: appConfig.app.logoUrl,
        description: appConfig.app.description,
      }}
      userIconName={IconName.User}
      lockIconName={IconName.Lock}
      qrcodeIconName={IconName.Qrcode}
      languageSwitcher={{
        languages: appConfig.languages,
        currentLanguage: i18n.language,
        onLanguageChange: handleLanguageChange,
        tooltipLabel: t('common.labels.language'),
      }}
    />
  );
}
