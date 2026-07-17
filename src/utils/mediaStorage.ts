import { dolgaConnector } from '@credo/connectors/connector';

export function deleteMedia(fileUrl: string | undefined | null): void {
  if (!fileUrl) return;
  dolgaConnector.mediaDelete({ fileUrl }).catch(() => {});
}
