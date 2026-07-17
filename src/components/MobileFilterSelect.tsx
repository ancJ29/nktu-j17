import { Button, Drawer, SimpleGrid, rem } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown } from '@tabler/icons-react';

type Option = {
  value: string;
  label: string;
};

type MobileFilterSelectProps = {
  
  title: string;
  
  value: string;
  
  options: Option[];
  onChange: (value: string) => void;
  multi?: false;
};

type MobileFilterMultiSelectProps = {
  title: string;
  value: string[];
  options: Option[];
  onChange: (value: string[]) => void;
  multi: true;
};

export function MobileFilterSelect(props: MobileFilterSelectProps | MobileFilterMultiSelectProps) {
  const { title, options, multi } = props;
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

  const selectedLabel = multi
    ? (props.value as string[]).length > 0
      ? (props.value as string[])
          .map((v) => options.find((o) => o.value === v)?.label ?? v)
          .join(', ')
      : (options.find((o) => o.value === 'all')?.label ?? title)
    : (options.find((o) => o.value === (props.value as string))?.label ?? (props.value as string));

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
        variant="filled"
        size="compact-sm"
        rightSection={<IconChevronDown size={14} />}
        onClick={open}
        style={{ flex: 1, minWidth: 0 }}
      >
        {selectedLabel}
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
