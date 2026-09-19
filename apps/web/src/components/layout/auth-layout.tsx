import type { ReactNode } from 'react'
import { SegmentedControl } from '~/components/ui/segmented'
import { t } from '~/i18n'
import { BrandLockup } from './msb-logo'
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


export { BrandLockup }

export function AuthFooter() {
  return (
    <div className="border-t border-line pt-3.5">
      <span className="text-[11px] text-muted">{t('app.copyright')}</span>
    </div>
  )
}
