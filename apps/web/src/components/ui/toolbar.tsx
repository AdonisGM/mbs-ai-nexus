import { Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { DATE_PRESETS, type DateFilter, type DatePreset } from '~/lib/dates'
import { withPreset } from '~/lib/table-state'
import { PillButton } from './segmented'
import { cx } from './primitives'

/** Các mảnh rời của thanh lọc, thay cho `FilterBar` dùng chung.
 *
 *  Cái cũ vẽ bốn nút mốc thời gian cộng hai ô chọn ngày không điều kiện, bất kể
 *  trang gọi nó có dùng đến hay không — trang Chi định kỳ nhận đủ sáu ô ấy trong
 *  khi lệnh đọc của nó không có tham số kỳ nào, tức sáu ô điều khiển không làm
 *  gì cả. Còn trang nào cần mốc khác thì phải truyền thêm store riêng để lách.
 *
 *  Giờ mỗi trang tự ghép đúng những mảnh nó dùng. */

/** Hàng chứa các ô lọc. Phần tử nào muốn dạt sang phải thì tự đặt `ml-auto`. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('flex flex-wrap items-center gap-2', className)}>{children}</div>
}

/** Con số đếm ở cuối thanh lọc. */
export function ToolbarCount({ children }: { children: ReactNode }) {
  return <span className="num ml-auto text-[12px] text-muted">{children}</span>
}

/** Ô tìm duy nhất của cả ứng dụng.
 *
 *  Trước đây có ba bản: một trong FilterBar, một bản chép lại nguyên si trong
 *  danh sách bài viết vì FilterBar không dùng được ở đó, và `TextInput` ở trang
 *  Sao kê với Kho ảnh. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Tìm',
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div
      className={cx(
        'flex h-8 min-w-[240px] items-center gap-2 rounded-lg border border-line2 bg-surface px-2.5 focus-within:border-accent',
        className,
      )}
    >
      <Search size={13} strokeWidth={2} className="flex-none text-muted" />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 border-none bg-transparent text-[12.5px] text-ink outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          title="Xoá ô tìm"
          className="flex-none cursor-pointer text-muted hover:text-ink"
        >
          <X size={13} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  )
}

/** Nhóm nút lọc chọn một.
 *
 *  Ba trang từng tự dựng nút riêng: trang Công việc và Nhật ký trợ lý vẽ nút cao
 *  30px bo tròn hẳn, các trang Tiền dùng `PillButton` cao 32px bo 8px. Cùng một
 *  việc, ba hình. */
export function PillGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: ReadonlyArray<{ id: T; label: string }>
}) {
  return (
    <>
      {options.map((o) => (
        <PillButton
          key={o.id}
          label={o.label}
          active={value === o.id}
          onClick={() => onChange(o.id)}
        />
      ))}
    </>
  )
}

/** Mốc thời gian và khoảng ngày, chỉ dựng ở trang thật sự lọc theo kỳ.
 *
 *  `presets` để trang tự chọn bộ mốc của mình: trang liệt kê hỏi "gần đây có gì"
 *  nên khoảng trượt hợp hơn, còn trang Danh mục đứng cạnh ngân sách tháng nên
 *  mốc phải là kỳ trọn vẹn. */
export function DateRangeFilter({
  value,
  onChange,
  presets = DATE_PRESETS,
  fromTitle = 'Từ ngày',
  toTitle = 'Đến ngày',
}: {
  value: DateFilter
  onChange: (v: DateFilter) => void
  presets?: ReadonlyArray<{ id: DatePreset; label: string }>
  fromTitle?: string
  toTitle?: string
}) {
  /** Mốc chỉ sáng khi không có khoảng ngày gõ tay đè lên. */
  const activePreset = (id: DatePreset) => value.preset === id && !value.from && !value.to

  return (
    <>
      {presets.map((p) => (
        <PillButton
          key={p.id}
          label={p.label}
          active={activePreset(p.id)}
          onClick={() => onChange(withPreset(p.id))}
        />
      ))}
      <DayInput
        value={value.from}
        title={fromTitle}
        onChange={(from) => onChange({ ...value, from })}
      />
      <DayInput value={value.to} title={toTitle} onChange={(to) => onChange({ ...value, to })} />
    </>
  )
}

/** Ô chọn ngày của trình duyệt, giá trị đi ra vào là chuỗi ISO đúng dạng mà
 *  máy chủ nhận. Trước đây là ô gõ tự do dạng 01.08 nên mỗi người gõ một kiểu
 *  và không lọc được gì. */
function DayInput({
  value,
  onChange,
  title,
}: {
  value: string
  onChange: (v: string) => void
  title: string
}) {
  return (
    <input
      type="date"
      value={value}
      title={title}
      onChange={(e) => onChange(e.target.value)}
      className="num h-8 w-[136px] rounded-lg border border-line2 bg-surface px-2.5 text-[12px] text-ink outline-none focus:border-accent"
    />
  )
}
