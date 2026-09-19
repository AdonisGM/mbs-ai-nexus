import { useQuery } from '@tanstack/react-query'
import { historyQuery, type HistoryEvent } from '~/api/history'
import { Chip, cx } from '~/components/ui/primitives'
import { t, tCode } from '~/i18n'
import { LANES, laneIndex, toneOf } from '~/lib/approval'
import { fmtDuration, fmtMoney } from '~/lib/format'
import { vnDate } from '~/lib/dates'
import { COLS } from './opportunity-table'

/** The approval trace of one deal, laid out in the parent table's own grid.
 *
 *  Not a table inside a table. The trace rows use the same seven columns as
 *  the deals above them, so the whole thing reads as one list that happens to
 *  have two kinds of row — a nested grid with its own borders and its own
 *  column widths reads as a separate object that fell into the page.
 *
 *  The seven pairs line up by meaning, not by accident: identifier over
 *  identifier, the wide "what happened" column over "what is being sold",
 *  status visual over status visual, date over date.
 *
 *  A table rather than a swimlane diagram, after building both. The diagram
 *  read the shape well, but the brief asks each step to carry four things —
 *  who, when, what changed and why — and a box in a lane has room for two. The
 *  reason a deal was sent back is the most useful line in the whole trace, and
 *  it was the one the diagram had to drop. The shape survives in the tier
 *  column's three dots. */
export function ApprovalFlow({ opportunityId }: { opportunityId: string }) {
  const query = useQuery(historyQuery(opportunityId))

  if (query.isPending) return <Filler>{t('common.loading')}</Filler>
  if (query.isError) {
    return <Filler tone="danger">{t('flow.loadFailed')}</Filler>
  }
  if (query.data.length === 0) return <Filler>{t('flow.empty')}</Filler>

  return (
    <>
      <div
        className={cx(
          'grid gap-3 border-t border-line bg-sunken px-4 py-1.5 text-[10px] font-medium tracking-[.06em] text-muted uppercase',
          COLS,
        )}
      >
        <div className="pl-5">#</div>
        <div>{t('flow.step')}</div>
        <div>{t('flow.tier')}</div>
        <div>{t('flow.actor')}</div>
        <div className="text-right">{t('flow.when')}</div>
        <div>{t('flow.result')}</div>
        <div className="text-right">{t('flow.at')}</div>
      </div>

      {query.data.map((event, index) => (
        <Row key={event.id} event={event} last={index === query.data.length - 1} />
      ))}
    </>
  )
}

function Row({ event, last }: { event: HistoryEvent; last: boolean }) {
  const changes = Object.entries(event.changes)
  const sentBack = event.toStatus === 'lead_returned'

  return (
    <div className={cx('grid gap-3 border-t border-line/60 bg-sunken/30 px-4 py-2', COLS)}>
      {/** A guide down the left instead of an indent, so the child rows read
        *  as belonging to the deal above without the whole block shifting out
        *  of the grid. */}
      <div className="relative flex items-start gap-2 font-mono text-[11px] text-muted">
        <span
          className={cx('absolute top-0 left-[6px] w-px bg-line2', last ? 'h-2.5' : 'h-full')}
        />
        <span className="absolute top-2.5 left-[6px] h-px w-2 bg-line2" />
        <span className="pl-5">{event.seq}</span>
      </div>

      <div className="min-w-0">
        <div className="truncate text-[12.5px]">
          {tCode('status', event.toStatus, event.toStatus)}
        </div>

        {/** Why, in the words of whoever did it. The brief asks for it, and on
          *  a send-back it is the only thing telling the salesperson what to
          *  fix — so that one is coloured, because it is what someone opening
          *  a trace is scanning for. */}
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

        {/** What changed, field by field. Also from the brief: a log that says
          *  "edited" without saying what was edited answers nothing. */}
        {changes.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {changes.map(([field, [was, now]]) => (
              <span key={field} className="text-[11px] text-muted">
                <span className="text-ink2">{tCode('field', field, field)}</span>{' '}
                {formatValue(field, was)} → {formatValue(field, now)}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <Tier status={event.toStatus} />
      </div>

      <div className="min-w-0 truncate text-[12px] text-ink2">{event.actorName}</div>

      {/** How long the deal sat in the step before this one, not the clock
        *  time — "where did it get stuck" is what a trace gets read for. */}
      <div className="text-right font-mono text-[11.5px] text-muted">
        {fmtDuration(event.heldMs)}
      </div>

      <div>
        <ResultChip event={event} />
      </div>

      <div className="text-right font-mono text-[11px] text-muted">
        {vnDate(event.createdAt)}
      </div>
    </div>
  )
}

/** Loading, empty and error states keep the row rhythm rather than collapsing
 *  the table to a paragraph, so opening a row never makes the page jump. */
function Filler({ children, tone }: { children: React.ReactNode; tone?: 'danger' }) {
  return (
    <div
      className={cx(
        'border-t border-line bg-sunken/30 px-4 py-3 text-[12.5px]',
        tone === 'danger' ? 'text-danger' : 'text-muted',
      )}
    >
      <span className="pl-5">{children}</span>
    </div>
  )
}

/** Which tier acted, as three dots plus its name.
 *
 *  What survives from the swimlane diagram: read down the column and a deal
 *  that went up to the branch manager and came back reads as a shape, without
 *  a diagram's height. */
function Tier({ status }: { status: string }) {
  const active = laneIndex(status)

  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-[3px]">
        {LANES.map((lane, index) => (
          <span
            key={lane.id}
            className={cx('size-1.5 rounded-full', index === active ? 'bg-ink2' : 'bg-line2')}
          />
        ))}
      </span>
      <span className="text-[12px] text-ink2">{LANES[active].label}</span>
    </span>
  )
}

function ResultChip({ event }: { event: HistoryEvent }) {
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

  return <Chip tone={tones[toneOf(event)]}>{label}</Chip>
}

/** Renders a before/after value the way the field is read elsewhere, so an
 *  amount inside the trace matches the amount on the row above it. */
function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.length === 0 ? '—' : value.join(', ')
  if (typeof value === 'object') return '…'
  if (field === 'value' && typeof value === 'number') return fmtMoney(value)
  if (field === 'winProbability') return `${value}%`
  if (field === 'dueDate') return vnDate(String(value))
  if (field === 'stage') return tCode('stage', String(value), String(value))
  if (field === 'blockerCode') return tCode('blocker', String(value), String(value))
  return String(value)
}
