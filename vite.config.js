// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/Reactyl/',
  // enable sourcemaps for useful debug messages in browser inspector
  build: {
    outDir: 'dist', // Output to the root of your project
    assetsDir: 'assets', // Place assets in the 'assets' folder
    //emptyOutDir: true, // Cleans the output directory before building
    sourcemap: true, // or 'inline', or 'hidden'
    rollupOptions: {
      output: {
        // Disable file name hashing for consistent file names
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
