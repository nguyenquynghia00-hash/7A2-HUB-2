import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        filename: 'manifest.json',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: 'Lớp 7A2 Hub',
          short_name: '7A2 Hub',
          description: 'Nền tảng học tập và kết nối cho lớp 7A2',
          theme_color: '#4f46e5',
          icons: [
            {
              src: 'https://ais-pre-jero3ppv3dobqhl6dhx3un-341941663870.asia-southeast1.run.app/',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://ais-pre-jero3ppv3dobqhl6dhx3un-341941663870.asia-southeast1.run.app/',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'https://ais-pre-jero3ppv3dobqhl6dhx3un-341941663870.asia-southeast1.run.app/',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
