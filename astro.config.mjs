// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://racecalc.top',
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
});
