import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For a repository named differently, set VITE_BASE_PATH=/your-repository/ at build time.
export default defineConfig({ base: process.env.VITE_BASE_PATH || '/', plugins: [react()] })
