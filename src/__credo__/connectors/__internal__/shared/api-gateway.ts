export function apiGatewayUrl(key: string, region: string, stage: string): string {
  return `https://${key}.execute-api.${region}.amazonaws.com/${stage}`;
}
