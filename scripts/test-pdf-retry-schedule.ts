// scripts/test-pdf-retry-schedule.ts
import assert from 'node:assert/strict'
import { getRetryDelaySeconds, computeNextRetryAt, RETRY_SCHEDULES } from '../lib/pdf-retry-schedule'

// Cronogramas exactos del spec
assert.deepEqual(RETRY_SCHEDULES.comercial, [10, 20, 30, 60, 120])
assert.deepEqual(RETRY_SCHEDULES.operativo, [60, 120, 300, 600, 720])

// attemptsSoFar=0 → primer reintento (el que se agenda al encolar, tras el intento síncrono inicial)
assert.equal(getRetryDelaySeconds('comercial', 0), 10)
assert.equal(getRetryDelaySeconds('operativo', 0), 60)

// attemptsSoFar=4 → quinto y último reintento
assert.equal(getRetryDelaySeconds('comercial', 4), 120)
assert.equal(getRetryDelaySeconds('operativo', 4), 720)

// attemptsSoFar=5 → reintentos agotados (5 intentos ya hechos)
assert.equal(getRetryDelaySeconds('comercial', 5), null)
assert.equal(getRetryDelaySeconds('operativo', 5), null)

// computeNextRetryAt suma segundos a una fecha base fija
const base = new Date('2026-09-06T12:00:00.000Z')
const next = computeNextRetryAt('comercial', 0, base)
assert.equal(next?.toISOString(), '2026-09-06T12:00:10.000Z')

const exhausted = computeNextRetryAt('operativo', 5, base)
assert.equal(exhausted, null)

console.log('OK: pdf-retry-schedule')
