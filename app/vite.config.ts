import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained index.html (JS, CSS and data inlined) that opens by double-click.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { outDir: 'dist', emptyOutDir: true },
});
