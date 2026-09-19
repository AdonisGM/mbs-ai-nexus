import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { customerQuery, type Customer } from '~/api/customers'
import { SignalForm } from '~/components/customer/signal-form'
import { SignalTimeline } from '~/components/customer/signal-timeline'
import { OpportunityTable } from '~/components/opportunity/opportunity-table'
import { Button, Card, CardTitle, Chip, Mono } from '~/components/ui/primitives'
import { BlockSkeleton, ErrorState } from '~/components/ui/query-state'
import { t } from '~/i18n'
import { vnDate } from '~/lib/dates'
import { fmtMoney } from '~/lib/format'
import { ATTRIBUTE_LABELS, SEGMENT_TONE } from '~/lib/customer'

export const Route = createFileRoute('/_app/customers/$id/')({ component: CustomerScreen })

/** One customer, everything about them.
 *
 *  Deals come first and full width, because the question this screen answers
 *  is "what is happening with this customer" — and what is happening is the
 *  deals. The file itself sits underneath as context: it changes about twice
 *  in a deal's life, so it does not earn the top of the page. */
function CustomerScreen() {
  const { id } = Route.useParams()
  const query = useQuery(customerQuery(id))
  const [noting, setNoting] = useState(false)

  if (query.isError) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <ErrorState
          what="hồ sơ khách hàng"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      </div>
    )
  }

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <BlockSkeleton rows={6} />
      </div>
    )
  }

  const customer = query.data

  return (
    <div className="flex flex-col gap-5">
      <Header customer={customer} onQuickNote={() => setNoting(true)} />
      <OpportunityTable customerId={customer.id} />

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr_1fr]">
        <Card>
          <div className="flex items-baseline justify-between">
            <CardTitle>{t('customers.attributes')}</CardTitle>
            <span className="font-mono text-[10px] text-muted">attributes</span>
          </div>
          <Attributes attributes={customer.attributes} />
        </Card>

        <Card>
          <CardTitle>{t('customers.products')}</CardTitle>
          {customer.currentProducts.length === 0 ? (
            <p className="mt-2.5 text-[12.5px] text-muted">{t('customers.noProducts')}</p>
          ) : (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {customer.currentProducts.map((product) => (
                <Chip key={product} tone={{ fg: 'var(--ink2)', bg: 'var(--sunken)' }}>
                  {product}
                </Chip>
              ))}
            </div>
          )}

          <div className="mt-4 mb-3 h-px bg-line" />

          <dl className="flex flex-col gap-2">
            <Row label={t('customers.contactName')}>{customer.contactName ?? '—'}</Row>
            <Row label={t('customers.contactPhone')} mono>
              {customer.contactPhone ?? '—'}
            </Row>
            <Row label={t('customers.updatedAt')} mono>
              {vnDate(customer.updatedAt)}
            </Row>
          </dl>
        </Card>

        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <CardTitle>{t('customers.signals')}</CardTitle>
            {/** The second way in. The header button is where someone goes
              *  with a note in mind; this one is where they end up after
              *  reading the timeline and realising something is missing. */}
            <button
              type="button"
              onClick={() => setNoting(true)}
              className="text-[11.5px] text-muted transition-colors hover:text-ink"
            >
              {t('signals.add')}
            </button>
          </div>
          <div className="mt-3">
            <SignalTimeline customerId={customer.id} />
          </div>
        </Card>
      </div>

      {customer.note ? (
        <Card>
          <CardTitle>{t('customers.note')}</CardTitle>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink2">{customer.note}</p>
        </Card>
      ) : null}

      <SignalForm
        customerId={customer.id}
        open={noting}
        onClose={() => setNoting(false)}
      />
    </div>
  )
}

/** Name, the two chips that place the customer, and a strip of the figures
 *  someone would otherwise have to hunt for on the cards below. */
function Header({
  customer,
  onQuickNote,
}: {
  customer: Customer
  onQuickNote: () => void
}) {
  const facts = [
    { label: t('customers.revenue'), value: customer.revenue ? fmtMoney(customer.revenue) : '—' },
    { label: t('customers.contactName'), value: customer.contactName ?? '—' },
    { label: t('customers.contactPhone'), value: customer.contactPhone ?? '—' },
    {
      label: t('customers.productCount'),
      value: String(customer.currentProducts.length),
    },
    { label: t('customers.updatedAt'), value: vnDate(customer.updatedAt) },
  ]

  return (
    <div className="flex flex-col gap-3">
      <BackLink />

      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-tight">{customer.name}</h1>
            <Chip tone={SEGMENT_TONE[customer.segment]}>{t(`segment.${customer.segment}`)}</Chip>
            {customer.relationStage ? (
              <Chip tone={{ fg: 'var(--ink2)', bg: 'var(--sunken)' }}>
                {customer.relationStage}
              </Chip>
            ) : null}
            <Mono>{customer.code}</Mono>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-x-7 gap-y-2.5">
            {facts.map((fact) => (
              <div key={fact.label}>
                <div className="mb-0.5 text-[10px] tracking-[.06em] text-muted uppercase">
                  {fact.label}
                </div>
                <div className="text-[13px] font-medium">{fact.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-none items-center gap-2">
          <Button size="md" onClick={onQuickNote}>
            {t('signals.quickNote')}
          </Button>
          <Link to="/customers/$id/edit" params={{ id: customer.id }}>
            <Button size="md">{t('common.edit')}</Button>
          </Link>
          <Button size="md" variant="primary" disabled>
            {t('opportunities.add')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/customers"
      className="flex w-fit items-center gap-1.5 text-[12.5px] text-muted transition-colors hover:text-ink"
    >
      <ArrowLeft size={14} />
      {t('nav.customers')}
    </Link>
  )
}

function Row({
  label,
  mono,
  children,
}: {
  label: string
  mono?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[12px]">
      <span className="text-muted">{label}</span>
      <span className={mono ? 'truncate font-mono text-ink2' : 'truncate text-ink2'}>
        {children}
      </span>
    </div>
  )
}

/** The flexible per-segment fields, in a fixed order.
 *
 *  Known keys lead, so two customers in the same segment read the same way;
 *  anything the sales team added since is listed after under its own key
 *  rather than being dropped. */
function Attributes({ attributes }: { attributes: Record<string, unknown> }) {
  const entries = Object.entries(attributes).filter(
    ([, value]) => value !== null && value !== undefined && value !== '',
  )

  if (entries.length === 0) {
    return <p className="mt-2.5 text-[12.5px] text-muted">{t('customers.noAttributes')}</p>
  }

  const known = Object.keys(ATTRIBUTE_LABELS)
    .map((key) => entries.find(([k]) => k === key))
    .filter((entry): entry is [string, unknown] => Boolean(entry))
  const rest = entries.filter(([key]) => !(key in ATTRIBUTE_LABELS))

  return (
    <dl className="mt-3 grid gap-x-5 gap-y-3.5 sm:grid-cols-2">
      {[...known, ...rest].map(([key, value]) => (
        <div key={key}>
          <div className="mb-0.5 text-[11px] text-muted">{ATTRIBUTE_LABELS[key] ?? key}</div>
          <div className="text-[12.5px] leading-snug text-ink2">{String(value)}</div>
        </div>
      ))}
    </dl>
  )
}
