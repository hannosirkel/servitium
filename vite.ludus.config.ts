import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ludus/',
  plugins: [react()],
  build: {
    outDir: 'dist/ludus',
    emptyOutDir: true,
    rollupOptions: { input: 'ludus.html' },
  },
});
