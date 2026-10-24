import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves this repository beneath /Project-Maria/
  base: '/Project-Maria/',
  plugins: [react()],
  server: { host: '0.0.0.0' },
  preview: { host: '0.0.0.0' }
});
