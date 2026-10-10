/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base` must match the URL path the site is served from. The GitHub Pages
// workflow sets VITE_BASE_PATH to `/<repository-name>/` automatically; locally
// and for custom domains / `<user>.github.io` repositories it is `/`.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.ts'] }
})
