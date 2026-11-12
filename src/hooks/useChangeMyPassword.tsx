import { useCallback, useState } from 'react';
import { Button, Group, Modal, PasswordInput, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { CallApiError, credoSmeConnector } from '@credo/connectors/connector';
import { PASSWORD_REGEX } from '@credo/kits/string';
import { Form } from '@/components/Form';

type Values = { currentPassword: string; newPassword: string; repeatPassword: string };

const EMPTY: Values = { currentPassword: '', newPassword: '', repeatPassword: '' };

/**
 * The root user changes their own password: an `open` to hand a menu item and
 * the modal to render, the shape of `useClearCacheConfirm`. The server holds the
 * real gate (root, the current password); these checks only spare a round trip,
 * so a hand-made request meets the same rules there. The session survives the
 * change, so a success closes the modal and nothing else. Nothing here logs or
 * keeps a typed password past the close.
 */
export function useChangeMyPassword(): { open: () => void; modal: React.ReactNode } {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Values>({
    initialValues: EMPTY,
    validate: {
      currentPassword: (v) => (v ? null : t('auth.changePassword.required')),
      newPassword: (v, values) => {
        if (!v) return t('auth.changePassword.required');
        if (!PASSWORD_REGEX.test(v)) return t('auth.changePassword.policy');
        if (v === values.currentPassword) return t('auth.changePassword.sameAsCurrent');
        return null;
      },
      repeatPassword: (v, values) =>
        v !== values.newPassword ? t('auth.changePassword.mismatch') : null,
    },
  });

  const closeAndReset = useCallback(() => {
    close();
    form.reset();
  }, [close, form]);

  const submit = useCallback(
    async (values: Values) => {
      setSubmitting(true);
      try {
        await credoSmeConnector.changeMyPassword({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        });
        notifications.show({ color: 'green', message: t('auth.changePassword.done') });
        closeAndReset();
      } catch (error) {
        // 400 only: a 401 reads as signed out, so the server never uses it for a typo.
        const code =
          error instanceof CallApiError && error.status === 400
            ? (error.payload as { error?: unknown } | undefined)?.error
            : undefined;
        if (code === 'wrong-current-password') {
          form.setFieldError('currentPassword', t('auth.changePassword.wrongCurrent'));
        } else if (code === 'missing-field') {
          form.setFieldError('currentPassword', t('auth.changePassword.required'));
        } else if (code === 'weak-new-password') {
          form.setFieldError('newPassword', t('auth.changePassword.policy'));
        } else if (code === 'same-password') {
          form.setFieldError('newPassword', t('auth.changePassword.sameAsCurrent'));
        } else {
          notifications.show({ color: 'red', message: t('auth.changePassword.failed') });
        }
      } finally {
        setSubmitting(false);
      }
    },
    [closeAndReset, form, t],
  );

  return {
    open,
    modal: (
      <Modal
        opened={opened}
        onClose={closeAndReset}
        title={t('auth.changePassword.title')}
        centered
      >
        <Form form={form} onSubmit={submit}>
          <Stack gap="md">
            <PasswordInput
              label={t('auth.changePassword.current')}
              autoComplete="current-password"
              {...form.getInputProps('currentPassword')}
            />
            <PasswordInput
              label={t('auth.changePassword.new')}
              autoComplete="new-password"
              {...form.getInputProps('newPassword')}
            />
            <PasswordInput
              label={t('auth.changePassword.repeat')}
              autoComplete="new-password"
              {...form.getInputProps('repeatPassword')}
            />
            <Group gap="sm" justify="flex-end">
              <Button variant="default" size="sm" onClick={closeAndReset}>
                {t('common.actions.cancel')}
              </Button>
              <Button type="submit" size="sm" loading={submitting}>
                {t('auth.changePassword.submit')}
              </Button>
            </Group>
          </Stack>
        </Form>
      </Modal>
    ),
  };
}
