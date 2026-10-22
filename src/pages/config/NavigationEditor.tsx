import { ALL_NAV_IDS } from '@/config/navigation';
import type { NavigationConfig } from '@credo/kits/types';
import { Stack } from '@mantine/core';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { configToState, stateToConfigItems, type NavPlatformState } from './navTreeState';
import { NavTreeEditor } from './NavTreeEditor';

export const NavigationSection = memo(function NavigationSection({
  navigation,
  onChange,
}: {
  navigation: NavigationConfig;
  onChange: (nav: NavigationConfig) => void;
}) {
  const [pcState, setPcState] = useState<NavPlatformState>(() =>
    configToState(navigation.pc, ALL_NAV_IDS),
  );
  const [mobileState, setMobileState] = useState<NavPlatformState>(() =>
    configToState(navigation.mobile, ALL_NAV_IDS),
  );

  useEffect(() => {
    setPcState(configToState(navigation.pc, ALL_NAV_IDS));
    setMobileState(configToState(navigation.mobile, ALL_NAV_IDS));
  }, [navigation]);

  const emitChange = useCallback(
    (pc: NavPlatformState, mobile: NavPlatformState) => {
      onChange({
        pc: stateToConfigItems(pc) as NavigationConfig['pc'],
        mobile: stateToConfigItems(mobile) as NavigationConfig['mobile'],
      });
    },
    [onChange],
  );

  const pcStateRef = useRef(pcState);
  const mobileStateRef = useRef(mobileState);
  useEffect(() => {
    pcStateRef.current = pcState;
  }, [pcState]);
  useEffect(() => {
    mobileStateRef.current = mobileState;
  }, [mobileState]);

  const handlePcChange = useCallback(
    (next: NavPlatformState) => {
      setPcState(next);
      emitChange(next, mobileStateRef.current);
    },
    [emitChange],
  );

  const handleMobileChange = useCallback(
    (next: NavPlatformState) => {
      setMobileState(next);
      emitChange(pcStateRef.current, next);
    },
    [emitChange],
  );

  return (
    <Stack gap="lg">
      <NavTreeEditor label="Desktop (PC)" state={pcState} onChange={handlePcChange} />
      <NavTreeEditor
        label="Mobile"
        state={mobileState}
        onChange={handleMobileChange}
        showNavbarPin
      />
    </Stack>
  );
});
