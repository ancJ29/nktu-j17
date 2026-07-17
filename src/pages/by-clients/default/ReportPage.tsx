import { Box, Container, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconReportAnalytics } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export default function ReportPage() {
  const { t } = useTranslation();

  return (
    <Box p={{ base: 'xs', md: 'lg' }}>
      <Container size="sm" py="xl">
        <Stack align="center" gap="sm" py="xl">
          <ThemeIcon size={64} radius="xl" variant="light" color="gray">
            <IconReportAnalytics size={32} stroke={1.5} />
          </ThemeIcon>
          <Title order={3}>{t('report.title')}</Title>
          <Text size="sm" c="dimmed" ta="center" maw={360}>
            {t('report.comingSoon')}
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}
