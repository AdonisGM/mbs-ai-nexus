/** Session settings, read once from the environment.
 *
 *  Unlike the project this pattern comes from, login here is a password rather
 *  than a passkey, so there is no relying-party id and no origin signing. The
 *  origin list still matters: it drives CORS and decides whether the session
 *  cookie is marked Secure. */

export type AuthConfig = {
  origins: string[]
  cookieName: string
  cookieSecure: boolean
  sessionTtlMs: number
  idleTimeoutMs: number
}

const DAY = 24 * 60 * 60 * 1000

export function loadAuthConfig(): AuthConfig {
  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:5273')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (origins.length === 0) throw new Error('WEB_ORIGIN must not be empty')

  return {
    origins,
    cookieName: process.env.COOKIE_NAME ?? 'nexus_session',
    /** Derived, not configured: a cookie marked Secure never reaches an http
     *  origin, so letting these two drift apart breaks login silently. */
    cookieSecure: origins.every((origin) => origin.startsWith('https://')),
    sessionTtlMs: Number(process.env.SESSION_TTL_DAYS ?? 30) * DAY,
    /** 0 disables the idle check. Five people share this demo and swap roles
     *  between takes, so the default leaves sessions alone. */
    idleTimeoutMs: Number(process.env.IDLE_TIMEOUT_MINUTES ?? 0) * 60 * 1000,
  }
}

export const AUTH_CONFIG = 'AUTH_CONFIG'
