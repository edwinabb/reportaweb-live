import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION ?? '3.5.3',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    initialScope: {
        tags: { project: 'Reporta Web' },
    },
})
