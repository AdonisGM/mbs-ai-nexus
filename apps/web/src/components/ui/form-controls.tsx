import { Select, createListCollection } from '@ark-ui/react/select'
import { Combobox, useListCollection } from '@ark-ui/react/combobox'
import { Portal } from '@ark-ui/react/portal'
import { useMemo, useState, type ReactNode } from 'react'
import { cx, Caption, Label } from './primitives'

export type Option = { value: string; label: string }

/** The one input look, exported so a screen that needs a plain field — the
 *  login form, which has no reason to pull in TanStack Form — still matches
 *  every other input rather than growing a second style. */
export const inputBase =
  'h-[34px] w-full rounded-lg border border-line2 bg-sunken px-3 text-[13px] text-ink outline-none transition-colors focus:border-accent'

export function Field({
  label,
  help,
  error,
  children,
  className,
}: {
  label?: ReactNode
  help?: ReactNode
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label ? <Label>{label}</Label> : null}
      {children}
      {error ? (
        <span className="text-[11px] text-danger">{error}</span>
      ) : help ? (
        <Caption>{help}</Caption>
      ) : null}
    </div>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  numeric,
  align,
  className,
  onBlur,
  invalid,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  numeric?: boolean
  align?: 'right'
  className?: string
  onBlur?: () => void
  invalid?: boolean
}) {
  return (
    <input
      type="text"
      value={value}
      onBlur={onBlur}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        inputBase,
        numeric && 'num',
        align === 'right' && 'text-right',
        invalid && '!border-danger',
        className,
      )}
    />
  )
}

/** Select của Ark: danh sách tự dựng nên tô được theo token, khác select gốc. */
export function SelectField({
  value,
  onChange,
  options,
  placeholder = 'Chọn',
  className,
}: {
  value: string
  onChange: (v: string) => void
  options: Option[]
  placeholder?: string
  className?: string
}) {
  const collection = useMemo(
    () => createListCollection({ items: options, itemToValue: (i) => i.value, itemToString: (i) => i.label }),
    [options],
  )
  return (
    <Select.Root
      collection={collection}
      value={value ? [value] : []}
      onValueChange={(e) => onChange(e.value[0] ?? '')}
      positioning={{ sameWidth: true }}
    >
      <Select.Control>
        <Select.Trigger
          className={cx(
            inputBase,
            'flex cursor-pointer items-center justify-between gap-2 text-left',
            className,
          )}
        >
          <Select.ValueText placeholder={placeholder} className="truncate" />
          <span className="h-1.5 w-1.5 rotate-45 border-r-[1.5px] border-b-[1.5px] border-muted" />
        </Select.Trigger>
      </Select.Control>
      <Portal>
        <Select.Positioner className="z-50">
          <Select.Content className="max-h-64 overflow-auto rounded-lg border border-line2 bg-surface p-1 shadow-pop focus:outline-none">
            {options.map((o) => (
              <Select.Item
                key={o.value}
                item={o}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] data-[highlighted]:bg-sunken data-[state=checked]:text-accent"
              >
                <Select.ItemText>{o.label}</Select.ItemText>
                <Select.ItemIndicator className="ml-auto text-accent">✓</Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  )
}

/** Ô nhập có gợi ý, thay cho datalist của bản thiết kế. */
export function ComboboxField({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  emptyText = 'Món mới, sẽ lưu vào thư viện',
}: {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
  className?: string
  /** Câu hiện khi gõ một giá trị chưa có trong gợi ý. Mặc định là câu của
   *  thư viện món bên hoá đơn, nơi ô này dựng ra đầu tiên. */
  emptyText?: string
}) {
  const { collection, filter } = useListCollection({
    initialItems: suggestions,
    filter: (item, query) => item.toLowerCase().includes(query.toLowerCase()),
  })

  return (
    <Combobox.Root
      collection={collection}
      inputValue={value}
      allowCustomValue
      openOnClick
      onInputValueChange={(e) => {
        onChange(e.inputValue)
        filter(e.inputValue)
      }}
      onValueChange={(e) => onChange(e.value[0] ?? '')}
      positioning={{ sameWidth: true }}
    >
      <Combobox.Control>
        <Combobox.Input placeholder={placeholder} className={cx(inputBase, className)} />
      </Combobox.Control>
      <Portal>
        <Combobox.Positioner className="z-50">
          <Combobox.Content className="max-h-56 overflow-auto rounded-lg border border-line2 bg-surface p-1 shadow-pop focus:outline-none">
            <Combobox.Empty className="px-2.5 py-1.5 text-[12px] text-muted">{emptyText}</Combobox.Empty>
            {collection.items.map((item) => (
              <Combobox.Item
                key={item}
                item={item}
                className="cursor-pointer rounded-md px-2.5 py-1.5 text-[13px] data-[highlighted]:bg-sunken"
              >
                <Combobox.ItemText>{item}</Combobox.ItemText>
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.Root>
  )
}

/** Ô nhập gọn nằm trong bảng hoá đơn, chỉ hiện viền khi đang sửa. */
export function CellInput({
  value,
  onChange,
  align,
  numeric,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  align?: 'right'
  numeric?: boolean
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        'h-[30px] w-full rounded-md border border-transparent bg-transparent px-2 text-[12.5px] text-ink outline-none focus:border-accent focus:bg-sunken',
        numeric && 'num',
        align === 'right' && 'text-right',
      )}
    />
  )
}

/** Ô nhập số có khung, kèm một đơn vị nhỏ ở mép phải.
 *
 *  Cùng dáng với MoneyInput để một hàng nhập không có ô thì viền rõ ô thì
 *  trong suốt. CellInput ở dưới mới là ô dành cho bảng, nơi cả hàng đều trong
 *  suốt nên không lệch với ai. */
export function NumberInput({
  value,
  onChange,
  suffix,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  suffix?: string
  placeholder?: string
  className?: string
}) {
  /** Hậu tố nằm trong luồng chứ không đặt đè lên ô. Trước đây nó là một lớp
   *  phủ với đệm phải cố định, vừa đúng cho dấu phần trăm nhưng chữ dài hơn
   *  như "ngày" thì đè lên chính con số. */
  return (
    <div
      className={cx(
        inputBase,
        'flex items-center gap-1.5 pr-2.5 focus-within:border-accent',
        className,
      )}
    >
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="num min-w-0 flex-1 border-none bg-transparent text-right text-[13px] text-ink outline-none"
      />
      {suffix ? (
        <span className="flex-none text-[12px] text-muted">{suffix}</span>
      ) : null}
    </div>
  )
}

/** Ô nhập tiền. Hiện dấu chấm phân cách trong lúc gõ và trả ra số nguyên đơn vị
 *  đồng, để nơi gọi không phải tự bóc chuỗi. Chuỗi rỗng trả về null nên phân
 *  biệt được "chưa nhập" với "nhập số không". */
export function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  invalid,
  className,
  unit,
  signed,
}: {
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  invalid?: boolean
  className?: string
  /** Thay dấu tiền ở mép phải bằng thứ khác, ví dụ một nút nhỏ. Chỉ có một chỗ
   *  ở mép phải, đặt thêm gì vào đó là chồng lên dấu ₫. */
  unit?: ReactNode
  /** Cho gõ dấu trừ ở đầu. Mặc định tắt vì phần lớn ô tiền chỉ nhận số dương,
   *  chiều tiền do nơi khác quyết định. Bật ở những chỗ mà bản thân con số mang
   *  dấu: số dư ban đầu của ví, nơi thẻ tín dụng có thể đang nợ mà cũng có thể
   *  đang dư tiền. */
  signed?: boolean
}) {
  const group = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  /** Lúc mới gõ mỗi dấu trừ thì chưa có chữ số nào, con số gửi ra vẫn là null,
   *  nên nếu ô chỉ đọc từ giá trị đi vào thì dấu trừ vừa gõ đã biến mất. Giữ
   *  thêm chuỗi đang gõ để nó còn nằm trên màn hình. Chuỗi này chỉ được tin khi
   *  đọc ra đúng bằng giá trị đi vào, để lúc nơi gọi tự đổi số thì ô hiện theo
   *  nơi gọi chứ không kẹt lại ở thứ gõ dở. */
  const [raw, setRaw] = useState<string | null>(null)
  const read = (t: string) => {
    const digits = t.replace(/\D/g, '')
    if (digits === '') return null
    return signed && t.trimStart().startsWith('-') ? -Number(digits) : Number(digits)
  }
  const shown =
    raw !== null && read(raw) === value ? raw : value === null ? '' : group(value)

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={shown}
        placeholder={placeholder}
        onChange={(e) => {
          const next = read(e.target.value)
          setRaw(
            next === null
              ? signed && e.target.value.trimStart().startsWith('-')
                ? '-'
                : ''
              : group(next),
          )
          onChange(next)
        }}
        onBlur={() => setRaw(null)}
        className={cx(inputBase, 'num pr-7 text-right', invalid && '!border-danger', className)}
      />
      {unit ?? (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px] text-muted">
          ₫
        </span>
      )}
    </div>
  )
}

/** Ô chọn ngày. Dùng input ngày của trình duyệt thay vì cho gõ tự do, vì gõ tay
 *  thì mỗi người một kiểu và không có gì kiểm được. Giá trị đi ra vào đều là
 *  chuỗi ISO, đúng dạng cột date của Postgres. */
export function DateInput({
  value,
  onChange,
  invalid,
  className,
}: {
  value: string | null
  onChange: (v: string | null) => void
  invalid?: boolean
  className?: string
}) {
  return (
    <input
      type="date"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={cx(inputBase, 'num', invalid && '!border-danger', className)}
    />
  )
}
