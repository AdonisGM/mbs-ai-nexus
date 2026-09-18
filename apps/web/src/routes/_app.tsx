import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireUser } from '~/api/auth-queries'
import { AppShell } from '~/components/layout/app-shell'

/** Everything behind the login sits under this route, so the guard is written
 *  once instead of on each screen — and a screen added later is protected by
 *  where it lives rather than by someone remembering. */
export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context }) => requireUser(context.queryClient),
  component: AppLayout,
})

function AppLayout() {
  const { user } = Route.useRouteContext()
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  )
}
