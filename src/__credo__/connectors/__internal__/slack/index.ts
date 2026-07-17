import { yamlify } from '@credo/kits/object';
import { ONE_MINUTE, ONE_SECOND } from '@credo/kits/time';

import type {
  SlackAttachment,
  SlackEc2Information,
  SlackNotifyColor,
  SlackSimpleNotifyType,
} from './types';

const SLACK_API_URL = 'https://slack.com/api/chat.postMessage';

const storage = {
  token: '',
  instanceName: '',
  defaultChannel: '',
  buildVersion: '',
  buildTime: 0,
  ec2Information: undefined as SlackEc2Information | undefined,
  channels: {
    error: undefined as string | undefined,
    warning: undefined as string | undefined,
  },
  nextPushByKey: {} as Record<string, number>,
};

export const slackConnector = {
  setToken: (token: string) => {
    storage.token = token;
    return slackConnector;
  },
  setEc2Information: (ec2Information: SlackEc2Information) => {
    storage.ec2Information = ec2Information;
    return slackConnector;
  },
  setBuildInformation: (buildVersion: string, buildTimestamp: number) => {
    const dateString = new Date(buildTimestamp).toLocaleDateString('en-US', {
      timeZone: 'Asia/Saigon',
    });
    storage.buildVersion = `v${buildVersion}-${dateString}`;
    storage.buildTime = buildTimestamp;
    return slackConnector;
  },
  setInstanceName: (instanceName: string) => {
    storage.instanceName = instanceName;
    return slackConnector;
  },
  setDefaultChannel: (channel: string, channels?: { error?: string; warning?: string }) => {
    storage.defaultChannel = channel;
    storage.channels = {
      error: channels?.error,
      warning: channels?.warning,
    };
    return slackConnector;
  },

  simpleNotify: async ({
    title,
    channel,
    content,
    key,
    type = 'info',
    span = 30 * ONE_SECOND,
    color = 'good',
  }: {
    type?: SlackSimpleNotifyType;
    key?: string;
    span?: number;
    color?: SlackNotifyColor;
    title: string;
    channel?: string;
    content: Record<string, unknown>;
  }) => {
    if (key) {
      const next = storage.nextPushByKey[key] || 0;
      const now = Date.now();
      if (next > now) {
        return;
      }
      storage.nextPushByKey[key] = now + span;
    }

    let resolvedChannel: string | undefined = channel;
    if (!resolvedChannel) {
      switch (type) {
        case 'error':
          resolvedChannel = storage.channels.error;
          break;
        case 'warning':
          resolvedChannel = storage.channels.warning;
          break;
        default:
          break;
      }
    }

    await push({
      channel: resolvedChannel,
      title,
      content,
      color,
    }).catch(() => {
      // ignore error
    });
  },

  instanceStarted: async ({ channel }: { channel?: string } = {}) => {
    await push({
      channel,
      title: `[${storage.instanceName}] Instance Started`,
      content: {
        instance: storage.instanceName,
        startedAt: new Date().toISOString(),
        version: storage.buildVersion,
        timestamp: new Date(storage.buildTime).toLocaleString('en-US', {
          timeZone: 'Asia/Saigon',
        }),
      },
    }).catch((error) => {
      
      console.error(`Failed to send message to Slack: ${error}`);
    });
  },

  notifyError: async ({
    uniqueId,
    error,
    channel,
    memo,
  }: {
    uniqueId?: string;
    error: Error;
    channel?: string;
    memo?: Record<string, unknown> | undefined;
  }) => {
    
    if (uniqueId) {
      const dedupeKey = `error-${uniqueId}`;
      const next = storage.nextPushByKey[dedupeKey] || 0;
      const now = Date.now();
      if (next > now) {
        return;
      }
      storage.nextPushByKey[dedupeKey] = now + 10 * ONE_MINUTE;
    }

    const content: Record<string, unknown> = {};
    if (uniqueId) {
      content['uniqueId'] = uniqueId;
    }

    content['name'] = error.name;

    if (error.cause) {
      content['cause'] = error.cause;
    }

    if (error.stack) {
      content['stack'] = error.stack;
    }

    if (memo) {
      content['memo'] = memo;
    }

    await push({
      channel: channel ?? storage.channels.error,
      title: `[${storage.instanceName}] Error: ${error.message}`,
      content,
      color: 'danger',
    }).catch(() => {
      // ignore error
    });
  },

  rawNotify: async (webhook: string, payload: Record<string, unknown>) => {
    const webhookUrl = webhook.startsWith('https://')
      ? webhook
      : `https://hooks.slack.com/services/${webhook}`;
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    }).catch(() => {
      // ignore error
    });
  },
};

function buildBlocks({
  title,
  content,
}: {
  title?: string;
  content?: Record<string, unknown>;
}): unknown[] {
  const blocks: unknown[] = [];

  if (title) {
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: title,
        emoji: true,
      },
    });
  }

  if (content) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\`\`\`${yamlify(content)}\`\`\``,
      },
    });
  }

  return blocks;
}

function formatAttachments({
  author,
  color,
  footer,
}: {
  author: string;
  color: SlackNotifyColor | undefined;
  footer: string | undefined;
}): SlackAttachment[] {
  return [
    {
      title: author,
      color,
      footer,
      ts: Math.floor(Date.now() / 1e3),
    } satisfies SlackAttachment,
  ];
}

async function push({
  channel,
  title,
  content,
  color = 'good',
  withFooter = true,
}: {
  channel?: string | undefined;
  title?: string;
  content?: Record<string, unknown>;
  color?: SlackNotifyColor;
  withFooter?: boolean;
}) {
  const resolvedToken = storage.token;
  if (!resolvedToken) {
    throw new Error('Token is required');
  }

  const resolvedChannel = channel ?? storage.defaultChannel;
  if (!resolvedChannel) {
    
    return;
  }

  const blocks = buildBlocks({
    title: title ?? '',
    content: content ?? {},
  });
  const ip = storage.ec2Information?.publicIp || storage.ec2Information?.privateIp;
  const attachments = withFooter
    ? formatAttachments({
        author: storage.instanceName,
        color,
        footer: [
          storage.buildVersion ? `- :package: ${storage.buildVersion}` : '',
          ip ? `:pushpin: ${ip}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
      })
    : undefined;

  const data: Record<string, unknown> = {
    channel: resolvedChannel,
    attachments,
  };

  if (blocks.length > 0) {
    data['blocks'] = blocks;
  } else {
    data['text'] = 'no message';
  }

  
  await fetch(SLACK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${resolvedToken}`,
    },
    body: JSON.stringify(data),
  }).catch(() => {
    // ignore error
  });
}
