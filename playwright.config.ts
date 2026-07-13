import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// .env.test tiene prioridad (creds del user de test).
// .env.local provee fallback (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
// sin que el usuario tenga que duplicarlos.
dotenv.config({ path: path.resolve(__dirname, '.env.test') })
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

export default defineConfig({
    testDir: './tests',
    globalSetup: './tests/auth/global-setup.ts',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    // workers=1 siempre: el dev server Next.js es un único proceso y las queries
    // contra Supabase con el dataset real (13k+ tareas) producen timeouts en
    // networkidle cuando varios tests compiten a la vez.
    workers: 1,
    reporter: [
        ['html', { open: 'never' }],
        ['list'],
    ],
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        // ── Setup projects (auth state guardado por rol) ───────────────────────
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
        {
            name: 'setup-reporta-admin',
            testMatch: /auth\/setup-reporta-admin\.ts/,
        },

        // ── Chromium projects (uno por rol) ────────────────────────────────────
        {
            name: 'chromium',          // default — rol planner (retrocompatible)
            use: {
                ...devices['Desktop Chrome'],
                storageState: '.auth/planner.json',
            },
            dependencies: ['setup-planner'],
            grepInvert: /@sistema|@roles/,     // @sistema requiere reporta_admin — usa chromium-reporta-admin; @roles en chromium-admin/viewer
        },
        {
            name: 'chromium-admin',
            use: {
                ...devices['Desktop Chrome'],
                storageState: '.auth/admin.json',
            },
            // setup-planner también: los tests @roles usan planner.json para
            // "RBAC — Planner @roles" y necesitan un token fresco.
            dependencies: ['setup-admin', 'setup-planner'],
            grep: /@roles/,
        },
        {
            name: 'chromium-viewer',
            use: {
                ...devices['Desktop Chrome'],
                storageState: '.auth/viewer.json',
            },
            dependencies: ['setup-viewer', 'setup-planner'],
            grep: /@roles/,
        },
        {
            name: 'chromium-reporta-admin',
            use: {
                ...devices['Desktop Chrome'],
                storageState: '.auth/reporta-admin.json',
            },
            dependencies: ['setup-reporta-admin'],
            grep: /@sistema/,
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
