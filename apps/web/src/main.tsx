import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { SplashScreen } from './components/layout/splash'
import './styles/app.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
})

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: { queryClient },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

/** The route guard has to reach the server before the first screen can be
 *  drawn, so a cold start always has a gap. `router.load()` resolves once that
 *  first round trip is done, and the splash covers whatever it takes. */
function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    void router.load().finally(() => {
      if (alive) setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <>
      <RouterProvider router={router} />
      <SplashScreen ready={ready} />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
