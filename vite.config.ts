import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Two pages: Rocky itself, and the QA desk at /qa/ — a light, separate
    // page so QA analysts log audits without loading the game.
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), qa: resolve(__dirname, 'qa/index.html') } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Phase 12 added backend/ as a separate package with its own
    // vitest.config.ts (node environment, Express/supertest) — without
    // this, vitest's default include glob picks up backend/tests/**
    // here too and runs them under jsdom, which is the wrong environment
    // for them even though they happen to pass. `npm test` stays scoped
    // to this frontend; run the backend's suite from backend/.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
