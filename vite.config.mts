import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react-swc';
import nodecg from './vite-plugin-nodecg.mts';
import { nodecgSchemas } from './vite-plugin-nodecg-schemas.mts';
import rollupEsbuild from 'rollup-plugin-esbuild';
import rollupExternals from 'rollup-plugin-node-externals';
import { BUNDLE_NAME } from './bundleName';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      // src/schemas/* が zod を import するが、フロントエンドでは型のみ使用する。
      // Rollup が resolve できない旨の UNRESOLVED_IMPORT 警告を抑制する。
      onwarn(warning, warn) {
        if (warning.code === 'UNRESOLVED_IMPORT' && warning.exporter === 'zod') return;
        warn(warning);
      },
    },
  },
  plugins: [
    react(),
    nodecg({
      bundleName: BUNDLE_NAME,
      graphics: './src/browser/graphics/*/index.tsx',
      dashboard: './src/browser/dashboard/*/index.tsx',
      extension: {
        input: './src/extension/index.ts',
        plugins: [rollupEsbuild(), rollupExternals()],
        onwarn(warning, warn) {
          if (warning.code === 'UNRESOLVED_IMPORT' && warning.exporter === 'zod') return;
          warn(warning);
        },
      },
    }),
    nodecgSchemas(),
  ]
});
