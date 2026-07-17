import { Text } from '@mantine/core';

type BuildInformationProps = {
  version: string;
  buildHash: string;
  buildTimestamp: string;
};

export function BuildInformation({ version, buildHash, buildTimestamp }: BuildInformationProps) {
  return (
    <Text size="xs" c="neutral.3" ta="left" style={{ fontStyle: 'italic' }}>
      {version} ({buildHash})
      <br />
      Build: {buildTimestamp}
    </Text>
  );
}
