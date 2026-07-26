import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/mtg/',
  plugins: [react()],
  build: {
    outDir: 'dist/mtg',
    emptyOutDir: true,
    rollupOptions: { input: 'mtg.html' },
  },
});
