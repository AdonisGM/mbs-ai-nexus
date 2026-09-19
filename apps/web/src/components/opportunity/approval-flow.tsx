import { useQuery } from '@tanstack/react-query'
import { historyQuery, type HistoryEvent } from '~/api/history'
import { Chip, cx } from '~/components/ui/primitives'
import { BlockSkeleton } from '~/components/ui/query-state'
import { t, tCode } from '~/i18n'
import { LANES, laneIndex, toneOf } from '~/lib/approval'
import { fmtDuration } from '~/lib/format'

export type FlowView = 'graph' | 'table'

/** The approval trace of one deal, drawn two ways.
 *
 *  Both read the same events. The diagram shows the shape — which tier a deal
 *  bounced between, and where it turned round — and the table shows the detail
 *  a long trace needs, where a diagram would just get tall. */
export function ApprovalFlow({ opportunityId, view }: { opportunityId: string; view: FlowView }) {
  const query = useQuery(historyQuery(opportunityId))

  if (query.isPending) return <BlockSkeleton rows={3} />
  if (query.isError) {
    return <p className="text-[12.5px] text-danger">{t('flow.loadFailed')}</p>
  }
  if (query.data.length === 0) {
    return <p className="text-[12.5px] text-muted">{t('flow.empty')}</p>
  }

  return view === 'table' ? (
    <FlowTable events={query.data} />
  ) : (
    <FlowGraph events={query.data} />
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Table
 * ────────────────────────────────────────────────────────────────────────── */

const COLS = 'grid-cols-[28px_minmax(0,1fr)_100px_150px_110px_100px]'

function FlowTable({ events }: { events: HistoryEvent[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div
        className={cx(
          'grid gap-3 bg-sunken px-3.5 py-2 text-[10px] font-medium tracking-[.06em] text-muted uppercase',
          COLS,
        )}
      >
        <div>#</div>
        <div>{t('flow.step')}</div>
        <div>{t('flow.tier')}</div>
        <div>{t('flow.actor')}</div>
        <div>{t('flow.when')}</div>
        <div>{t('flow.result')}</div>
      </div>

      {events.map((event) => (
        <div
          key={event.id}
          className={cx('grid items-center gap-3 border-t border-line px-3.5 py-2.5', COLS)}
        >
          <div className="font-mono text-[11px] text-muted">{event.seq}</div>
          <div className="min-w-0 truncate text-[12.5px]">
            {tCode('status', event.toStatus, event.toStatus)}
          </div>
          <div className="text-[12px] text-ink2">{LANES[laneIndex(event.toStatus)].label}</div>
          <div className="min-w-0 truncate text-[12px] text-ink2">{event.actorName}</div>
          {/** How long the deal sat in the previous step, not the wall-clock
            *  time — the question anyone reading a trace is actually asking is
            *  "where did it get stuck". */}
          <div className="font-mono text-[11.5px] text-muted">{fmtDuration(event.heldMs)}</div>
          <div>
            <ResultChip event={event} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Diagram
 * ────────────────────────────────────────────────────────────────────────── */

/** Height of one step's row and of the connector beneath it. Fixed rather than
 *  measured, so the connecting lines can be positioned without waiting for a
 *  layout pass and the whole thing renders in one go. */
const ROW_H = 62
const CONN_H = 44

function FlowGraph({ events }: { events: HistoryEvent[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-bg">
      {/** Three columns, one per tier. The lane a box sits in says who acted
        *  without anyone reading a word of it — which is the whole reason to
        *  draw this rather than list it. */}
      <div className="grid grid-cols-3 gap-px bg-line">
        {LANES.map((lane) => (
          <div
            key={lane.id}
            className="bg-sunken py-2 text-center text-[11.5px] font-semibold tracking-[.04em] text-ink2"
          >
            {lane.label}
          </div>
        ))}
      </div>

      <div className="relative pb-4">
        {/** Lane dividers, drawn behind the boxes and running the full height
          *  so a step in the third lane still reads as belonging to a column. */}
        <div className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-line" />
        <div className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-line" />

        {events.map((event, index) => {
          const next = events[index + 1]
          return (
            <div key={event.id} className="relative">
              <StepBox event={event} />
              {next ? <Connector from={event} to={next} /> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StepBox({ event }: { event: HistoryEvent }) {
  const lane = laneIndex(event.toStatus)

  return (
    <div className="relative" style={{ height: ROW_H }}>
      <div
        className="absolute top-0 box-border w-[28%] rounded-lg border bg-surface px-2.5 py-2"
        style={{
          /** Centred in its lane: each lane is a third wide, and the box is
           *  28% of the whole, so half the leftover sits either side. */
          left: `${lane * 33.333 + (33.333 - 28) / 2}%`,
          borderColor: toneOf(event) === 'warn' ? 'var(--warn)' : 'var(--line2)',
        }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-[12.5px] font-semibold">
            {tCode('status', event.toStatus, event.toStatus)}
          </span>
          <span className="flex-none font-mono text-[10.5px] text-muted">
            {fmtDuration(event.heldMs)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[11.5px] text-muted">{event.actorName}</span>
          <ResultChip event={event} small />
        </div>
      </div>
    </div>
  )
}

/** The line from one step to the next.
 *
 *  Down, across, down again, with an arrowhead — an L rather than a diagonal,
 *  because a diagonal crossing two lane dividers is hard to follow back to
 *  where it started. A move that stays in its own lane is a straight drop. */
function Connector({ from, to }: { from: HistoryEvent; to: HistoryEvent }) {
  const a = laneIndex(from.toStatus)
  const b = laneIndex(to.toStatus)
  const centre = (lane: number) => lane * 33.333 + 33.333 / 2

  const back = b < a
  const colour = back ? 'var(--warn)' : 'var(--line2)'
  const dashed = back

  const left = Math.min(centre(a), centre(b))
  const width = Math.abs(centre(b) - centre(a))

  return (
    <div className="relative" style={{ height: CONN_H }}>
      <span
        className="absolute top-0 h-4 border-l"
        style={{ left: `${centre(a)}%`, borderColor: colour, borderStyle: dashed ? 'dashed' : 'solid' }}
      />
      {width > 0 ? (
        <span
          className="absolute top-4 border-t"
          style={{
            left: `${left}%`,
            width: `${width}%`,
            borderColor: colour,
            borderStyle: dashed ? 'dashed' : 'solid',
          }}
        />
      ) : null}
      <span
        className="absolute top-4 h-5 border-l"
        style={{ left: `${centre(b)}%`, borderColor: colour, borderStyle: dashed ? 'dashed' : 'solid' }}
      />
      <span
        className="absolute top-[36px] -ml-1 size-0 border-x-4 border-t-[6px] border-x-transparent"
        style={{ left: `${centre(b)}%`, borderTopColor: colour }}
      />
      {/** Only a step backwards gets a word on it. Forward moves are the
        *  expected direction and labelling every one is noise. */}
      {back ? (
        <span
          className="absolute top-0 text-[10.5px] whitespace-nowrap text-[var(--warn)]"
          style={{ left: `${left + width + 1.5}%` }}
        >
          {t('flow.sentBack')}
        </span>
      ) : null}
    </div>
  )
}

function ResultChip({ event, small }: { event: HistoryEvent; small?: boolean }) {
  const tone = toneOf(event)
  const tones = {
    good: { fg: 'var(--success)', bg: 'var(--success-soft)' },
    warn: { fg: 'var(--warn)', bg: 'var(--warn-soft)' },
    muted: { fg: 'var(--muted)', bg: 'var(--sunken)' },
  } as const

  const label =
    event.direction === 'in_place'
      ? t('flow.edited')
      : event.direction === 'up'
        ? t('flow.sentUp')
        : t('flow.sentDown')

  return (
    <Chip tone={tones[tone]} className={small ? 'px-1.5 py-[2px] text-[10px]' : undefined}>
      {label}
    </Chip>
  )
}
