import { useMemo, type ReactNode } from 'react'
import { Button, cx } from './primitives'
import { PAGE_SIZES, clampPage, pageCountOf } from '~/lib/table-state'

/** Dãy số trang rút gọn: luôn có trang đầu, trang cuối, và một cửa sổ quanh
 *  trang đang mở; chỗ nhảy quãng thay bằng dấu ba chấm.
 *
 *  In hết mọi trang chỉ chịu được khi bảng có vài chục dòng. Sổ thật có ba
 *  nghìn bút toán, và cả dãy nút tràn ngang ra khỏi màn hình, đẩy luôn phần chữ
 *  bên trái thành một cột một chữ.
 *
 *  Đếm từ 0 cho khớp pageIndex của react-table; nơi gọi đếm từ 1 thì trừ đi.
 */
export function pageWindow(cur: number, pageCount: number): Array<number | '…'> {
  const near = new Set<number>([0, pageCount - 1, cur, cur - 1, cur + 1])
  if (cur <= 2) [1, 2, 3].forEach((n) => near.add(n))
  if (cur >= pageCount - 3) [2, 3, 4].forEach((n) => near.add(pageCount - n))
  const keep = [...near].filter((n) => n >= 0 && n < pageCount).sort((a, b) => a - b)
  const out: Array<number | '…'> = []
  for (const [i, n] of keep.entries()) {
    if (i > 0 && n - keep[i - 1] > 1) out.push('…')
    out.push(n)
  }
  return out
}

/** Chân bảng duy nhất của cả ứng dụng: đang xem tới đâu, chọn cỡ trang, rồi
 *  Trước / các số / Sau.
 *
 *  Trước đây có hai bản gần giống hệt nhau — một bản tự dựng bên trong DataTable
 *  và một bản là thành phần này — và chỉ bản kia có ô chọn cỡ trang, mà ô ấy lại
 *  bị chặn sau điều kiện `total > 25` nên phần lớn thời gian không thấy.
 *
 *  Đếm trang từ 1 vì người đọc đọc "trang 1" chứ không đọc "trang 0".
 */
export function Pager({
  page,
  size,
  total,
  unit,
  onPage,
  onSize,
  sizes = PAGE_SIZES,
  children,
}: {
  page: number
  size: number
  total: number
  /** Đơn vị đếm của bảng: "bút toán", "hoá đơn", "món". */
  unit: string
  onPage: (p: number) => void
  /** Bỏ trống thì không cho đổi cỡ trang, dùng cho bảng cỡ cố định. */
  onSize?: (n: number) => void
  /** Các cỡ cho chọn, thường là `t.sizes`. Bảng có cỡ riêng phải truyền, không
   *  thì cỡ đang dùng không khớp lựa chọn nào và ô select hiện ra trống trơn. */
  sizes?: number[]
  /** Thay dòng chữ bên trái, cho bảng có cách đếm riêng — Sổ ghi kép đếm cả bút
   *  toán lẫn số dòng nợ có. */
  children?: ReactNode
}) {
  const pageCount = pageCountOf(total, size)
  const cur = clampPage(page, total, size)
  const pages = useMemo(() => pageWindow(cur - 1, pageCount), [cur, pageCount])

  const from = total === 0 ? 0 : (cur - 1) * size + 1
  const to = Math.min(cur * size, total)

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line bg-raised px-4 py-2.5">
      <span className="mr-auto text-[11px] whitespace-nowrap text-muted">
        {children ?? `Hiển thị ${from} tới ${to} trong ${total} ${unit}`}
      </span>

      {/* Chỉ bày ô chọn cỡ trang khi có gì để chọn: bảng mười hai dòng mà treo
          một ô 25/50/100 thì đó là một ô điều khiển chết. */}
      {onSize && total > sizes[0] ? (
        <select
          value={size}
          onChange={(e) => onSize(Number(e.target.value))}
          title="Số dòng mỗi trang"
          className="h-7 cursor-pointer rounded-[7px] border border-line2 bg-surface px-1.5 text-[11.5px] text-ink2 outline-none"
        >
          {sizes.map((n) => (
            <option key={n} value={n}>
              {n} dòng
            </option>
          ))}
        </select>
      ) : null}

      <Button size="sm" disabled={cur === 1} onClick={() => onPage(cur - 1)}>
        Trước
      </Button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap${i}`} className="px-0.5 text-[12px] text-muted">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p + 1)}
            className={cx(
              'num h-7 min-w-7 cursor-pointer rounded-[7px] border px-2 text-[12px] font-medium',
              p + 1 === cur
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-line2 bg-surface text-ink2 hover:bg-sunken',
            )}
          >
            {p + 1}
          </button>
        ),
      )}
      <Button size="sm" disabled={cur === pageCount} onClick={() => onPage(cur + 1)}>
        Sau
      </Button>
    </div>
  )
}
