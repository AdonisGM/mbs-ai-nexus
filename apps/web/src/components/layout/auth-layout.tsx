import type { ReactNode } from 'react'
import { SegmentedControl } from '~/components/ui/segmented'
import { t } from '~/i18n'
import { useTheme } from './theme'

/** The frame around signing in: grain, a light/dark switch, nothing else.
 *
 *  No menu and no links to anywhere — there is only one way in, and the route
 *  guards already send people to the right screen, so a nav bar here would be
 *  decoration with a chance of going wrong. */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { theme, setMode } = useTheme()

  return (
    <div className="relative flex min-h-screen flex-col bg-bg text-ink">
      {/** A faint noise layer over the whole page. On a large flat dark
        *  background, banding in the gradient is visible on cheap panels and a
        *  projector; grain hides it. Fixed and non-interactive so it never
        *  scrolls or swallows a click. */}
      <div
        className="grain pointer-events-none fixed inset-0"
        style={{ opacity: 'var(--grain)' }}
      />

      <div className="relative flex items-center justify-end gap-2 px-6 py-4">
        <SegmentedControl
          value={theme}
          onChange={setMode}
          options={[
            { id: 'light', label: t('theme.light') },
            { id: 'dark', label: t('theme.dark') },
          ]}
        />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6 pt-6 pb-18">
        {children}
      </div>
    </div>
  )
}

/** Mark and wordmark together.
 *
 *  The mark is three stacked plates — the salesperson, the team lead and the
 *  branch manager, which is the whole idea of the product in one shape. It is
 *  deliberately a neutral geometric placeholder rather than anything resembling
 *  a bank's real identity; swapping in an official asset later is this one
 *  component.
 *
 *  It draws in `currentColor` and the frame sets `text-ink`, so light and dark
 *  are handled without a second file. */
export function BrandLockup() {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M12 3.2 20.5 7.6 12 12 3.5 7.6 12 3.2Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M4.4 12 12 15.9 19.6 12"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.62"
        />
        <path
          d="M4.4 16.3 12 20.2 19.6 16.3"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.34"
        />
      </svg>
      <span className="text-[21px] font-semibold tracking-tight">{t('app.name')}</span>
    </div>
  )
}

export function AuthFooter() {
  return (
    <div className="border-t border-line pt-3.5">
      <span className="text-[11px] text-muted">{t('app.copyright')}</span>
    </div>
  )
}
