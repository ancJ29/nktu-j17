

const storages = {
  apiKey: '',
  baseUrl:
    'https://jgvvmhdzgk.execute-api.ap-southeast-1.amazonaws.com/default/7cfo5dy91icmi2q9fik4o/trigger',
};

export type SendEmailRequest = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResponse = {
  success: boolean;
  error?: string;
};

export const emailConnector = {
  setApiKey: (apiKey: string) => {
    storages.apiKey = apiKey;
    return emailConnector;
  },
  sendEmail: async (input: SendEmailRequest): Promise<SendEmailResponse> => {
    if (!storages.apiKey) {
      throw new Error('API key is not set');
    }
    try {
      await fetch(storages.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': storages.apiKey,
        },
        body: JSON.stringify({
          from: input.from,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
    return { success: true };
  },
};
