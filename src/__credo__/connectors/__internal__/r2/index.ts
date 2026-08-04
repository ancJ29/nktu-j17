export const r2Connector = {
  uploadImage: async ({
    fileContent,
    contentType,
    uploadUrl,
    signal,
  }: {
    uploadUrl: string;
    fileContent: any;
    contentType: string;
    signal?: AbortSignal;
  }): Promise<{
    success: boolean;
    fileUrl?: string;
    key?: string;
    error?: string;
    status?: number;
  }> => {
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },

      body: fileContent as BodyInit,
      ...(signal && { signal }),
    });

    if (!uploadResponse.ok) {
      return {
        success: false,
        status: uploadResponse.status,
        error: `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
      };
    }

    return { success: true, status: uploadResponse.status };
  },
};
