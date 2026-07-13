/**
 * Tenant timezone utilities — all functions accept IANA timezone identifiers
 * (e.g. 'America/Lima', 'America/Santiago').
 *
 * Design rule: Supabase always stores UTC. These helpers convert between UTC
 * and the tenant's local timezone for display and for building ISO strings
 * that carry an explicit offset so Postgres stores the right UTC value.
 */

/** Returns today's date as YYYY-MM-DD in the given timezone (not UTC date). */
export function todayInTZ(timezone: string): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
}

/** Returns the current time as HH:mm in the given timezone. */
export function nowTimeInTZ(timezone: string): string {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date())
}

/**
 * Returns the UTC offset for a given timezone at a specific moment, in minutes.
 * Positive  → timezone is behind UTC  (e.g. America/Lima = +300 = UTC-5)
 * Negative  → timezone is ahead of UTC (e.g. Asia/Tokyo = -540 = UTC+9)
 */
export function getUTCOffsetMinutes(timezone: string, at = new Date()): number {
    const utcStr = at.toLocaleString('en-US', { timeZone: 'UTC' })
    const tzStr  = at.toLocaleString('en-US', { timeZone: timezone })
    return Math.round((new Date(utcStr).getTime() - new Date(tzStr).getTime()) / 60_000)
}

/**
 * Builds an ISO 8601 string with explicit UTC offset from separate date and
 * time strings entered by the user in the tenant's local timezone.
 *
 * Example: buildLocalISO('2026-05-05', '14:30', 'America/Lima')
 *          → "2026-05-05T14:30:00-05:00"
 * Postgres/Supabase receives this and stores 19:30 UTC correctly.
 */
export function buildLocalISO(dateStr: string, timeStr: string, timezone: string): string {
    const offsetMin = getUTCOffsetMinutes(timezone)
    const sign = offsetMin >= 0 ? '-' : '+'
    const abs = Math.abs(offsetMin)
    const hh = String(Math.floor(abs / 60)).padStart(2, '0')
    const mm = String(abs % 60).padStart(2, '0')
    return `${dateStr}T${timeStr}:00${sign}${hh}:${mm}`
}

/**
 * Returns an ISO 8601 string for the current moment expressed in the tenant
 * timezone, with an explicit UTC offset so Postgres stores it correctly.
 *
 * Example for Lima at 14:30:45 local → "2026-05-05T14:30:45-05:00"
 */
export function nowISOwithOffset(timezone: string): string {
    const now = new Date()
    const offsetMin = getUTCOffsetMinutes(timezone, now)
    const sign = offsetMin >= 0 ? '-' : '+'
    const abs = Math.abs(offsetMin)
    const hh = String(Math.floor(abs / 60)).padStart(2, '0')
    const mm = String(abs % 60).padStart(2, '0')

    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    }).formatToParts(now)

    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}${sign}${hh}:${mm}`
}

/**
 * Formats a UTC date/string for display in the given timezone.
 * Defaults to es-PE locale (Spanish, Peru).
 */
export function formatInTZ(
    date: Date | string,
    timezone: string,
    opts: Intl.DateTimeFormatOptions = {},
): string {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('es-PE', {
        timeZone: timezone,
        ...opts,
    }).format(d)
}

/**
 * Formats a UTC date for display as a short date string in the tenant timezone.
 * Example: "05/05/2026"
 */
export function formatDateInTZ(date: Date | string, timezone: string): string {
    return formatInTZ(date, timezone, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Formats a UTC date for display as a short time string in the tenant timezone.
 * Example: "14:30"
 */
export function formatTimeInTZ(date: Date | string, timezone: string): string {
    return formatInTZ(date, timezone, { hour: '2-digit', minute: '2-digit', hour12: false })
}

/**
 * Formats a UTC date for display as date + time in the tenant timezone.
 * Example: "05/05/2026 14:30"
 */
export function formatDateTimeInTZ(date: Date | string, timezone: string): string {
    return formatInTZ(date, timezone, {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        hour12: false,
    })
}
