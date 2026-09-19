import { useQuery } from '@tanstack/react-query'
import { opportunitiesQuery, type Opportunity } from '~/api/opportunities'
import { Caption, Chip, Money, Mono } from '~/components/ui/primitives'
import { BlockSkeleton } from '~/components/ui/query-state'
import { t, tCode } from '~/i18n'
import { daysUntil, vnDate } from '~/lib/dates'
import { fmtShort } from '~/lib/format'

/** The deals open against one customer.
 *
 *  A customer can carry several at once — a mortgage and a credit card are two
 *  deals on one file — which is why this is a list and not a panel. */
export function OpportunityList({ customerId }: { customerId: string }) {
  const query = useQuery(opportunitiesQuery({ customerId, pageSize: 50 }))

  if (query.isPending) return <BlockSkeleton rows={2} />

  if (query.isError) {
    return <p className="text-[12.5px] text-danger">Không đọc được danh sách cơ hội</p>
  }

  if (query.data.rows.length === 0) {
    return <p className="text-[12.5px] text-muted">Chưa có cơ hội nào trên hồ sơ này</p>
  }

  return (
    <div className="flex flex-col gap-2.5">
      {query.data.rows.map((deal) => (
        <OpportunityCard key={deal.id} deal={deal} />
      ))}
    </div>
  )
}

function OpportunityCard({ deal }: { deal: Opportunity }) {
  const days = daysUntil(deal.dueDate)

  return (
    <div className="rounded-lg border border-line bg-sunken px-3.5 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium">{deal.product}</span>
            <OutcomeChip deal={deal} />
          </div>
          <p className="mt-0.5 truncate text-[12px] text-muted">{deal.need}</p>
        </div>
        <Money value={fmtShort(deal.value)} size="md" className="flex-none" />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Mono>{deal.code}</Mono>
        <Caption>{tCode('stage', deal.stage, deal.stage)}</Caption>
        <Caption>· {deal.winProbability}%</Caption>
        <DueDate days={days} dueDate={deal.dueDate} open={deal.outcome === 'open'} />
      </div>

      {/** Where it has got to inside MSB, which is a different axis from the
        *  stage above — one is the customer's journey, the other is the
        *  paperwork's. */}
      <div className="mt-2 text-[11.5px] text-muted">
        {tCode('status', deal.approvalStatus, deal.approvalStatus)}
      </div>

      {deal.blockerCode ? (
        <div className="mt-2 flex flex-wrap items-baseline gap-1.5 border-t border-line pt-2">
          <span className="text-[11px] font-medium text-[var(--warn)]">
            {t('field.blocker')}: {tCode('blocker', deal.blockerCode, deal.blockerCode)}
          </span>
          {deal.blockerNote ? (
            <span className="text-[11.5px] text-muted">— {deal.blockerNote}</span>
          ) : null}
        </div>
      ) : null}

      {deal.nextAction ? (
        <div className="mt-2 text-[11.5px] leading-relaxed text-ink2">
          <span className="text-muted">{t('field.nextAction')}: </span>
          {deal.nextAction}
        </div>
      ) : null}
    </div>
  )
}

function OutcomeChip({ deal }: { deal: Opportunity }) {
  if (deal.outcome === 'won') {
    return (
      <Chip tone={{ fg: 'var(--success)', bg: 'var(--success-soft)' }}>
        {t('outcome.won')}
      </Chip>
    )
  }
  if (deal.outcome === 'lost') {
    return (
      <Chip tone={{ fg: 'var(--danger)', bg: 'var(--danger-soft)' }}>{t('outcome.lost')}</Chip>
    )
  }
  return null
}

/** The deadline, and how it feels from here.
 *
 *  A date on its own makes the reader do the arithmetic; "quá hạn 4 ngày" does
 *  not. Only coloured while the deal is still open — a closed deal that ran
 *  past its date is history, not a problem. */
function DueDate({
  days,
  dueDate,
  open,
}: {
  days: number | null
  dueDate: string | null
  open: boolean
}) {
  if (!dueDate || days === null) return <Caption>· {t('common.noDeadline')}</Caption>

  if (!open) return <Caption>· {vnDate(dueDate)}</Caption>

  if (days < 0) {
    return (
      <span className="text-[11.5px] font-medium text-danger">
        · {t('common.overdue')} {Math.abs(days)} ngày
      </span>
    )
  }
  if (days === 0) {
    return <span className="text-[11.5px] font-medium text-[var(--warn)]">· {t('common.dueToday')}</span>
  }
  if (days <= 7) {
    return (
      <span className="text-[11.5px] text-[var(--warn)]">· còn {days} ngày</span>
    )
  }
  return <Caption>· {vnDate(dueDate)}</Caption>
}
