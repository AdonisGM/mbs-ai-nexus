/** The one place the app talks to the API. No screen fetches on its own, and
 *  none of them holds sample data. */

/** Where the API lives. Port 3100 in development — 3000 belongs to another
 *  project on this machine. Baked in at build time for the container. */
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3100'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** NestJS puts the real message in `message`, as a string or an array of
 *  them when validation fails. */
function readMessage(body: unknown, fallback: string) {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message
    if (typeof message === 'string') return message
    if (Array.isArray(message) && typeof message[0] === 'string') return message[0]
  }
  return fallback
}

export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<T> {
  /** With FormData the browser sets the content type and its boundary itself;
   *  setting it by hand breaks the multipart envelope. */
  const sendingForm = init.form !== undefined

  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method ?? 'GET',
    /** The session cookie is httpOnly, so every call has to carry credentials
     *  explicitly — the browser will not attach them cross-origin otherwise. */
    credentials: 'include',
    headers: sendingForm || init.body === undefined ? undefined : { 'content-type': 'application/json' },
    body: sendingForm ? init.form : init.body === undefined ? undefined : JSON.stringify(init.body),
  })

  if (res.status === 204) return undefined as T

  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, readMessage(body, 'unexpected_response'))

  return body as T
}
