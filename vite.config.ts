import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

process.env.VITE_APP_VERSION = process.env.npm_package_version;
process.env.VITE_APP_BUILD_TIMESTAMP = Date.now().toString()

function requireEnv(env: Record<string, string>, key: string): string {
  const value = env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function buildIdentity(): { version: string; hash: string; timestamp: number } {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf8')) as { version?: string };

  const fromEnv =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.CF_PAGES_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.VITE_APP_GIT_COMMIT;

  let hash = fromEnv?.slice(0, 8) ?? '';
  if (!hash) {
    try {
      hash = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim().slice(0, 8);
    } catch {
      hash = 'nogit';
    }
  }

  return { version: `v${pkg.version ?? '0.0.0'}`, hash, timestamp: Date.now() };
}

function buildInfoPlugin(identity: ReturnType<typeof buildIdentity>): Plugin {
  return {
    name: 'build-info',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'build-info.json',
        source: JSON.stringify({
          buildHash: identity.hash,
          buildTimestamp: String(identity.timestamp),
        }),
      });
    },
  };
}


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const identity = buildIdentity();
  return {
    define: {
      __BUILD_VERSION__: JSON.stringify(identity.version),
      __BUILD_HASH__: JSON.stringify(identity.hash),
      __BUILD_TIMESTAMP__: JSON.stringify(identity.timestamp),
    },
    server: {
      port: env.VITE_APP_PORT ? parseInt(env.VITE_APP_PORT) : 5189,
      hmr: true,
    },
    resolve: {
      alias: {
        // eslint-disable-next-line no-undef
        '@': resolve(__dirname, './src'),
        '@credo/modules': resolve(__dirname, './src/__credo__/modules'),
        '@credo/base-ui': resolve(__dirname, './src/__credo__/ui'),
        '@credo/connectors': resolve(__dirname, './src/__credo__/connectors'),
        '@credo/kits': resolve(__dirname, './src/__credo__/kits'),
      },
    },
    build: {
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: {
            router: ['react-router'],
            mantine: ['@mantine/core', '@mantine/hooks', '@mantine/form'],
          },
        },
      },
    },
    plugins: [
      // Replace %VITE_*% in index.html with env values
      {
        name: 'html-env',
        transformIndexHtml(html) {
          return html.replace(/%(\w+)%/g, (_, key) => env[key] ?? '');
        },
      },
      react(),
      buildInfoPlugin(identity),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: requireEnv(env, 'VITE_APP_NAME'),
          short_name: requireEnv(env, 'VITE_APP_NAME'),
          description: requireEnv(env, 'VITE_APP_DESCRIPTION'),
          theme_color: requireEnv(env, 'VITE_APP_THEME_COLOR'),
          background_color: requireEnv(env, 'VITE_APP_BG_COLOR'),
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'pwa-64x64.png',
              sizes: '64x64',
              type: 'image/png',
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: null,
          // Exclude lazy-loaded chunks and build-info from precaching
          globIgnores: ['**/icons-*.js', '**/build-info.json'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB
          runtimeCaching: [
            // Always fetch build-info.json fresh from network
            {
              urlPattern: /\/build-info\.json/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'build-info-check',
                networkTimeoutSeconds: 3,
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Cache lazy-loaded icon chunks on demand
            {
              urlPattern: /\/assets\/icons-.*\.js$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'lazy-icons',
                expiration: {
                  maxEntries: 5,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Navigation requests
            {
              urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pages',
                networkTimeoutSeconds: 3,
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  };
});
