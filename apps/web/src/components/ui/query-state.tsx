import type { ReactNode } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { ApiError } from '~/api/client'
import { Button, Card, cx } from './primitives'

/** Ba trạng thái mà mọi màn đọc dữ liệu phải có: đang tải, lỗi, và có dữ liệu.
 *
 *  Trước đây chỉ có hai. Mười hai trang viết `if (isPending) return null`, nên
 *  mạng chậm là trang trắng trơn, không dấu hiệu nào cho biết đang chờ hay đã
 *  hỏng. Và vì trang nào cũng viết `data: rows = []` nên gọi API thất bại lại ra
 *  một bảng rỗng kèm câu "Không có dữ liệu" — nói sai hẳn chuyện đang xảy ra. */

/** Câu lỗi đưa ra màn hình.
 *
 *  NestJS trả lời nhắn thật trong `message` và `ApiError` đã bóc sẵn. Mạng đứt
 *  thì fetch ném TypeError với câu tiếng Anh của trình duyệt, không đưa cho
 *  người đọc được, nên thay bằng câu của mình. */
export function errorText(e: unknown, fallback = 'Máy chủ không trả lời như mong đợi'): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof TypeError) return 'Không nối được tới máy chủ. Kiểm tra mạng rồi thử lại.'
  if (e instanceof Error && e.message) return e.message
  return fallback
}

/** Bề rộng các vệt xương, lặp theo vòng chứ không lấy ngẫu nhiên: ngẫu nhiên
 *  thì mỗi lần vẽ lại một kiểu và khung xương nhấp nháy. */
const WIDTHS = ['72%', '54%', '86%', '46%', '66%', '78%', '58%', '90%']

function Bar({ w, h = 10 }: { w: string; h?: number }) {
  return (
    <span className="block animate-pulse rounded-[3px] bg-line2" style={{ width: w, height: h }} />
  )
}

/** Khung xương của một bảng: giữ nguyên viền, nền và chiều cao dòng của bảng
 *  thật để lúc dữ liệu về trang không nhảy một cái. */
export function TableSkeleton({
  rows = 8,
  cols = 5,
  minWidth = 880,
}: {
  rows?: number
  cols?: number
  minWidth?: number
}) {
  const cells = (offset: number, h: number) => (
    <div
      className="grid gap-3 px-4"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, minWidth }}
    >
      {Array.from({ length: cols }, (_, c) => (
        <Bar key={c} w={WIDTHS[(offset + c) % WIDTHS.length]} h={h} />
      ))}
    </div>
  )

  return (
    <div
      aria-busy="true"
      aria-label="Đang tải dữ liệu"
      className="overflow-hidden rounded-xl border border-line bg-surface"
    >
      <div className="overflow-hidden bg-sunken py-3">{cells(0, 8)}</div>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className={cx('overflow-hidden border-t border-line py-3.5', r % 2 === 1 && 'bg-raised')}
        >
          {cells(r + 1, 10)}
        </div>
      ))}
      <div className="flex items-center gap-2 border-t border-line bg-raised px-4 py-3.5">
        <Bar w="180px" />
      </div>
    </div>
  )
}

/** Khung xương của một lưới thẻ: trang Ví, trang Danh mục, danh sách bài viết. */
export function CardsSkeleton({ count = 6, height = 132 }: { count?: number; height?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải dữ liệu"
      className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} style={{ height }} className="!gap-2.5">
          <Bar w={WIDTHS[i % WIDTHS.length]} h={12} />
          <Bar w="42%" h={18} />
          <span className="mt-auto flex flex-col gap-2">
            <Bar w="88%" />
            <Bar w="64%" />
          </span>
        </Card>
      ))}
    </div>
  )
}

/** Khung xương chung cho màn chưa có hình dạng riêng.
 *
 *  aria đặt trên thẻ div bọc ngoài chứ không đặt trên `Card`: Card chỉ nhận bốn
 *  prop nó khai và không rải phần còn lại xuống thẻ thật, nên aria-busy đặt lên
 *  nó sẽ rơi mất. TypeScript không bắt được vì thuộc tính JSX có gạch nối được
 *  miễn kiểm tra. */
export function BlockSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Đang tải dữ liệu">
      <Card className="!gap-3.5 !py-5">
        {Array.from({ length: rows }, (_, i) => (
          <Bar key={i} w={WIDTHS[i % WIDTHS.length]} h={12} />
        ))}
      </Card>
    </div>
  )
}

/** Màn báo lỗi: nói rõ đọc cái gì không được, in câu máy chủ trả về, và cho gọi
 *  lại ngay tại chỗ — phần lớn lỗi mạng tự hết ở lần thử thứ hai. */
export function ErrorState({
  what,
  error,
  onRetry,
}: {
  /** Đọc cái gì không được, viết thường: "danh sách bút toán". */
  what: string
  error: unknown
  onRetry: () => void
}) {
  return (
    <Card className="items-center gap-3 !py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft">
        <TriangleAlert size={22} strokeWidth={1.6} className="text-danger" />
      </span>
      <span className="text-[15px] font-semibold">Không đọc được {what}</span>
      <span className="max-w-[420px] text-[12.5px] leading-relaxed text-muted">
        {errorText(error)}
      </span>
      <Button size="lg" variant="primary" onClick={onRetry} className="mt-1">
        Thử lại
      </Button>
    </Card>
  )
}

/** Nút tải lại của bảng.
 *
 *  Cần có vì QueryClient đặt `refetchOnWindowFocus: false` cùng `staleTime` ba
 *  mươi giây, nên không có gì tự làm mới: dữ liệu chỉ đổi khi có ai đó gọi lại,
 *  mà trước đây không màn nào cho gọi. */
export function ReloadButton({
  busy,
  onClick,
  title = 'Đọc lại dữ liệu từ máy chủ',
}: {
  busy?: boolean
  onClick: () => void
  title?: string
}) {
  return (
    <Button size="sm" onClick={onClick} title={title}>
      <RefreshCw size={13} strokeWidth={2} className={busy ? 'animate-spin' : undefined} />
      Tải lại
    </Button>
  )
}

/** Lớp mờ lúc đang lấy lại dữ liệu.
 *
 *  Đi cùng `keepPreviousData`: bảng cũ ở lại và chỉ nhạt đi, nên đổi mốc lọc hay
 *  bấm tải lại không còn làm trang trắng một nhịp rồi hiện lại. Không chặn chuột
 *  vì lượt lấy lại thường xong trong tích tắc, khoá thao tác lại khó chịu hơn. */
export function Refreshing({ busy, children }: { busy?: boolean; children: ReactNode }) {
  return (
    <div aria-busy={busy} className={cx('transition-opacity', busy && 'opacity-55')}>
      {children}
    </div>
  )
}
