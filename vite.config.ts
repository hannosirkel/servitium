import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/dice/',
  plugins: [react()],
  build: { outDir: 'dist/dice', emptyOutDir: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/dice/testSetup.ts', './src/chess-clock/testSetup.ts', './src/mtg/testSetup.ts', './src/ludus/testSetup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
