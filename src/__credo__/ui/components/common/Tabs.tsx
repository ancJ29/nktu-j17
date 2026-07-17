import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';

import {
  Card,
  Group,
  Select,
  Tabs as MantineTabs,
  type TabsListProps as MantineTabsListProps,
  type TabsPanelProps as MantineTabsPanelProps,
  type TabsProps as MantineTabsProps,
  type TabsTabProps as MantineTabsTabProps,
} from '@mantine/core';
import { useUncontrolled } from '@mantine/hooks';

import { device } from '../../utils/device';
import './Tabs.css';

const classes = {
  tabs: 'credo-tabs',
  tabsList: 'credo-tabs-list',
  tab: 'credo-tabs-tab',
} as const;

type TabsProps = MantineTabsProps & {
  readonly children: ReactNode;
};

export function Tabs({ children, classNames, value, defaultValue, onChange, ...props }: TabsProps) {
  
  
  const [activeValue, setActiveValue] = useUncontrolled<string | null>({
    value,
    defaultValue,
    finalValue: null,
    onChange,
  });

  
  
  
  
  const tabs = device.isMobile ? extractTabs(children) : null;

  if (tabs && tabs.length > 0) {
    const active = tabs.find((tab) => tab.value === activeValue);
    
    const panels = Children.toArray(children).filter(
      (child) => !(isValidElement(child) && child.type === TabsList),
    );

    return (
      <MantineTabs
        classNames={{ root: classes.tabs, ...classNames }}
        value={activeValue}
        onChange={setActiveValue}
        {...props}
      >
        <Select
          data={tabs.map((tab) => ({
            value: tab.value,
            label: tab.label,
            disabled: tab.disabled,
          }))}
          value={activeValue}
          onChange={(next) => next && setActiveValue(next)}
          leftSection={active?.icon}
          allowDeselect={false}
          checkIconPosition="right"
          comboboxProps={{ withinPortal: true }}
          mb="md"
          renderOption={({ option }) => {
            const meta = tabs.find((tab) => tab.value === option.value);
            return (
              <Group gap="xs" wrap="nowrap">
                {meta?.icon}
                <span>{option.label}</span>
              </Group>
            );
          }}
        />
        {panels}
      </MantineTabs>
    );
  }

  return (
    <MantineTabs
      classNames={{ root: classes.tabs, ...classNames }}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      {...props}
    >
      {children}
    </MantineTabs>
  );
}

type TabMeta = {
  value: string;
  label: string;
  icon: ReactNode;
  disabled: boolean;
};

function extractTabs(children: ReactNode): TabMeta[] {
  const listEl = Children.toArray(children).find(
    (child): child is ReactElement<TabsListProps> =>
      isValidElement(child) && child.type === TabsList,
  );
  if (!listEl) return [];

  const tabs: TabMeta[] = [];
  for (const child of Children.toArray(listEl.props.children)) {
    if (!isValidElement(child) || child.type !== TabsTab) continue;
    const tabProps = child.props as MantineTabsTabProps;
    if (tabProps.value == null) continue;
    tabs.push({
      value: tabProps.value,
      label: typeof tabProps.children === 'string' ? tabProps.children : tabProps.value,
      icon: tabProps.leftSection,
      disabled: tabProps.disabled ?? false,
    });
  }
  return tabs;
}

type TabsListProps = MantineTabsListProps & {
  readonly children: ReactNode;
};

function TabsList({ children, className, ...props }: TabsListProps) {
  return (
    <MantineTabs.List className={`${classes.tabsList} ${className || ''}`} {...props}>
      {children}
    </MantineTabs.List>
  );
}

type TabsTabProps = MantineTabsTabProps & {
  readonly children: ReactNode;
};

function TabsTab({ children, className, ...props }: TabsTabProps) {
  return (
    <MantineTabs.Tab className={`${classes.tab} ${className || ''}`} {...props}>
      {children}
    </MantineTabs.Tab>
  );
}

type TabsPanelCardProps = Omit<MantineTabsPanelProps, 'children'> & {
  readonly children: ReactNode;
};

function TabsPanelCard({ children, bg, ...props }: TabsPanelCardProps) {
  return (
    <MantineTabs.Panel pt="md" {...props}>
      <Card withBorder padding="lg" bg={bg}>
        {children}
      </Card>
    </MantineTabs.Panel>
  );
}

Tabs.List = TabsList;
Tabs.Tab = TabsTab;
Tabs.Panel = MantineTabs.Panel;
Tabs.PanelCard = TabsPanelCard;
