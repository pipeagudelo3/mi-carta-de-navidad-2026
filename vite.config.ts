import { defineConfig } from 'vite';

// Rutas relativas: el sitio funciona igual en GitHub Pages (subcarpeta),
// en un dominio propio o abriendo la vista previa local.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 800,
  },
});
