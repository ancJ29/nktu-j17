import { Button, Drawer, Group, SimpleGrid, Text, rem } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown } from '@tabler/icons-react';

type Option = {
  value: string;
  label: string;
};

type MobileFilterSelectCommonProps = {
  showTitleInBar?: boolean;

  displayValue?: string;
};

type MobileFilterSelectProps = MobileFilterSelectCommonProps & {
  title: string;

  value: string;

  options: Option[];
  onChange: (value: string) => void;
  multi?: false;
};

type MobileFilterMultiSelectProps = MobileFilterSelectCommonProps & {
  title: string;
  value: string[];
  options: Option[];
  onChange: (value: string[]) => void;
  multi: true;
};

export function MobileFilterSelect(props: MobileFilterSelectProps | MobileFilterMultiSelectProps) {
  const { title, options, multi, showTitleInBar, displayValue } = props;
  const [opened, { open, close }] = useDisclosure(false);

  const handleSelect = (optionValue: string) => {
    if (multi) {
      const current = props.value as string[];
      const onChange = props.onChange as (v: string[]) => void;
      if (optionValue === 'all') {
        onChange([]);
      } else if (current.includes(optionValue)) {
        onChange(current.filter((v) => v !== optionValue));
      } else {
        onChange([...current, optionValue]);
      }
    } else {
      (props.onChange as (v: string) => void)(optionValue);
      close();
    }
  };

  const selectedLabel =
    displayValue ??
    (multi
      ? (props.value as string[]).length > 0
        ? (props.value as string[])
            .map((v) => options.find((o) => o.value === v)?.label ?? v)
            .join(', ')
        : (options.find((o) => o.value === 'all')?.label ?? title)
      : (options.find((o) => o.value === (props.value as string))?.label ??
        (props.value as string)));

  const isNarrowing = multi
    ? (props.value as string[]).length > 0
    : !!props.value && props.value !== 'all';

  const isSelected = (optionValue: string) => {
    if (multi) {
      const current = props.value as string[];
      return optionValue === 'all' ? current.length === 0 : current.includes(optionValue);
    }
    return optionValue === (props.value as string);
  };

  const rows = Math.ceil(options.length / 2);
  const BUTTON_H = 36;
  const GAP = 12;
  const HEADER = 52;
  const PADDING = 16 + 24;
  const drawerHeight = HEADER + PADDING + rows * BUTTON_H + (rows - 1) * GAP;

  return (
    <>
      <Button
        variant={showTitleInBar && !isNarrowing ? 'default' : 'filled'}
        size="compact-sm"
        rightSection={<IconChevronDown size={14} opacity={0.6} />}
        onClick={open}
        style={{ flex: 1, minWidth: 0 }}

        styles={{ label: { flex: 1, minWidth: 0, overflow: 'hidden' } }}
      >
        {showTitleInBar ? (
          <Group gap={6} wrap="nowrap" w="100%" style={{ minWidth: 0 }}>
            {/* The name never truncates — it's short, fixed, and the whole point
                of the chip. All remaining width goes to the value. */}
            <Text component="span" fz="xs" lh={1.2} opacity={0.75} style={{ flexShrink: 0 }}>
              {title}
            </Text>
            <Text component="span" fz="xs" fw={600} lh={1.2} truncate="end" style={{ minWidth: 0 }}>
              {selectedLabel}
            </Text>
          </Group>
        ) : (
          selectedLabel
        )}
      </Button>

      <Drawer
        opened={opened}
        onClose={close}
        title={title}
        position="bottom"
        size={drawerHeight}
        padding="md"
        styles={{
          content: {
            borderTopLeftRadius: rem(16),
            borderTopRightRadius: rem(16),
          },
          header: {
            borderTopLeftRadius: rem(16),
            borderTopRightRadius: rem(16),
          },
          body: {
            paddingBottom: rem(24),
          },
        }}
      >
        <SimpleGrid cols={2} spacing="sm">
          {options.map((opt) => (
            <Button
              key={opt.value}
              variant={isSelected(opt.value) ? 'filled' : 'outline'}
              color={isSelected(opt.value) ? undefined : 'gray'}
              onClick={() => handleSelect(opt.value)}
              fullWidth
            >
              {opt.label}
            </Button>
          ))}
        </SimpleGrid>
      </Drawer>
    </>
  );
}
