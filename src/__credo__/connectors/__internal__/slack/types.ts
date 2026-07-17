export type SlackNotifyColor = 'good' | 'warning' | 'danger' | string;

export type SlackAttachment = Partial<{
  color: SlackNotifyColor | undefined;
  title: string;
  text: string;
  footer: string | undefined;
  ts: number;
}>;

export type SlackEc2Information = {
  instanceId: string;
  instanceType: string;
  region: string;
  availabilityZone: string;
  amiId: string;
  hostname: string;
  privateIp: string;
  publicIp: string;
  mac: string;
  timestamp: string;
};

export type SlackSimpleNotifyType = 'error' | 'warning' | 'info' | 'success';
