export const ACTION_BAR_HEIGHT = 56;

const APP_HEADER = 'var(--app-shell-header-offset, 0rem)';

export const STICKY_ACTION_BAR_TOP = APP_HEADER;

export const STICKY_RAIL_TOP = `calc(${APP_HEADER} + ${ACTION_BAR_HEIGHT}px + var(--mantine-spacing-md))`;

export const ACTION_BAR_Z = 'calc(var(--mantine-z-index-app) - 1)';
