export const r2Connector = {
  uploadImage: async ({
    fileContent,
    contentType,
    uploadUrl,
  }: {
    uploadUrl: string;
    fileContent: any;
    contentType: string;
  }): Promise<{ success: boolean; fileUrl?: string; key?: string; error?: string }> => {
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },

      body: fileContent as BodyInit,
    });

    if (!uploadResponse.ok) {
      return {
        success: false,
        error: `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
      };
    }

    return { success: true };
  },
};
