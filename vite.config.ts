import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
