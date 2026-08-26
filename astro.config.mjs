// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://monostich.cloud',
  server: {
    host: true,
    port: 4321,
  },
});
