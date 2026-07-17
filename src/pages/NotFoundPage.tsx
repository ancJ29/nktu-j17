import { themeConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import { Error, IconName } from '@credo/base-ui/components';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoHome = useCallback(() => {
    navigate(ROUTES.APP.MAIN);
  }, [navigate]);

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <Error.NotFoundUI
      labels={{
        title: t('error.notFound.title'),
        message: t('error.notFound.message'),
        goToHomeButton: t('error.notFound.goToHomeButton'),
        goBackLink: t('__new__.01-common.actions.back'),
      }}
      themeConfig={themeConfig.auth}
      onGoHome={handleGoHome}
      onGoBack={handleGoBack}
      notFoundIconName={IconName.AlertTriangle}
    />
  );
}
