// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  // ... other configurations ...
  base: '/MolMod-Molecular_Modeler/',
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
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
});