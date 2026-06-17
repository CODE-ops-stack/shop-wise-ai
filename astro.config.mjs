// @ts-check
import vercel from '@astrojs/vercel';
import { defineConfig, envField } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

// https://docs.astro.build/en/guides/deploy/vercel/
export default defineConfig({
  output: 'server',
  adapter: vercel({
    maxDuration: 60,
  }),
  integrations: [svelte()],
  trailingSlash: 'never',
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
      GOOGLE_CSE_API_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      GOOGLE_CSE_CX: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },
});