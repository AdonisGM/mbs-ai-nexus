import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark' | 'auto'

export const MODES: Array<{ id: ThemeMode; label: string }> = [
  { id: 'light', label: 'Sáng' },
  { id: 'dark', label: 'Tối' },
  { id: 'auto', label: 'Theo hệ thống' },
]

type ThemeStore = {
  /** What the person chose, which may be "follow the system". */
  mode: ThemeMode
  /** What is actually on screen — only ever light or dark. */
  theme: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
}

const Ctx = createContext<ThemeStore | null>(null)

const STORAGE_KEY = 'appearance'
const DARK_QUERY = '(prefers-color-scheme: dark)'

type Saved = { mode: ThemeMode }

const FALLBACK: Saved = { mode: 'light' }

function readSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return FALLBACK
    const parsed = JSON.parse(raw) as Partial<Saved>
    return { mode: parsed.mode ?? FALLBACK.mode }
  } catch {
    /** A private window or blocked site data throws here. The app still has to
     *  render, so it falls back rather than failing. */
    return FALLBACK
  }
}

/** The single owner of colour mode. It stamps `data-theme` onto the html
 *  element, and no other component is allowed to write to documentElement.
 *
 *  One palette only — ink, the black-and-grey set with no accent hue. The
 *  design system this came from carried four for a personal app; they are gone
 *  rather than hidden behind a setting, because a variant nobody picks is
 *  still a variant to re-check every time a colour changes.
 *
 *  Kept per browser rather than synced to the server: this is a convenience,
 *  not a record, and a preference that needs a round trip to apply flickers. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Saved>(readSaved)
  const [systemDark, setSystemDark] = useState(
    () => typeof matchMedia === 'function' && matchMedia(DARK_QUERY).matches,
  )

  useEffect(() => {
    const query = matchMedia(DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const theme: 'light' | 'dark' =
    saved.mode === 'auto' ? (systemDark ? 'dark' : 'light') : saved.mode

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    } catch {
      /** Nothing to do about it, and nothing worth breaking the page over. */
    }
  }, [theme, saved])

  const value = useMemo<ThemeStore>(
    () => ({ mode: saved.mode, theme, setMode: (mode) => setSaved({ mode }) }),
    [saved, theme],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
