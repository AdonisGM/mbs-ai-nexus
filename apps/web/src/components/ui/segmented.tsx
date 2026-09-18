import { cx } from './primitives'

/** Nhóm nút chọn một, dùng cho chuyển sáng tối, dải thời gian biểu đồ, tab loại bút toán. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'sm',
  full,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ id: T; label: string }>
  size?: 'sm' | 'md'
  full?: boolean
}) {
  return (
    <div
      className={cx(
        'flex gap-0.5 rounded-lg border border-line2 bg-sunken p-0.5',
        full && 'w-full',
      )}
    >
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cx(
              'cursor-pointer rounded-md px-2.5 font-medium transition-colors',
              size === 'sm' ? 'h-6 text-[11.5px]' : 'h-[30px] text-[12.5px]',
              full && 'flex-1',
              active ? 'bg-surface text-ink' : 'bg-transparent text-muted hover:text-ink2',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Nút lọc dạng viên, khác segmented ở chỗ mỗi nút là một viền riêng. */
export function PillButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'h-8 cursor-pointer rounded-lg border px-3 text-[11.5px] font-medium transition-colors',
        active
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-line2 bg-surface text-ink2 hover:bg-sunken',
      )}
    >
      {label}
    </button>
  )
}
