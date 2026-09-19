import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { ApiError } from '~/api/client'
import { t, tError } from '~/i18n'

/** What to do when a write fails.
 *
 *  Most failures are ordinary and the message says enough. One is not: a 404
 *  means the record this page is about is gone, and the page is only still
 *  showing it because the read was cached. Left alone, every further action
 *  fails the same way and nothing on screen explains why — the user sees a
 *  customer sitting right in front of them and is told it does not exist.
 *
 *  It happens for real during this project: reseeding the demo data replaces
 *  every id while the team has pages open. So a 404 clears the cache and sends
 *  the person back to a list that is actually there, rather than leaving them
 *  arguing with a screen. */
export function useWriteError() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return async function onWriteError(error: unknown, fallbackTo?: string) {
    const code = error instanceof ApiError ? error.message : null

    if (error instanceof ApiError && error.status === 404) {
      toast.error(t('error.gone'))
      queryClient.clear()
      if (fallbackTo) await router.navigate({ to: fallbackTo })
      else await router.invalidate()
      return
    }

    toast.error(tError(code))
  }
}
