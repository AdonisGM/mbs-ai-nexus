import type { ReactNode } from 'react'
import { SegmentedControl } from '~/components/ui/segmented'
import { t } from '~/i18n'
import { MsbLogo } from './msb-logo'
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

/** The bank's mark, then the product name.
 *
 *  Two pieces rather than one lockup, separated by a hairline: MSB is the
 *  institution and AI Nexus is a thing built inside it, and running the two
 *  together as a single wordmark would claim a brand that does not exist. The
 *  divider says "from" without needing the word. */
export function BrandLockup() {
  return (
    <div className="flex items-center gap-3">
      <MsbLogo height={24} />
      <span className="h-5 w-px bg-line2" aria-hidden="true" />
      <span className="text-[17px] font-semibold tracking-tight">{t('app.product')}</span>
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
