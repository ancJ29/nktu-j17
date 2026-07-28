import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, CopyButton, Group, Image, Loader, Modal, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCopy, IconCheck, IconInfoCircle, IconPhoto, IconQrcode } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { ROUTES } from '@/constants/routes';
import { resolveClientCode } from '@/config/client-code';
import { cMngtConnector } from '@credo/connectors/connector';
import { generateQRCodeWithLogo } from '@/utils/qr';
import { logActivity } from '@/utils/activityLogger';
import { wrapLoginToken } from '@/utils/loginToken';
import type { Employee } from '@/types';
import { ONE_MINUTE } from '@credo/kits/time';

const LOGIN_TOKEN_EXPIRY_MINUTES = 15;

type EmployeeLoginTokenModalProps = {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly employee: Employee;
};

export function EmployeeLoginTokenModal({
  opened,
  onClose,
  employee,
}: EmployeeLoginTokenModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loginLink, setLoginLink] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [qrCopied, setQrCopied] = useState(false);
  const qrCopiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(qrCopiedTimer.current), []);

  const generateToken = useCallback(async () => {
    setLoading(true);
    setLoginLink('');
    setQrCodeData('');
    try {
      const res = await cMngtConnector.generateEmployeeLoginToken({
        id: employee.id,
        expiration: LOGIN_TOKEN_EXPIRY_MINUTES * ONE_MINUTE,
      });
      if (res.success && res.token) {
        logActivity('employee.generateLoginToken', employee.id);
        const baseUrl = window.location.origin;

        const params = new URLSearchParams({ token: wrapLoginToken(res.token) });

        const clientCode = resolveClientCode();
        if (clientCode) params.set('code', clientCode);
        const link = `${baseUrl}${ROUTES.AUTH.LOGIN_VIA_QR_CODE}?${params.toString()}`;
        setLoginLink(link);

        try {
          const qr = await generateQRCodeWithLogo(link);
          setQrCodeData(qr);
        } catch {
          // QR generation failed — link is still usable
        }
      } else {
        notifications.show({
          color: 'red',
          message: t('employees.loginToken.generateError'),
        });
      }
    } catch {
      notifications.show({
        color: 'red',
        message: t('employees.loginToken.generateError'),
      });
    } finally {
      setLoading(false);
    }
  }, [employee.id, t]);

  const handleCopyQr = useCallback(async () => {
    if (!qrCodeData) return;
    try {
      const res = await fetch(qrCodeData);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setQrCopied(true);
      clearTimeout(qrCopiedTimer.current);
      qrCopiedTimer.current = setTimeout(() => setQrCopied(false), 2000);
    } catch {
      notifications.show({ color: 'red', message: t('employees.loginToken.copyQrError') });
    }
  }, [qrCodeData, t]);

  useEffect(() => {
    if (opened) {
      void generateToken();
    }
  }, [opened, generateToken]);

  const handleClose = () => {
    setLoginLink('');
    setQrCodeData('');
    setQrCopied(false);
    clearTimeout(qrCopiedTimer.current);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('employees.loginToken.title')}
      centered
      size="sm"
    >
      <Stack gap="md" align="center">
        <Text size="sm" c="dimmed" ta="center">
          {t('employees.loginToken.description', { name: employee.name })}
        </Text>

        {loading ? (
          <Loader size="lg" my="xl" />
        ) : (
          <>
            {qrCodeData ? (
              <Stack gap="xs" align="center">
                <Image src={qrCodeData} alt="Login QR Code" w={220} h={220} fit="contain" />
                <Button
                  size="compact-xs"
                  variant="subtle"
                  leftSection={qrCopied ? <IconCheck size={14} /> : <IconPhoto size={14} />}
                  color={qrCopied ? 'green' : undefined}
                  onClick={handleCopyQr}
                >
                  {qrCopied ? t('employees.loginToken.qrCopied') : t('employees.loginToken.copyQr')}
                </Button>
              </Stack>
            ) : null}

            {loginLink ? (
              <Stack gap="xs" w="100%">
                <Group gap={2} wrap="nowrap" align="flex-start" justify="center">
                  <IconInfoCircle
                    size={14}
                    style={{ marginTop: 2, flexShrink: 0, color: 'var(--mantine-color-dimmed)' }}
                  />
                  <Text size="xs" c="dimmed" ta="center">
                    {t('employees.loginToken.expiryNotice', {
                      minutes: LOGIN_TOKEN_EXPIRY_MINUTES,
                    })}
                  </Text>
                </Group>
                <CopyButton value={loginLink}>
                  {({ copied, copy }) => (
                    <Button
                      fullWidth
                      variant="light"
                      leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                      color={copied ? 'green' : undefined}
                      onClick={copy}
                    >
                      {copied
                        ? t('employees.loginToken.copied')
                        : t('employees.loginToken.copyLink')}
                    </Button>
                  )}
                </CopyButton>

                <Button
                  fullWidth
                  variant="subtle"
                  leftSection={<IconQrcode size={16} />}
                  onClick={generateToken}
                >
                  {t('employees.loginToken.regenerate')}
                </Button>
              </Stack>
            ) : null}
          </>
        )}
      </Stack>
    </Modal>
  );
}
