import { en } from './en'
import { vi, type DictKey } from './vi'

export type { Dict, DictKey } from './vi'

export const LANGS = ['vi', 'en'] as const
export type Lang = (typeof LANGS)[number]

/** Fixed for the trial. There is no language switcher, because the entry is
 *  judged in Vietnamese and a control nobody uses is a control to maintain. */
export const DEFAULT_LANG: Lang = 'vi'

/** Turns an API code into a word.
 *
 *  Falls back to Vietnamese per key rather than per language, so a
 *  half-translated English dictionary degrades to a mixed screen instead of a
 *  blank one. Falls back to the key itself only when nothing has been written
 *  for it at all — visible in development, and never a crash in front of a
 *  judge. */
export function t(key: DictKey, lang: Lang = DEFAULT_LANG): string {
  if (lang === 'en') return en[key] ?? vi[key] ?? key
  return vi[key] ?? key
}

/** Looks up a code the server sent, where the key is built at runtime and may
 *  not exist — a new blocker code, an error nobody has written a line for yet.
 *
 *  Separate from `t` on purpose: `t` is checked at compile time and should
 *  stay that way, while this one is explicitly the unchecked path. */
export function tCode(prefix: string, code: string | null | undefined, fallback = ''): string {
  if (!code) return fallback
  const key = `${prefix}.${code}` as DictKey
  const found = vi[key]
  return found ?? fallback ?? code
}

/** The message to show for a failed call. */
export function tError(code: string | null | undefined): string {
  return tCode('error', code, t('error.unknown'))
}
