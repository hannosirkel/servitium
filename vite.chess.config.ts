import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/chess/',
  plugins: [react()],
  build: {
    outDir: 'dist/chess',
    emptyOutDir: true,
    rollupOptions: { input: 'chess-clock.html' },
  },
});
