/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

type ImportMetaEnv = {
  readonly VITE_API_URL?: string;
};

type ImportMeta = {
  readonly env: ImportMetaEnv;
};
