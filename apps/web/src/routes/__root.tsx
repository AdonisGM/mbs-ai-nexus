import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '~/components/layout/theme'

export type RouterContext = { queryClient: QueryClient }

export const Route = createRootRouteWithContext<RouterContext>()({ component: RootLayout })

function RootLayout() {
  return (
    <ThemeProvider>
      <Outlet />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--ink)',
            border: '1px solid var(--line2)',
            borderRadius: '10px',
            fontSize: '13px',
            boxShadow: 'var(--shadow-md)',
          },
          success: { iconTheme: { primary: 'var(--accent)', secondary: 'var(--accent-fg)' } },
          error: { iconTheme: { primary: 'var(--danger)', secondary: 'var(--surface)' } },
        }}
      />
    </ThemeProvider>
  )
}
