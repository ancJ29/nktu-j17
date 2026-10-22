

export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ScreenshotError = {
  type: 'permission_denied' | 'not_supported' | 'capture_failed' | 'crop_failed';
  message: string;
};

export async function captureScreenshot(): Promise<string> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw { type: 'not_supported', message: 'Screen capture not supported' } as ScreenshotError;
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
    });

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;

    await new Promise<void>((resolve) => {
      video.addEventListener('loadedmetadata', () => resolve());
    });

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      stream.getTracks().forEach((t) => t.stop());
      throw { type: 'capture_failed', message: 'Canvas context unavailable' } as ScreenshotError;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stream.getTracks().forEach((t) => t.stop());

    return canvas.toDataURL('image/png', 0.95);
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      throw { type: 'permission_denied', message: 'Permission denied' } as ScreenshotError;
    }
    if (typeof error === 'object' && error !== null && 'type' in error) throw error;
    throw {
      type: 'capture_failed',
      message: error instanceof Error ? error.message : 'Capture failed',
    } as ScreenshotError;
  }
}

export async function createCroppedImage(imageSrc: string, crop: CropArea): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject({ type: 'crop_failed', message: 'Canvas context unavailable' } as ScreenshotError);
        return;
      }
      canvas.width = crop.width;
      canvas.height = crop.height;
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject({ type: 'crop_failed', message: 'Blob creation failed' } as ScreenshotError);
        },
        'image/png',
        0.95,
      );
    };
    img.onerror = () =>
      reject({ type: 'crop_failed', message: 'Image load failed' } as ScreenshotError);
    img.src = imageSrc;
  });
}

export function blobToScreenshotFile(blob: Blob): File {
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  return new File([blob], `screenshot-${ts}.png`, { type: 'image/png', lastModified: Date.now() });
}
