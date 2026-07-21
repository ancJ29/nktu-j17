/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Injected by vite.config.ts `define:` — see src/config/build-version.ts.
declare const __BUILD_VERSION__: string;
declare const __BUILD_HASH__: string;
declare const __BUILD_TIMESTAMP__: number;

type ImportMetaEnv = {
  readonly VITE_API_URL?: string;
};

type ImportMeta = {
  readonly env: ImportMetaEnv;
};
