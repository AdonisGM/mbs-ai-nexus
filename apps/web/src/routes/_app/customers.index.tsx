import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { customersQuery, type Customer } from '~/api/customers'
import { DataTable, type Column } from '~/components/ui/data-table'
import { Chip, Mono, Money } from '~/components/ui/primitives'
import { ErrorState, Refreshing, ReloadButton, TableSkeleton } from '~/components/ui/query-state'
import { PillGroup, SearchInput, Toolbar, ToolbarCount } from '~/components/ui/toolbar'
import { t, tCode } from '~/i18n'
import { fmtShort } from '~/lib/format'
import { useTableState } from '~/lib/table-state'
import { useDebounced } from '~/lib/use-debounced'

export const Route = createFileRoute('/_app/customers/')({ component: CustomersScreen })

type SegmentFilter = 'all' | 'sse' | 'rb'

const SEGMENT_OPTIONS = [
  { id: 'all', label: t('common.all') },
  { id: 'sse', label: t('segment.sse.short') },
  { id: 'rb', label: t('segment.rb.short') },
] as const satisfies ReadonlyArray<{ id: SegmentFilter; label: string }>

function CustomersScreen() {
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()

  const table = useTableState<{ q: string; segment: SegmentFilter }>({ q: '', segment: 'all' })

  /** The box updates instantly, the request waits for a pause. */
  const q = useDebounced(table.filters.q)

  const query = useQuery(
    customersQuery({
      q: q || undefined,
      segment: table.filters.segment === 'all' ? undefined : table.filters.segment,
      page: table.page,
      pageSize: table.size,
    }),
  )

  const columns: Column<Customer>[] = [
    {
      id: 'code',
      header: 'Mã',
      meta: { width: '110px', muted: true },
      cell: ({ row }) => <Mono>{row.original.code}</Mono>,
    },
    {
      id: 'name',
      header: t('field.customer'),
      meta: { width: '2fr' },
      cell: ({ row }) => (
        <span className="block truncate font-medium">{row.original.name}</span>
      ),
    },
    {
      id: 'segment',
      header: 'Phân khúc',
      meta: { width: '120px' },
      cell: ({ row }) => <SegmentChip segment={row.original.segment} />,
    },
    {
      id: 'products',
      header: 'Sản phẩm đang dùng',
      meta: { width: '1.4fr' },
      cell: ({ row }) => <Products items={row.original.currentProducts} />,
    },
    {
      id: 'revenue',
      header: 'Doanh số',
      meta: { width: '120px', align: 'right' },
      cell: ({ row }) =>
        row.original.revenue === null ? (
          <span className="text-muted">—</span>
        ) : (
          <Money value={fmtShort(row.original.revenue)} />
        ),
    },
    {
      id: 'stage',
      header: 'Quan hệ',
      meta: { width: '150px', muted: true },
      cell: ({ row }) => (
        <span className="block truncate text-muted">{row.original.relationStage ?? '—'}</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight">{t('nav.customers')}</h1>
        {/** Who is looking decides what comes back, so the screen says so
          *  rather than leaving someone to wonder why a colleague's list is
          *  longer than theirs. */}
        <p className="mt-1 text-[12.5px] text-muted">{scopeNote(user.role)}</p>
      </div>

      <Toolbar>
        <SearchInput
          value={table.filters.q}
          onChange={(value) => table.set('q', value)}
          placeholder={t('customers.searchPlaceholder')}
        />
        {/** Only worth showing to someone who can see both. A salesperson
          *  covers one segment, so the filter would be two buttons where one
          *  always returns nothing. */}
        {user.segment === null ? (
          <PillGroup
            value={table.filters.segment}
            onChange={(value) => table.set('segment', value)}
            options={SEGMENT_OPTIONS}
          />
        ) : null}
        {query.data ? <ToolbarCount>{query.data.total} khách hàng</ToolbarCount> : null}
        <span className="ml-auto">
          <ReloadButton busy={query.isFetching} onClick={() => void query.refetch()} />
        </span>
      </Toolbar>

      {query.isError ? (
        <ErrorState
          what="danh sách khách hàng"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : query.isPending ? (
        <TableSkeleton rows={8} />
      ) : (
        /** The previous page stays and only dims while the next one loads, so
          *  typing in the search box does not blank the table on every pause. */
        <Refreshing busy={query.isFetching}>
        <DataTable
          data={query.data.rows}
          columns={columns}
          page={table.page}
          size={table.size}
          onPage={table.setPage}
          onSize={table.setSize}
          sizes={table.sizes}
          /** Server-side paging: `rows` is one page and the server says how
           *  many there are in total. */
          total={query.data.total}
          unit="khách hàng"
          empty={table.filters.q ? t('customers.noMatch') : t('customers.empty')}
          onRowClick={(row) =>
            void navigate({ to: '/customers/$id', params: { id: row.id } })
          }
        />
        </Refreshing>
      )}
    </div>
  )
}

function SegmentChip({ segment }: { segment: Customer['segment'] }) {
  /** Two segments, two tones, so a mixed list sorts itself out at a glance
   *  without anyone reading the column. */
  const tone =
    segment === 'sse'
      ? { fg: 'var(--info)', bg: 'var(--info-soft)' }
      : { fg: 'var(--success)', bg: 'var(--success-soft)' }

  return <Chip tone={tone}>{t(`segment.${segment}.short`)}</Chip>
}

/** Products in use, trimmed.
 *
 *  A customer on five products would push every other column off the screen,
 *  so two show and the rest become a count. The full list is on the detail
 *  screen, which is where someone goes when they actually care. */
function Products({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-muted">—</span>

  const shown = items.slice(0, 2)
  const rest = items.length - shown.length

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate text-[12.5px]">{shown.join(' · ')}</span>
      {rest > 0 ? <span className="flex-none text-[11px] text-muted">+{rest}</span> : null}
    </span>
  )
}

function scopeNote(role: string): string {
  return tCode('customers.scope', role, '')
}
