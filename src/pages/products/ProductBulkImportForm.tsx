import { useRef, useState } from 'react';
import type React from 'react';

import { Badge, Button, Divider, Group, Paper, Progress, Stack, Text } from '@mantine/core';
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconFileSpreadsheet,
  IconPackage,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

type ImportResult = {
  summary: {
    total: number;
    
    created: number;
    
    skipped: number;
    
    failed: number;
  };
  
  skipped?: string[];
  
  errors?: string[];
};

type ProductBulkImportFormProps = {
  readonly isLoading: boolean;
  readonly isDownloading: boolean;
  readonly file?: File;
  readonly importResult?: ImportResult;
  readonly onDownloadSample: () => void;
  readonly onFileSelect: (file: File) => void;
  readonly onFileRemove: () => void;
  readonly onImport: () => void;
  readonly onCancel: () => void;
  readonly validateFileType: (file: File) => boolean;
};

export function ProductBulkImportForm({
  isLoading,
  isDownloading,
  file,
  importResult,
  onDownloadSample,
  onFileSelect,
  onFileRemove,
  onImport,
  onCancel,
  validateFileType,
}: ProductBulkImportFormProps) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const droppedFiles = [...event.dataTransfer.files];
    const excelFile = droppedFiles.find((f) => validateFileType(f));
    if (excelFile) {
      onFileSelect(excelFile);
    }
  };

  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && validateFileType(selectedFile)) {
      onFileSelect(selectedFile);
    }
  };

  return (
    <Stack gap="md">
      {/* Download Sample Section */}
      <Paper withBorder shadow="sm" p="lg" radius="md">
        <Stack gap="md">
          <Group>
            <IconFileSpreadsheet size={24} color="var(--mantine-color-primary-6)" />
            <div>
              <Text fw={500} size="lg">
                {t('common.bulkImport.sampleTemplate')}
              </Text>
              <Text size="sm" c="dimmed">
                {t('products.bulkImport.sampleDescription')}
              </Text>
            </div>
          </Group>
          <Button
            variant="light"
            leftSection={<IconDownload size={16} />}
            loading={isDownloading}
            onClick={onDownloadSample}
          >
            {t('common.bulkImport.downloadSample')}
          </Button>
        </Stack>
      </Paper>

      {/* Upload Section */}
      <Paper withBorder shadow="sm" p="lg" radius="md">
        <Stack gap="md">
          <Group>
            <IconUpload size={24} color="var(--mantine-color-primary-6)" />
            <div>
              <Text fw={500} size="lg">
                {t('products.bulkImport.uploadFile')}
              </Text>
              <Text size="sm" c="dimmed">
                {t('common.bulkImport.supportedFormats')}
              </Text>
            </div>
          </Group>

          <Paper
            withBorder
            p="xl"
            radius="md"
            style={{
              backgroundColor: isDragOver ? 'var(--mantine-color-primary-6)' : undefined,
              border: isDragOver
                ? '2px dashed var(--mantine-color-primary-5)'
                : '2px dashed var(--mantine-color-primary-3)',
              cursor: 'pointer',
              transition: 'all 200ms ease',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleFileInputClick}
          >
            <Stack align="center" gap="md">
              <IconFileSpreadsheet size={48} color="var(--mantine-color-primary-5)" />
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" fw={500}>
                  {t('common.bulkImport.dragAndDrop')}
                </Text>
                <Text size="sm" c="dimmed">
                  {t('common.bulkImport.orClickToSelect')}
                </Text>
              </div>
            </Stack>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
          </Paper>

          {file ? (
            <Group justify="space-between">
              <Group gap="xs">
                <IconFileSpreadsheet size={20} color="var(--mantine-color-primary-6)" />
                <Text size="sm">{file.name}</Text>
                <Badge color="primary" variant="light">
                  {(file.size / 1024).toFixed(2)} KB
                </Badge>
              </Group>
              <Button variant="subtle" color="red" size="xs" onClick={onFileRemove}>
                {t('__new__.01-common.actions.remove')}
              </Button>
            </Group>
          ) : null}

          {importResult ? (
            <>
              <Divider />
              <Stack gap="sm">
                <Text fw={500} size="lg">
                  {t('common.bulkImport.results')}
                </Text>
                <Progress
                  value={
                    (importResult.summary.created / Math.max(1, importResult.summary.total)) * 100
                  }
                  color={
                    importResult.summary.failed > 0 || importResult.summary.skipped > 0
                      ? 'yellow'
                      : 'green'
                  }
                  size="xl"
                  radius="md"
                />
                <Group justify="space-between">
                  <Badge color="blue" variant="light" leftSection={<IconPackage size={14} />}>
                    {t('common.bulkImport.total')}: {importResult.summary.total}
                  </Badge>
                  <Badge color="green" variant="light" leftSection={<IconCheck size={14} />}>
                    {t('common.bulkImport.created')}: {importResult.summary.created}
                  </Badge>
                  <Badge color="orange" variant="light" leftSection={<IconCopy size={14} />}>
                    {t('common.bulkImport.skipped')}: {importResult.summary.skipped}
                  </Badge>
                  <Badge color="red" variant="light" leftSection={<IconX size={14} />}>
                    {t('common.bulkImport.failed')}: {importResult.summary.failed}
                  </Badge>
                </Group>
                {importResult.skipped && importResult.skipped.length > 0 ? (
                  <Stack gap={4}>
                    <Text fw={500} size="sm" c="orange.7">
                      {t('products.bulkImport.skippedTitle')}
                    </Text>
                    {importResult.skipped.map((line, i) => (
                      <Text key={`skip-${i}`} size="xs" c="dimmed">
                        • {line}
                      </Text>
                    ))}
                  </Stack>
                ) : null}
                {importResult.errors && importResult.errors.length > 0 ? (
                  <Stack gap={4}>
                    <Text fw={500} size="sm" c="red.7">
                      {t('common.bulkImport.errorsTitle')}
                    </Text>
                    {importResult.errors.map((line, i) => (
                      <Text key={`err-${i}`} size="xs" c="dimmed">
                        • {line}
                      </Text>
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            </>
          ) : null}

          <Group justify="flex-end">
            <Button variant="default" size="sm" disabled={isLoading} onClick={onCancel}>
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button
              size="sm"
              loading={isLoading}
              disabled={!file}
              leftSection={<IconUpload size={16} />}
              onClick={onImport}
            >
              {t('products.bulkImport.import')}
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
