import { useSyncExternalStore } from 'react';

type BootState = { cfgReady: boolean; empReady: boolean; clientUnconfigured: boolean };

let state: BootState = { cfgReady: false, empReady: false, clientUnconfigured: false };
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function markCfgReady(): void {
  if (state.cfgReady) return;
  state = { ...state, cfgReady: true };
  notify();
}

export function markEmpReady(): void {
  if (state.empReady) return;
  state = { ...state, empReady: true };
  notify();
}

export function useCfgReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state.cfgReady,
    () => state.cfgReady,
  );
}

export function useEmpReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state.empReady,
    () => state.empReady,
  );
}

export function markClientUnconfigured(): void {
  if (state.clientUnconfigured) return;
  state = { ...state, clientUnconfigured: true };
  notify();
}

export function useClientUnconfigured(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state.clientUnconfigured,
    () => state.clientUnconfigured,
  );
}
