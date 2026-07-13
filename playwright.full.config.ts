import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '.env.test') })
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// Suite v2 — todos los roles sin filtro @roles
// Corre ~1100 tests en ~80 min. Usar: npm run test:e2e:full
export default defineConfig({
    testDir: './tests',
    globalSetup: './tests/auth/global-setup.ts',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: [
        ['html', { outputFolder: 'playwright-report-full', open: 'never' }],
        ['list'],
    ],
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        // ── Setup projects ────────────────────────────────────────────────────
        {
            name: 'setup-planner',
            testMatch: /auth\/setup-planner\.ts/,
        },
        {
            name: 'setup-admin',
            testMatch: /auth\/setup-admin\.ts/,
        },
        {
            name: 'setup-viewer',
            testMatch: /auth\/setup-viewer\.ts/,
        },

        // ── Chromium projects — SIN filtro grep (todos los tests en los 3 roles)
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: '.auth/planner.json',
            },
            dependencies: ['setup-planner'],
        },
        {
            name: 'chromium-admin',
            use: {
                ...devices['Desktop Chrome'],
                storageState: '.auth/admin.json',
            },
            dependencies: ['setup-admin', 'setup-planner'],
            // Sin grep: admin corre TODOS los tests (no solo @roles)
        },
        {
            name: 'chromium-viewer',
            use: {
                ...devices['Desktop Chrome'],
                storageState: '.auth/viewer.json',
            },
            dependencies: ['setup-viewer', 'setup-planner'],
            // Sin grep: viewer corre TODOS los tests (no solo @roles)
        },
    ],
    webServer: process.env.CI || process.env.TEST_NO_SERVER
        ? undefined
        : {
            command: 'npm run dev',
            url: BASE_URL,
            reuseExistingServer: true,
            timeout: 120_000,
        },
})
