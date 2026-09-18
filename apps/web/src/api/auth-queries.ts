import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { authStatus } from './auth'

/** The one source of truth for every route guard.
 *
 *  No staleTime and no gcTime on purpose: each navigation asks the server
 *  again rather than trusting a cache. A screen that renders because the cache
 *  still remembers a session the server has already ended is the failure mode
 *  worth paying a round trip to avoid. */
export const authStatusQuery = queryOptions({
  queryKey: ['auth', 'status'],
  queryFn: authStatus,
  staleTime: 0,
  gcTime: 0,
  retry: false,
})

/** Guards everything inside the app. */
export async function requireUser(queryClient: QueryClient) {
  const { user } = await queryClient.fetchQuery(authStatusQuery)
  if (!user) throw redirect({ to: '/login' })
  return { user }
}

/** Guards the login screen, so someone already signed in cannot land back on
 *  it and wonder whether they were signed out. */
export async function requireGuest(queryClient: QueryClient) {
  const { user } = await queryClient.fetchQuery(authStatusQuery)
  if (user) throw redirect({ to: '/' })
}
