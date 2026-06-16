// @ts-check
import vercel from '@astrojs/vercel';
import { defineConfig, envField } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel({
    maxDuration: 60,
  }),
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      GEMINI_API_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },
});