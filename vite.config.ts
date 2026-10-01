import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

type NativeTarget = 'agent' | 'management' | 'audit';

const targets: Record<NativeTarget, {
  root: string;
  entry: string;
  name: string;
  shortName: string;
}> = {
  agent: {
    root: 'apps/agent-app',
    entry: 'src/appTargets/agent-main.tsx',
    name: 'DD WORLD Agent App',
    shortName: 'DD Agent',
  },
  management: {
    root: 'apps/management-app',
    entry: 'src/appTargets/management-main.tsx',
    name: 'DD WORLD Management App',
    shortName: 'DD Management',
  },
  audit: {
    root: 'apps/audit-app',
    entry: 'src/appTargets/audit-main.tsx',
    name: 'DD WORLD Audit Portal',
    shortName: 'DD Audit',
  },
};

export default defineConfig(({ mode }) => {
  const repoRoot = process.cwd();
  const env = loadEnv(mode, repoRoot, '');
  const rawTarget = String(env.VITE_APP_TARGET || '').trim().toLowerCase();

  if (rawTarget && !(rawTarget in targets)) {
    throw new Error(
      `Unknown VITE_APP_TARGET="${rawTarget}". Expected agent, management, or audit.`,
    );
  }

  const target = rawTarget as NativeTarget | '';
  const selected = target ? targets[target] : undefined;
  const appRoot = selected
    ? path.resolve(repoRoot, selected.root)
    : repoRoot;

  return {
    root: appRoot,
    base: './',
    publicDir: path.resolve(repoRoot, 'public'),
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        disable: Boolean(selected),
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'icon.svg',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: target || 'ddworld',
          name: selected?.name || 'DD WORLD MARKETING',
          short_name: selected?.shortName || 'DDWorld',
          description: 'DD WORLD secure institutional mobile platform',
          theme_color: '#14213d',
          background_color: '#f5f8fc',
          display: 'standalone',
          start_url: './',
          scope: './',
          icons: [
            {
              src: './pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: './pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: './pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
        },
      }),
    ],
    build: {
      outDir: path.resolve(repoRoot, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: selected
          ? path.resolve(appRoot, 'index.html')
          : path.resolve(repoRoot, 'index.html'),
        output: {
          manualChunks: undefined,
        },
      },
    },
    define: {
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(
        env.GOOGLE_MAPS_PLATFORM_KEY || '',
      ),
    },
    resolve: {
      alias: {
        '@': repoRoot,
      },
    },
  };
});
