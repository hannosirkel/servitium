import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/chess-clock/',
  plugins: [react()],
  build: {
    outDir: 'dist/chess-clock',
    emptyOutDir: true,
    rollupOptions: { input: 'chess-clock.html' },
  },
});
