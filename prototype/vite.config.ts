import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

/* tokens.css loads Google Fonts with an @import; the demo runs offline, so that one line is dropped at build time
   and Fontsource serves the same families locally (src/styles/fonts.css). The DS files are never copied: they are
   imported from docs/design/ds-v1 as they are, so the demo cannot fork them. */
function offlineFonts(): Plugin {
  return {
    name: 'mypaisa-offline-fonts',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('ds-v1') && id.endsWith('tokens.css')) {
        return code.replace(/@import url\("https:\/\/fonts\.googleapis\.com[^"]*"\);/, '/* Google Fonts import dropped: fonts.css serves them offline */');
      }
      return null;
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [offlineFonts(), svelte()],
  resolve: {
    alias: {
      '@ds': root + 'docs/design/ds-v1',
      '@fig': root + 'docs/design/figures',
      '@app-v1': root + 'docs/design/app-v1',
    },
  },
  server: { fs: { allow: [root] }, port: 5290, strictPort: false },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 2000 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
