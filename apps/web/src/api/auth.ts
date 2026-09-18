import { api } from './client'

/** The account as the API sends it: codes, never words. The dictionary in
 *  `~/i18n` turns `role` into something a person reads. */
export type Me = {
  id: string
  code: string
  name: string
  role: 'sale' | 'team_lead' | 'bm' | 'admin'
  title: string
  level: string | null
  segment: 'sse' | 'rb' | null
  unitId: string
  managerId: string | null
}

export function authStatus() {
  return api<{ user: Me | null }>('/auth/status')
}

export function login(input: { code: string; password: string }) {
  return api<{ user: Me }>('/auth/login', { method: 'POST', body: input })
}

export function logout() {
  return api<void>('/auth/logout', { method: 'POST' })
}
