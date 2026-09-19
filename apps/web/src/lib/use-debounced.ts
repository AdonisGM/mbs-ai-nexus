import { useEffect, useState } from 'react'

/** Holds a value still until typing stops.
 *
 *  The search box updates on every keystroke so it stays responsive, but the
 *  request should not: eight letters typed quickly is eight round trips, seven
 *  of which are already stale when they land — and they can arrive out of
 *  order, so the list ends up showing the results for "ngu" after the results
 *  for "nguyen".
 *
 *  250ms is about the gap between deliberate keystrokes; shorter and it fires
 *  mid-word, longer and the list feels like it is lagging behind the box. */
export function useDebounced<T>(value: T, delay = 250): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return settled
}
