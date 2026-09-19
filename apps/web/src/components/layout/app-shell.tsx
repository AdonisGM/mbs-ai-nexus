import { useState, type ReactNode } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { logout, type Me } from '~/api/auth'
import { Button } from '~/components/ui/primitives'
import { t } from '~/i18n'
import { initials } from '~/lib/format'
import { MsbLogo } from './msb-logo'
import { navFor } from './nav-config'
import { useTheme } from './theme'

/** How wide the content is allowed to get.
 *
 *  The frame itself always fills the window — the sidebar sits against the
 *  left edge and the background runs to both — but a pipeline table stretched
 *  across a 27-inch monitor is unreadable, so only the content inside the main
 *  column is capped and centred.
 *
 *  Capping the whole frame instead is what leaves a sidebar floating in from
 *  the edge with dead space either side of it. */
const CONTENT_MAX = 1600

/** The frame every screen inside the app sits in.
 *
 *  Written for this project rather than copied: the shell it grew from carried
 *  a music player, a command palette over eight domains and per-item counters
 *  for wallets and subscriptions. None of that applies here, and inheriting it
 *  would have meant carrying the parts out one by one.
 *
 *  Three tiers share one shell. What changes between them is the menu and the
 *  line under the name, which is the honest amount of difference — a team lead
 *  and a salesperson do the same kind of work on different rows. */
export function AppShell({ user, children }: { user: Me; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const items = navFor(user.role)

  return (
    <div className="relative flex min-h-screen flex-col bg-bg text-ink">
      {/** The same faint noise as the login screen. Without it the two read as
        *  different products the moment someone signs in. */}
      <div
        className="grain pointer-events-none fixed inset-0 z-0"
        style={{ opacity: 'var(--grain)' }}
      />

      <MobileBar open={menuOpen} onToggle={() => setMenuOpen((open) => !open)} />

      <div className="relative z-[1] flex min-h-0 flex-1">
        {/** Fixed width, flush to the window edge. From lg up rather than md:
          *  below about 1024px a 232px column plus a table leaves neither
          *  enough room. */}
        <aside className="hidden w-[232px] flex-none border-r border-line bg-surface lg:block">
          <SidebarBody user={user} items={items} onNavigate={() => setMenuOpen(false)} />
        </aside>

        {/** Under lg the same menu drops out of the bar instead. One body in
          *  two placements, rather than two components to keep in step. */}
        {menuOpen ? (
          <div className="fixed inset-x-0 top-[49px] bottom-0 z-30 overflow-y-auto border-b border-line bg-surface lg:hidden">
            <SidebarBody user={user} items={items} onNavigate={() => setMenuOpen(false)} />
          </div>
        ) : null}

        <main className="min-w-0 flex-1 px-4 pt-5 pb-14 sm:px-6 lg:px-8 lg:pt-7">
          <div className="mx-auto flex flex-col gap-5" style={{ maxWidth: CONTENT_MAX }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function MobileBar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="relative z-40 flex items-center gap-3 border-b border-line bg-surface px-4 py-3 lg:hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
        className="rounded-[6px] p-1 text-muted hover:text-ink"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
      <MsbLogo height={18} />
      <span className="font-wordmark text-[13px]">{t('app.product')}</span>
    </div>
  )
}

function SidebarBody({
  user,
  items,
  onNavigate,
}: {
  user: Me
  items: ReturnType<typeof navFor>
  onNavigate: () => void
}) {
  return (
    <div className="flex h-full flex-col gap-6 px-4 py-5 lg:sticky lg:top-0 lg:h-screen lg:py-6">
      <div className="hidden lg:block">
        <MsbLogo height={20} />
        <div className="font-wordmark mt-2 text-[14px] tracking-tight">{t('app.product')}</div>
        <div className="mt-0.5 text-[11px] text-muted">{t('app.tagline')}</div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            /** Exact for the root, prefix for the rest: otherwise "Việc hôm
             *  nay" stays lit on every screen, and a highlighted menu that
             *  never changes is worse than none. */
            activeOptions={{ exact: item.to === '/' }}
            activeProps={{ className: 'bg-sunken text-ink' }}
            inactiveProps={{ className: 'text-muted hover:bg-sunken hover:text-ink' }}
            className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[13px] transition-colors"
          >
            <item.icon size={16} className="shrink-0" />
            {t(item.key)}
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
        <Identity user={user} />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <SignOut />
        </div>
      </div>
    </div>
  )
}

/** Who is signed in, said plainly.
 *
 *  Worth the space in a demo where five people swap accounts between takes:
 *  the fastest way to lose an audience is to act on the wrong screen and not
 *  notice. Role and segment both show, because "Hải" and "Hà" differ by
 *  segment, not by name. */
function Identity({ user }: { user: Me }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken text-[11px] font-semibold text-muted">
        {initials(user.name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-medium">{user.name}</span>
        <span className="block truncate text-[11px] text-muted">
          {t(`role.${user.role}`)}
          {user.segment ? ` · ${t(`segment.${user.segment}.short`)}` : ''}
        </span>
      </span>
    </div>
  )
}

function ThemeToggle() {
  const { theme, setMode } = useTheme()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setMode(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </Button>
  )
}

function SignOut() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await logout()
        } finally {
          /** Clear the cache before navigating, or the guard on the next
           *  screen reads a remembered session and lets it through. */
          queryClient.clear()
          await router.navigate({ to: '/login' })
        }
      }}
    >
      <LogOut size={15} />
      <span className="text-[12px]">{t('auth.signOut')}</span>
    </Button>
  )
}
