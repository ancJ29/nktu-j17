import { appBrand, appConfig, themeConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/useAuthStore';
import { cacheFlush } from '@/utils/appCache';
import { unwrapLoginToken } from '@/utils/loginToken';
import { markPendingLogin } from '@/utils/pendingLoginLog';
import { markPostLoginReloads } from '@/utils/postLoginReload';
import { Auth } from '@credo/base-ui/components';
import { Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconCheck, IconForms, IconQrcode } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

const MAGIC_LINK_STORAGE_KEY = 'smeMagicLinkParams';

export function AccessViaQRCodePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginWithToken = useAuthStore((state) => state.loginWithToken);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const verificationInProgress = useRef(false);

  const verifyToken = useCallback(
    async (rawToken: string) => {
      if (verificationInProgress.current) return;
      verificationInProgress.current = true;

      setIsLoading(true);
      setError(undefined);

      const unwrapped = unwrapLoginToken(rawToken);
      if (!unwrapped || unwrapped.expired) {
        setError(unwrapped ? t('auth.magicLink.linkExpired') : t('auth.magicLink.invalidQrCode'));
        setIsLoading(false);
        verificationInProgress.current = false;
        sessionStorage.removeItem(MAGIC_LINK_STORAGE_KEY);
        navigate(ROUTES.AUTH.LOGIN_VIA_QR_CODE, { replace: true });
        return;
      }

      try {
        const result = await loginWithToken({ token: unwrapped.token });
        if (result.success) {
          markPendingLogin('qr');
          markPostLoginReloads();

          cacheFlush();
          sessionStorage.removeItem(MAGIC_LINK_STORAGE_KEY);
          setVerificationSuccess(true);
          setIsLoading(false);
          setTimeout(() => window.location.assign(ROUTES.APP.MAIN), 1200);
          return;
        }
        setError(t('auth.magicLink.verificationFailed'));
      } catch {
        setError(t('auth.magicLink.verificationFailed'));
        setVerificationSuccess(false);
      }

      sessionStorage.removeItem(MAGIC_LINK_STORAGE_KEY);

      navigate(ROUTES.AUTH.LOGIN_VIA_QR_CODE, { replace: true });
      setIsLoading(false);
      verificationInProgress.current = false;
    },
    [loginWithToken, navigate, t],
  );

  useEffect(() => {
    if (verificationInProgress.current) return;

    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      sessionStorage.setItem(MAGIC_LINK_STORAGE_KEY, JSON.stringify({ token: tokenFromUrl }));

      void verifyToken(tokenFromUrl);
      return;
    }

    const stored = sessionStorage.getItem(MAGIC_LINK_STORAGE_KEY);
    if (stored) {
      try {
        const { token } = JSON.parse(stored) as { token: string };
        if (token) {
          void verifyToken(token);
          return;
        }
      } catch {
        // Corrupt entry — fall through to the scan / manual UI.
      }
    }

    setShowOptions(true);
    setIsLoading(false);
    setError(undefined);
  }, [searchParams, verifyToken]);

  const handleQrScan = useCallback(
    (data: string) => {
      const trimmed = data.trim();
      verificationInProgress.current = false;
      setVerificationSuccess(false);
      setError(undefined);

      try {
        if (trimmed.includes('?') || trimmed.startsWith('http')) {
          const token = new URL(trimmed).searchParams.get('token');
          if (token) void verifyToken(token);
          else setError(t('auth.magicLink.invalidQrCode'));
        } else {
          void verifyToken(trimmed);
        }
      } catch {
        setError(t('auth.magicLink.invalidQrCode'));
      }
    },
    [verifyToken, t],
  );

  const handleManualCodeSubmit = useCallback(() => {
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    handleQrScan(trimmed);
  }, [manualCode, handleQrScan]);

  const authTheme = themeConfig.auth;

  return (
    <Auth.AuthPageWrapper
      layout={authTheme.layout}
      card={authTheme.card}
      branding={{
        appName: appBrand.name,
        appNameHtml: appBrand.nameHtml,
        logoUrl: appConfig.app.logoUrl,
        description: appConfig.app.description,
      }}
    >
      <Auth.AuthHeader>{t('auth.magicLink.title')}</Auth.AuthHeader>
      <Auth.AuthSubtitle>{t('auth.magicLink.subtitle')}</Auth.AuthSubtitle>

      <Stack gap="sm" align="center" p={0}>
        {isLoading && (
          <Text size="sm" ta="center" c="dimmed">
            {t('auth.magicLink.verifying')}
          </Text>
        )}

        {!isLoading && verificationSuccess && (
          <>
            <IconCheck size={48} color="var(--mantine-color-green-6)" />
            <Text size="sm" ta="center" c="green">
              {t('auth.magicLink.success')}
            </Text>
            <Text size="xs" ta="center" c="dimmed">
              {t('auth.magicLink.redirecting')}
            </Text>
          </>
        )}

        {!isLoading && (error || showOptions) ? (
          <>
            <Auth.AuthError message={error ?? null} />

            {!showManualEntry ? (
              <Stack gap="md" w="100%">
                <Auth.AuthButton
                  gradientStart={authTheme.button.gradientStart}
                  gradientEnd={authTheme.button.gradientEnd}
                  leftSection={<IconQrcode size={20} />}
                  onClick={() => setShowQrScanner(true)}
                >
                  {t('auth.magicLink.scanQrCode')}
                </Auth.AuthButton>

                <Auth.AuthDivider label={t('auth.magicLink.or')} />

                <Button
                  fullWidth
                  variant="default"
                  size="md"
                  leftSection={<IconForms size={20} />}
                  onClick={() => setShowManualEntry(true)}
                >
                  {t('auth.magicLink.enterCodeManually')}
                </Button>
              </Stack>
            ) : (
              <Stack gap="md" w="100%">
                <Text size="sm" c="dimmed">
                  {t('auth.magicLink.enterCodeDescription')}
                </Text>

                <TextInput
                  size="md"
                  radius="md"
                  placeholder={t('auth.magicLink.codePlaceholder')}
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualCode) handleManualCodeSubmit();
                  }}
                />

                <Group grow>
                  <Button
                    variant="default"
                    size="md"
                    radius="md"
                    onClick={() => {
                      setShowManualEntry(false);
                      setManualCode('');
                      setError(undefined);
                    }}
                  >
                    {t('__new__.01-common.actions.cancel')}
                  </Button>

                  <Auth.AuthButton
                    gradientStart={authTheme.button.gradientStart}
                    gradientEnd={authTheme.button.gradientEnd}
                    onClick={handleManualCodeSubmit}
                    disabled={!manualCode}
                  >
                    {t('auth.magicLink.verifyCode')}
                  </Auth.AuthButton>
                </Group>
              </Stack>
            )}
          </>
        ) : null}
      </Stack>

      {!isLoading && !verificationSuccess && (
        <Auth.AuthFooterLink href={ROUTES.AUTH.LOGIN} color={authTheme.link.color} showBackIcon>
          {t('auth.magicLink.backToLogin')}
        </Auth.AuthFooterLink>
      )}

      <Auth.QrScannerModal
        opened={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        onScan={handleQrScan}
        labels={{
          title: t('auth.magicLink.scanQrCode'),
          scanTab: t('auth.magicLink.scanQrCode'),
          uploadTab: t('auth.magicLink.uploadQrImage'),
          scanning: t('auth.magicLink.scanning'),
          clickToUpload: t('auth.magicLink.clickToUpload'),
          pasteFromClipboard: t('auth.magicLink.pasteFromClipboard'),
          processing: t('auth.magicLink.processing'),
          orEnterCode: t('auth.magicLink.orEnterCode'),
          codePlaceholder: t('auth.magicLink.codePlaceholder'),
          cancel: t('__new__.01-common.actions.cancel'),
          verify: t('auth.magicLink.verifyCode'),
          cameraPermissionDenied: t('auth.magicLink.cameraPermissionDenied'),
          noQrCodeFound: t('auth.magicLink.noQrCodeFound'),
          invalidImageFormat: t('auth.magicLink.invalidImageFormat'),
        }}
      />
    </Auth.AuthPageWrapper>
  );
}
