import {
  Building2,
  ClipboardList,
  Gauge,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Me } from '~/api/auth'
import type { DictKey } from '~/i18n'

/** The menu, declared once so the sidebar, the page title and the mobile bar
 *  all read the same list.
 *
 *  Every entry names the roles it belongs to, which is how three tiers share
 *  one shell without a chain of conditions per screen. This is presentation
 *  only — hiding a link is a courtesy, not a control. The server refuses the
 *  request either way, and scoping decides what comes back. */
export type NavItem = {
  key: DictKey
  to: string
  icon: LucideIcon
  roles: ReadonlyArray<Me['role']>
}

export const NAV: NavItem[] = [
  {
    key: 'nav.today',
    to: '/',
    icon: ClipboardList,
    roles: ['sale', 'team_lead', 'bm', 'admin'],
  },
  {
    key: 'nav.customers',
    to: '/customers',
    icon: Users,
    roles: ['sale', 'team_lead', 'bm', 'admin'],
  },
  {
    key: 'nav.opportunities',
    to: '/opportunities',
    icon: Gauge,
    roles: ['sale', 'team_lead', 'bm', 'admin'],
  },
  {
    key: 'nav.unit',
    to: '/unit',
    icon: Building2,
    roles: ['bm', 'admin'],
  },
  {
    key: 'nav.targets',
    to: '/targets',
    icon: Target,
    roles: ['sale', 'team_lead', 'bm', 'admin'],
  },
]

export function navFor(role: Me['role']): NavItem[] {
  return NAV.filter((item) => item.roles.includes(role))
}
