import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { opportunitiesQuery, type Opportunity } from '~/api/opportunities'
import { ApprovalFlow } from '~/components/opportunity/approval-flow'
import { Button, Chip, Money, cx } from '~/components/ui/primitives'
import { BlockSkeleton } from '~/components/ui/query-state'
import { t, tCode } from '~/i18n'
import { LANES, holderLabel, laneStates } from '~/lib/approval'
import { daysUntil, vnDate } from '~/lib/dates'
import { fmtShort } from '~/lib/format'

/** Grid used by the header and every row, declared once so the two cannot
 *  drift apart — a header that no longer lines up with its columns is the
 *  classic way a hand-built table goes wrong. */
const COLS =
  'grid-cols-[120px_minmax(0,1fr)_110px_130px_78px_210px_100px]'

/** Every deal on a customer, with the approval trace one click away.
 *
 *  A table rather than cards because the point of this screen is comparison:
 *  which deal is biggest, which is stuck, which is closest to its deadline.
 *  Expanding in place rather than navigating keeps that comparison on screen
 *  while the detail is read. */
export function OpportunityTable({ customerId }: { customerId: string }) {
  const [openId, setOpenId] = useState<string | null>(null)

  const query = useQuery(opportunitiesQuery({ customerId, pageSize: 50 }))

  if (query.isPending) return <BlockSkeleton rows={4} />
  if (query.isError) {
    return <p className="text-[12.5px] text-danger">{t('opportunities.loadFailed')}</p>
  }

  const rows = query.data.rows

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <h2 className="text-[14px] font-semibold">{t('nav.opportunities')}</h2>
        <span className="text-[11px] text-muted">
          {rows.length} {t('opportunities.unit')}
          {rows.length > 0 ? ` · ${t('opportunities.clickHint')}` : ''}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div
              className={cx(
                'grid gap-3 bg-sunken px-4 py-2.5 text-[10px] font-medium tracking-[.06em] text-muted uppercase',
                COLS,
              )}
            >
              <div>Mã</div>
              <div>{t('field.product')}</div>
              <div className="text-right">{t('field.value')}</div>
              <div>Trạng thái</div>
              <div className="text-right">{t('field.winProbability')}</div>
              <div>Phê duyệt</div>
              <div className="text-right">{t('field.dueDate')}</div>
            </div>

            {rows.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12.5px] text-muted">
                {t('opportunities.empty')}
              </p>
            ) : (
              rows.map((deal) => (
                <Row
                  key={deal.id}
                  deal={deal}
                  open={openId === deal.id}
                  onToggle={() => setOpenId((current) => (current === deal.id ? null : deal.id))}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({
  deal,
  open,
  onToggle,
}: {
  deal: Opportunity
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-t border-line">
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onToggle()
          }
        }}
        className={cx(
          'grid cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-sunken',
          COLS,
          open && 'bg-sunken',
        )}
      >
        <div className="font-mono text-[11px] text-muted">{deal.code}</div>
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-medium">{deal.product}</div>
          <div className="truncate text-[11.5px] text-muted">{deal.need}</div>
        </div>
        <div className="text-right">
          <Money value={fmtShort(deal.value)} size="md" />
        </div>
        <div>
          <StatusChip deal={deal} />
        </div>
        <div className="text-right font-mono text-[12.5px] text-ink2">
          {deal.winProbability}%
        </div>
        <ApprovalBar status={deal.approvalStatus} />
        <div className="text-right">
          <Due deal={deal} />
        </div>
      </div>

      {open ? (
        <div className="bg-sunken/40 px-4 pt-1 pb-4">
          <ApprovalFlow opportunityId={deal.id} />
          <Footer deal={deal} />
        </div>
      ) : null}
    </div>
  )
}

/** Three segments, one per tier, plus who is holding it.
 *
 *  Reads at a glance across a list of deals — which is the one thing a
 *  status word alone cannot do, because comparing ten words means reading
 *  ten words. */
function ApprovalBar({ status }: { status: string }) {
  const states = laneStates(status)

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex min-w-0 flex-1 gap-[3px]">
        {states.map((state, index) => (
          <span
            key={LANES[index].id}
            title={LANES[index].label}
            className={cx(
              'h-1.5 flex-1 rounded-full',
              state === 'done' && 'bg-[var(--success)]',
              state === 'current' && 'bg-ink2',
              state === 'todo' && 'bg-line2',
            )}
          />
        ))}
      </div>
      <span className="w-[76px] flex-none text-right text-[10.5px] text-muted">
        {holderLabel(status)}
      </span>
    </div>
  )
}

function StatusChip({ deal }: { deal: Opportunity }) {
  if (deal.outcome === 'won') {
    return (
      <Chip tone={{ fg: 'var(--success)', bg: 'var(--success-soft)' }}>{t('outcome.won')}</Chip>
    )
  }
  if (deal.outcome === 'lost') {
    return <Chip tone={{ fg: 'var(--danger)', bg: 'var(--danger-soft)' }}>{t('outcome.lost')}</Chip>
  }
  return (
    <Chip tone={{ fg: 'var(--ink2)', bg: 'var(--sunken)' }}>
      {tCode('stage', deal.stage, deal.stage)}
    </Chip>
  )
}

/** The deadline, read the way someone asks about it.
 *
 *  Only coloured while the deal is open: a closed deal that ran past its date
 *  is history, not something anyone can still act on. */
function Due({ deal }: { deal: Opportunity }) {
  const days = daysUntil(deal.dueDate)
  const live = deal.outcome === 'open'

  if (!deal.dueDate || days === null) {
    return <span className="text-[11.5px] text-muted">—</span>
  }
  if (live && days < 0) {
    return (
      <span className="text-[11.5px] font-medium text-danger">
        {t('common.overdue')} {Math.abs(days)}d
      </span>
    )
  }
  if (live && days === 0) {
    return <span className="text-[11.5px] font-medium text-[var(--warn)]">Hôm nay</span>
  }
  if (live && days <= 7) {
    return <span className="text-[11.5px] text-[var(--warn)]">còn {days}d</span>
  }
  return <span className="font-mono text-[11.5px] text-muted">{vnDate(deal.dueDate)}</span>
}

/** What the deal needs next, and the buttons to do it.
 *
 *  The actions come from the server with the deal, so nothing is offered here
 *  that the server would then refuse. */
function Footer({ deal }: { deal: Opportunity }) {
  const notes = [
    deal.blockerCode
      ? `${t('field.blocker')}: ${tCode('blocker', deal.blockerCode, deal.blockerCode)}${
          deal.blockerNote ? ` — ${deal.blockerNote}` : ''
        }`
      : null,
    deal.nextAction ? `${t('field.nextAction')}: ${deal.nextAction}` : null,
    deal.bmDecision ? `${t('field.bmDecision')}: ${deal.bmDecision}` : null,
    deal.outcomeReason,
  ].filter(Boolean)

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
      <div className="max-w-[660px] text-[12.5px] leading-relaxed text-muted">
        {notes.length > 0 ? notes.join(' · ') : t('opportunities.noNote')}
      </div>
      {/** Buttons are next: they post to /opportunities/:id/actions/:action,
        *  which is already built and tested. Kept out until the confirm and
        *  send-back dialogs exist, because a button that needs a reason and
        *  has nowhere to type one fails on the server every time. */}
      <div className="flex flex-none gap-2">
        <Button size="sm" disabled>
          {t('action.send_back')}
        </Button>
        <Button size="sm" variant="primary" disabled>
          {t('action.confirm')}
        </Button>
      </div>
    </div>
  )
}
