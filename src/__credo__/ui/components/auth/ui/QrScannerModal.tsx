import { useState } from 'react';

import {
  Alert,
  Button,
  FileInput,
  Group,
  Modal,
  rem,
  Stack,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { IconAlertCircle, IconCamera, IconClipboard, IconUpload } from '@tabler/icons-react';
import { type IDetectedBarcode, Scanner } from '@yudiel/react-qr-scanner';

export type QrScannerModalLabels = {
  title: string;
  scanTab: string;
  uploadTab: string;
  scanning: string;
  clickToUpload: string;
  pasteFromClipboard: string;
  processing: string;
  orEnterCode: string;
  codePlaceholder: string;
  cancel: string;
  verify: string;
  cameraPermissionDenied: string;
  noQrCodeFound: string;
  invalidImageFormat: string;
};

type QrScannerModalProps = {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly onScan: (data: string) => void;
  readonly labels: QrScannerModalLabels;
};

export function QrScannerModal({ opened, onClose, onScan, labels }: QrScannerModalProps) {
  const [error, setError] = useState<string | undefined>(undefined);
  const [manualInput, setManualInput] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>('camera');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const handleQrScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes.length > 0 && detectedCodes[0].rawValue) {
      onScan(detectedCodes[0].rawValue);
      setIsPaused(true);
      onClose();
    }
  };

  const handleQrError = (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowed')) {
      setError(labels.cameraPermissionDenied);
    }
  };

  const handleManualSubmit = () => {
    if (manualInput) {
      onScan(manualInput);
      setManualInput('');
      onClose();
    }
  };

  const handleClose = () => {
    setError(undefined);
    setManualInput('');
    setActiveTab('camera');
    setIsProcessing(false);
    setIsPaused(false);
    onClose();
  };

  const processImage = async (file: File | Blob) => {
    setError(undefined);
    setIsProcessing(true);

    try {
      const img = new Image();
      const url = URL.createObjectURL(file);

      await new Promise<void>((resolve, reject) => {
        img.addEventListener('load', () => resolve());
        img.addEventListener('error', () => reject(new Error('Failed to load image')));
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Failed to create canvas context');
      }

      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      const jsQR = (await import('jsqr')).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      URL.revokeObjectURL(url);

      if (code && code.data) {
        onScan(code.data);
        onClose();
      } else {
        setError(labels.noQrCodeFound);
      }
    } catch {
      setError(labels.invalidImageFormat);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (file: File | null) => {
    if (file) {
      void processImage(file);
    }
  };

  const handlePaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();

      for (const item of clipboardItems) {
        if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
          const blob = await item.getType(
            item.types.find((type) => type.startsWith('image/')) || 'image/png',
          );
          void processImage(blob);
          return;
        }
      }

      const text = await navigator.clipboard.readText();
      if (text) {
        onScan(text);
        onClose();
      } else {
        setError(labels.noQrCodeFound);
      }
    } catch {
      setError(labels.invalidImageFormat);
    }
  };

  return (
    <Modal opened={opened} onClose={handleClose} title={labels.title} size="lg" centered>
      <Stack gap="md">
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            {error}
          </Alert>
        )}

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow>
            <Tabs.Tab value="camera" leftSection={<IconCamera size={16} />}>
              {labels.scanTab}
            </Tabs.Tab>
            <Tabs.Tab value="upload" leftSection={<IconUpload size={16} />}>
              {labels.uploadTab}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="camera" pt="md">
            {opened && activeTab === 'camera' && (
              <Stack gap="md">
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 400,
                    margin: '0 auto',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <Scanner
                    onScan={handleQrScan}
                    onError={handleQrError}
                    constraints={{ facingMode: 'environment' }}
                    paused={isPaused || !opened || activeTab !== 'camera'}
                    scanDelay={500}
                    styles={{
                      container: { width: '100%' },
                      video: { width: '100%', borderRadius: 8 },
                    }}
                  />
                </div>

                <Text size="sm" c="dimmed" ta="center">
                  {labels.scanning}
                </Text>
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="upload" pt="md">
            <Stack gap="md">
              <FileInput
                accept="image/*"
                leftSection={<IconUpload size={rem(16)} />}
                placeholder={labels.clickToUpload}
                onChange={handleFileUpload}
                disabled={isProcessing}
              />

              <Button
                fullWidth
                variant="default"
                leftSection={<IconClipboard size={16} />}
                onClick={() => void handlePaste()}
                disabled={isProcessing}
              >
                {labels.pasteFromClipboard}
              </Button>

              {isProcessing && (
                <Text size="sm" c="dimmed" ta="center">
                  {labels.processing}
                </Text>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Stack gap="sm" mt="md">
          <Text size="sm" c="dimmed">
            {labels.orEnterCode}
          </Text>
          <TextInput
            placeholder={labels.codePlaceholder}
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manualInput) {
                handleManualSubmit();
              }
            }}
            disabled={isProcessing}
          />
          <Group grow>
            <Button variant="default" onClick={handleClose} disabled={isProcessing}>
              {labels.cancel}
            </Button>
            <Button
              variant="filled"
              onClick={handleManualSubmit}
              disabled={!manualInput || isProcessing}
            >
              {labels.verify}
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Modal>
  );
}
