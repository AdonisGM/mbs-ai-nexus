import {
  createPaginatedRowModel,
  rowPaginationFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type Updater,
} from '@tanstack/react-table'
import type { ReactNode } from 'react'
import { cx } from './primitives'
import { Pager } from './pager'
import { DEFAULT_PAGE_SIZE, clampPage } from '~/lib/table-state'

export const tableFeaturesConfig = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})

export type ColumnMeta = {
  /** Bề rộng cột, số px cố định hoặc chuỗi fr như trong bản thiết kế. */
  width?: string
  align?: 'right' | 'center'
  /** Cột giữ chữ nhỏ, dùng cho ngày và mã. */
  muted?: boolean
}

export type Column<T extends RowData> = ColumnDef<typeof tableFeaturesConfig, T, any> & { meta?: ColumnMeta }

/** Bảng dùng chung cho mọi trang: header nền chìm, dòng lẻ nền nổi, cuộn ngang
 *  khi hẹp, chân bảng là bộ phân trang chung.
 *
 *  Trang và cỡ trang do bên ngoài giữ, thường là `useTableState`. Trước đây
 *  chúng nằm trong state nội bộ của react-table, nên không nơi nào cầm được cả
 *  bộ lọc lẫn số trang để đưa xuống API.
 *
 *  Truyền `total` là chuyển sang chế độ máy chủ đã cắt trang sẵn: `data` khi ấy
 *  chỉ là các dòng của trang đang xem, còn tổng số dòng thì máy chủ nói. Bỏ
 *  trống thì bảng tự cắt trong bộ nhớ như hiện nay. */
export function DataTable<T extends RowData>({
  data,
  columns,
  page,
  size = DEFAULT_PAGE_SIZE,
  onPage,
  onSize,
  sizes,
  total,
  minWidth = 880,
  unit,
  onRowClick,
  rowTone,
  empty = 'Không có dữ liệu trong kỳ',
  footerRow,
  toolbar,
  summary,
}: {
  data: T[]
  columns: Column<T>[]
  page: number
  size?: number
  onPage: (p: number) => void
  /** Bỏ trống thì chân bảng không cho đổi cỡ trang. */
  onSize?: (n: number) => void
  /** Các cỡ cho chọn, thường là `t.sizes`. Bỏ trống thì ba cỡ chuẩn. */
  sizes?: number[]
  /** Chỉ truyền khi máy chủ đã cắt trang. */
  total?: number
  minWidth?: number
  unit: string
  onRowClick?: (row: T) => void
  rowTone?: (row: T) => string | undefined
  empty?: ReactNode
  footerRow?: ReactNode
  toolbar?: ReactNode
  /** Thay dòng chữ "Hiển thị x tới y" ở chân bảng. */
  summary?: ReactNode
}) {
  const serverPaged = total !== undefined
  const rowCount = total ?? data.length

  /** Kẹp số trang ngay tại đây, bằng đúng hàm mà chân bảng dùng.
   *
   *  Danh sách co lại — lọc chặt hơn, vừa xoá một dòng — thì số trang đang giữ
   *  có thể vượt quá số trang còn lại. Đưa thẳng số thô cho react-table thì nó
   *  cắt ra một lát rỗng và bảng báo "không có dữ liệu", trong khi chân bảng đã
   *  kẹp về trang cuối và tô sáng trang ấy. Hai chỗ nói hai điều khác nhau.
   *  Cùng gọi một hàm thuần thì chúng luôn khớp, không phải đồng bộ state. */
  const cur = clampPage(page, rowCount, size)

  const table = useTable({
    features: tableFeaturesConfig,
    columns: columns as ColumnDef<typeof tableFeaturesConfig, T, any>[],
    data,
    state: { pagination: { pageIndex: cur - 1, pageSize: size } },
    onPaginationChange: (updater: Updater<PaginationState>) => {
      const prev: PaginationState = { pageIndex: cur - 1, pageSize: size }
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (next.pageSize !== size) onSize?.(next.pageSize)
      if (next.pageIndex !== prev.pageIndex) onPage(next.pageIndex + 1)
    },
    manualPagination: serverPaged,
    rowCount: total,
    /** Dữ liệu đổi thì về trang đầu. Bảng bài hát dựa hẳn vào chuyện này: đổi
     *  sang danh sách phát khác mà giữ nguyên trang 12 là rơi vào trang trống,
     *  hoặc tệ hơn, vào trang 12 của một danh sách chẳng liên quan.
     *
     *  Trừ khi máy chủ cắt trang: ở đó bấm sang trang sau là `data` đổi, nên tự
     *  động về trang đầu nghĩa là không bao giờ rời được trang một. Bù lại,
     *  `useTableState` đã đưa về trang đầu mỗi lần đổi ô lọc. */
    autoResetPageIndex: !serverPaged,
  })

  const rows = table.getRowModel().rows

  /** Bản thiết kế mô tả bề rộng cột bằng px và fr như grid. Thẻ col không hiểu
   *  fr, nên quy đổi phần fr thành phần trăm của khoảng trống còn lại. */
  const fixedPx = columns.reduce((a, c) => {
    const w = c.meta?.width
    return w && w.endsWith('px') ? a + parseFloat(w) : a
  }, 0)
  const totalFr = columns.reduce((a, c) => {
    const w = c.meta?.width
    return w && w.endsWith('fr') ? a + parseFloat(w) : a
  }, 0)
  const colWidth = (w?: string) => {
    if (!w) return undefined
    if (w.endsWith('fr')) {
      const share = parseFloat(w) / (totalFr || 1)
      return `calc((100% - ${fixedPx}px) * ${share})`
    }
    return w
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      {toolbar}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse" style={{ minWidth }}>
          <colgroup>
            {columns.map((c, i) => (
              <col key={i} style={{ width: colWidth(c.meta?.width) }} />
            ))}
          </colgroup>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="bg-sunken">
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta as ColumnMeta | undefined
                  return (
                    <th
                      key={header.id}
                      className={cx(
                        'px-3 py-2.5 text-[11px] font-semibold text-ink2 first:pl-4 last:pr-4',
                        meta?.align === 'right' ? 'text-right' : 'text-left',
                      )}
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-[12px] text-muted">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  style={rowTone ? { background: rowTone(row.original) } : undefined}
                  className={cx(
                    'border-t border-line transition-colors',
                    !rowTone && i % 2 === 1 && 'bg-raised',
                    onRowClick && 'cursor-pointer',
                    'hover:bg-sunken',
                  )}
                >
                  {row.getAllCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as ColumnMeta | undefined
                    return (
                      <td
                        key={cell.id}
                        className={cx(
                          'px-3 py-2 align-middle text-[13px] first:pl-4 last:pr-4',
                          meta?.align === 'right' && 'text-right',
                          meta?.align === 'center' && 'text-center',
                          meta?.muted && 'text-[12px] text-muted',
                        )}
                      >
                        <table.FlexRender cell={cell} />
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
            {footerRow}
          </tbody>
        </table>
      </div>

      <Pager page={cur} size={size} total={rowCount} unit={unit} onPage={onPage} onSize={onSize} sizes={sizes}>
        {summary}
      </Pager>
    </div>
  )
}
