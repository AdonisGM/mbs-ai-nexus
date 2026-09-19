import { useEffect, useRef, useState } from 'react'
import { BrandLockup } from './msb-logo'

/** The screen that covers a cold start.
 *
 *  Refreshing means the route guard has to ask the server who is signed in
 *  before anything can be drawn, so there is always a gap. Left bare it reads
 *  as a broken page; filled with a spinner it reads as slow. The brand mark
 *  holding still says "starting" without claiming to measure anything.
 *
 *  Two thresholds, because the honest failure modes pull in opposite
 *  directions.
 *
 *  `DELAY_MS` — nothing is drawn at all until the wait has gone on long enough
 *  to notice. A warm load answers in about 40ms, and a splash that appears and
 *  vanishes inside that reads as a flicker, which looks worse than the plain
 *  background it was covering.
 *
 *  `MIN_MS` — once it is on screen it stays a moment. Something that flashes
 *  past at 90ms is a glitch; the eye reports it as a fault rather than as a
 *  screen. */
const DELAY_MS = 180
const MIN_MS = 480
const FADE_MS = 280

export function SplashScreen({ ready }: { ready: boolean }) {
  const [shown, setShown] = useState(false)
  const [fading, setFading] = useState(false)
  const [gone, setGone] = useState(false)
  const shownAt = useRef<number | null>(null)

  /** Only commit to showing it once the wait is long enough to be worth
   *  covering. If the guard answers first, this timer is cleared and nothing
   *  ever appears. */
  useEffect(() => {
    if (ready) return
    const timer = setTimeout(() => {
      shownAt.current = performance.now()
      setShown(true)
    }, DELAY_MS)
    return () => clearTimeout(timer)
  }, [ready])

  useEffect(() => {
    if (!ready) return
    if (!shown) {
      setGone(true)
      return
    }
    const visible = performance.now() - (shownAt.current ?? performance.now())
    const timer = setTimeout(() => setFading(true), Math.max(0, MIN_MS - visible))
    return () => clearTimeout(timer)
  }, [ready, shown])

  useEffect(() => {
    if (!fading) return
    const timer = setTimeout(() => setGone(true), FADE_MS + 40)
    return () => clearTimeout(timer)
  }, [fading])

  if (gone || !shown) return null

  return (
    <div
      aria-hidden={fading}
      role="status"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-bg text-ink"
      style={{
        transition: `opacity ${FADE_MS}ms ease`,
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <div
        className="grain pointer-events-none absolute inset-0"
        style={{ opacity: 'var(--grain)' }}
      />

      <div className="relative flex flex-col items-center gap-5">
        <BrandLockup />

        {/** A hairline that fills left to right. It is not a progress bar and
          *  does not pretend to be one — nothing here knows how long the guard
          *  will take — but a still screen with nothing moving on it reads as
          *  frozen after about a second. */}
        <span className="relative h-px w-[140px] overflow-hidden bg-line">
          <span className="splash-sweep absolute inset-y-0 left-0 w-1/3 bg-ink2" />
        </span>
      </div>
    </div>
  )
}
