import { useQuery } from '@tanstack/react-query'
import { historyQuery, type HistoryEvent } from '~/api/history'
import { Chip, cx } from '~/components/ui/primitives'
import { BlockSkeleton } from '~/components/ui/query-state'
import { t, tCode } from '~/i18n'
import { LANES, laneIndex, toneOf } from '~/lib/approval'
import { fmtDuration, fmtShort } from '~/lib/format'
import { vnDate } from '~/lib/dates'

const COLS = 'grid-cols-[26px_minmax(0,1fr)_118px_130px_88px_96px]'

/** The approval trace of one deal.
 *
 *  A table rather than a swimlane diagram, after building both. The diagram
 *  read the shape well, but the brief asks each step to carry four things —
 *  who, when, what changed and why — and a box in a lane has room for two.
 *  The reason a deal was sent back is the most informative line in a trace,
 *  and it was the one the diagram had to drop.
 *
 *  The shape is not lost: the tier column marks position with three dots, so
 *  a deal bouncing between tiers still reads down the column. */
export function ApprovalFlow({ opportunityId }: { opportunityId: string }) {
  const query = useQuery(historyQuery(opportunityId))

  if (query.isPending) return <BlockSkeleton rows={3} />
  if (query.isError) {
    return <p className="text-[12.5px] text-danger">{t('flow.loadFailed')}</p>
  }
  if (query.data.length === 0) {
    return <p className="text-[12.5px] text-muted">{t('flow.empty')}</p>
  }

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

      {query.data.map((event) => (
        <Row key={event.id} event={event} />
      ))}
    </div>
  )
}

function Row({ event }: { event: HistoryEvent }) {
  const changes = Object.entries(event.changes)
  const sentBack = event.toStatus === 'lead_returned'

  return (
    <div className={cx('grid gap-3 border-t border-line px-3.5 py-2.5', COLS)}>
      <div className="pt-px font-mono text-[11px] text-muted">{event.seq}</div>

      <div className="min-w-0">
        <div className="truncate text-[12.5px]">
          {tCode('status', event.toStatus, event.toStatus)}
        </div>

        {/** Why, in the words of whoever did it. The brief asks for it, and on
          *  a send-back it is the only thing that tells the salesperson what
          *  to fix. Coloured on a send-back because that is the step someone
          *  is scanning the trace to find. */}
        {event.reason ? (
          <div
            className={cx(
              'mt-1 text-[11.5px] leading-snug',
              sentBack ? 'text-[var(--warn)]' : 'text-muted',
            )}
          >
            {event.reason}
          </div>
        ) : null}

        {/** What changed, field by field. Also from the brief — a log that
          *  says "edited" without saying what was edited answers nothing. */}
        {changes.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {changes.map(([field, [was, now]]) => (
              <span key={field} className="text-[11px] text-muted">
                <span className="text-ink2">{fieldLabel(field)}</span>{' '}
                {formatValue(field, was)} → {formatValue(field, now)}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="pt-px">
        <Tier status={event.toStatus} />
      </div>

      <div className="min-w-0 truncate pt-px text-[12px] text-ink2">{event.actorName}</div>

      {/** How long the deal sat in the step before this one, not the clock
        *  time — "where did it get stuck" is the question a trace is read to
        *  answer. */}
      <div className="pt-px font-mono text-[11.5px] text-muted">
        {fmtDuration(event.heldMs)}
      </div>

      <div className="pt-px">
        <ResultChip event={event} />
      </div>
    </div>
  )
}

/** Which tier acted, as three dots plus its name.
 *
 *  The dots are what survives from the swimlane diagram: read down the column
 *  and a deal that went up to the branch manager and came back reads as a
 *  shape, without a diagram's height. */
function Tier({ status }: { status: string }) {
  const active = laneIndex(status)

  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-[3px]">
        {LANES.map((lane, index) => (
          <span
            key={lane.id}
            className={cx(
              'size-1.5 rounded-full',
              index === active ? 'bg-ink2' : 'bg-line2',
            )}
          />
        ))}
      </span>
      <span className="text-[12px] text-ink2">{LANES[active].label}</span>
    </span>
  )
}

function ResultChip({ event }: { event: HistoryEvent }) {
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

  return <Chip tone={tones[tone]}>{label}</Chip>
}

function fieldLabel(field: string): string {
  return tCode('field', field, field)
}

/** Renders a before/after value the way the field is read elsewhere, so an
 *  amount in the trace matches the amount on the row above it. */
function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.length === 0 ? '—' : value.join(', ')
  if (typeof value === 'object') return '…'
  if (field === 'value' && typeof value === 'number') return fmtShort(value)
  if (field === 'winProbability') return `${value}%`
  if (field === 'dueDate') return vnDate(String(value))
  if (field === 'stage') return tCode('stage', String(value), String(value))
  if (field === 'blockerCode') return tCode('blocker', String(value), String(value))
  return String(value)
}
