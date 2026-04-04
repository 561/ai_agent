import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: path.join(ROOT, 'src/main/index.ts'),
        vite: {
          build: {
            outDir: path.join(ROOT, 'dist-electron/main'),
            rollupOptions: {
              external: ['electron', 'electron-store', 'path', 'url', 'child_process', 'util', 'fs', 'uiohook-napi'],
              output: {
                format: 'cjs',
              },
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(ROOT, 'src/shared'),
    },
  },
  root: path.join(ROOT, 'src/renderer'),
  build: {
    outDir: path.join(ROOT, 'dist'),
    emptyOutDir: true,
  },
})
