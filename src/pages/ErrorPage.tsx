import { themeConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import { Error, IconName } from '@credo/base-ui/components';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

export function ErrorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoHome = useCallback(() => {
    navigate(ROUTES.APP.MAIN);
  }, [navigate]);

  const handleRetry = useCallback(() => {
    navigate(0);
  }, [navigate]);

  return (
    <Error.ErrorUI
      labels={{
        title: t('error.generic.title'),
        message: t('error.generic.message'),
        tryAgainButton: t('error.generic.tryAgainButton'),
        goToHomeLink: t('error.generic.goToHomeLink'),
      }}
      themeConfig={themeConfig.auth}
      onGoHome={handleGoHome}
      onRetry={handleRetry}
      errorIconName={IconName.AlertTriangle}
    />
  );
}
