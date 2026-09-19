import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { customerQuery, type Customer } from '~/api/customers'
import { Card, CardTitle, Chip, Label, Money, Mono } from '~/components/ui/primitives'
import { BlockSkeleton, ErrorState } from '~/components/ui/query-state'
import { t } from '~/i18n'
import { fmtMoney } from '~/lib/format'
import { vnDate } from '~/lib/dates'

export const Route = createFileRoute('/_app/customers/$id')({ component: CustomerScreen })

/** What the flexible `attributes` field holds, per segment.
 *
 *  The keys are whatever the sales team put there — the column exists so they
 *  can add one without a migration — so this decides the order and the label
 *  for the ones known about, and anything unrecognised still renders under its
 *  own key rather than being dropped. */
const ATTRIBUTE_LABELS: Record<string, string> = {
  doanhSoTienVao: 'Doanh số tiền vào',
  tyLeChuyenSangNHKhac: 'Chuyển sang ngân hàng khác',
  mucDoDungSanPhamMSB: 'Mức độ dùng sản phẩm MSB',
  nhuCauVonKinhDoanh: 'Nhu cầu vốn kinh doanh',
  phuongAnKinhDoanh: 'Phương án kinh doanh',
  mucDichVay: 'Mục đích vay',
  taiSanBaoDam: 'Tài sản bảo đảm',
  nguonTraNo: 'Nguồn trả nợ',
  tinhTrangPhapLy: 'Tình trạng pháp lý',
  nganHangDangSoSanh: 'Ngân hàng đang so sánh',
}

function CustomerScreen() {
  const { id } = Route.useParams()
  const query = useQuery(customerQuery(id))

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
    <div className="flex flex-col gap-4">
      <BackLink />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[19px] font-semibold tracking-tight">{customer.name}</h1>
            <SegmentChip segment={customer.segment} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted">
            <Mono>{customer.code}</Mono>
            {customer.relationStage ? <span>· {customer.relationStage}</span> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle>Thông tin theo phân khúc</CardTitle>
            <Attributes attributes={customer.attributes} />
          </Card>

          {customer.note ? (
            <Card>
              <CardTitle>Ghi chú</CardTitle>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink2">{customer.note}</p>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle>Tổng quan</CardTitle>
            <dl className="mt-3 flex flex-col gap-2.5">
              <Row label="Doanh số">
                {customer.revenue === null ? (
                  <span className="text-muted">—</span>
                ) : (
                  <Money value={fmtMoney(customer.revenue)} size="md" />
                )}
              </Row>
              <Row label="Liên hệ">
                {customer.contactName ?? <span className="text-muted">—</span>}
              </Row>
              <Row label="Điện thoại">
                {customer.contactPhone ? (
                  <Mono>{customer.contactPhone}</Mono>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </Row>
              <Row label="Cập nhật">{vnDate(customer.updatedAt)}</Row>
            </dl>
          </Card>

          <Card>
            <CardTitle>Sản phẩm đang dùng</CardTitle>
            {customer.currentProducts.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-muted">
                Chưa dùng sản phẩm nào của MSB
              </p>
            ) : (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {customer.currentProducts.map((product) => (
                  <Chip
                    key={product}
                    tone={{ fg: 'var(--ink2)', bg: 'var(--sunken)' }}
                  >
                    {product}
                  </Chip>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/** Signals and opportunities belong on this screen and are next. Saying
        *  so beats an empty panel that looks like a bug. */}
      <Card>
        <CardTitle>Tín hiệu và cơ hội</CardTitle>
        <p className="mt-2 text-[12.5px] text-muted">Đang dựng.</p>
      </Card>
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <Label>{label}</Label>
      <span className="min-w-0 truncate text-right text-[12.5px]">{children}</span>
    </div>
  )
}

function SegmentChip({ segment }: { segment: Customer['segment'] }) {
  const tone =
    segment === 'sse'
      ? { fg: 'var(--info)', bg: 'var(--info-soft)' }
      : { fg: 'var(--success)', bg: 'var(--success-soft)' }

  return <Chip tone={tone}>{t(`segment.${segment}`)}</Chip>
}

function Attributes({ attributes }: { attributes: Record<string, unknown> }) {
  const entries = Object.entries(attributes).filter(
    ([, value]) => value !== null && value !== undefined && value !== '',
  )

  if (entries.length === 0) {
    return <p className="mt-2 text-[12.5px] text-muted">Chưa có thông tin bổ sung</p>
  }

  /** Known keys first and in a fixed order, so two customers in the same
   *  segment read the same way; anything else follows, under its own key. */
  const known = entries.filter(([key]) => key in ATTRIBUTE_LABELS)
  const rest = entries.filter(([key]) => !(key in ATTRIBUTE_LABELS))
  const ordered = [
    ...Object.keys(ATTRIBUTE_LABELS)
      .map((key) => known.find(([k]) => k === key))
      .filter((entry): entry is [string, unknown] => Boolean(entry)),
    ...rest,
  ]

  return (
    <dl className="mt-3 flex flex-col gap-3">
      {ordered.map(([key, value]) => (
        <div key={key} className="flex flex-col gap-0.5">
          <Label>{ATTRIBUTE_LABELS[key] ?? key}</Label>
          <span className="text-[12.5px] leading-relaxed text-ink2">{String(value)}</span>
        </div>
      ))}
    </dl>
  )
}
