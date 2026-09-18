/** How numbers are written on screen.
 *
 *  One place for all of it, because a figure that appears on two screens in
 *  two formats reads as two different figures. */

/** Thousands separated, no unit. */
export function fmtNum(n: number): string {
  const negative = n < 0
  const digits = Math.round(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (negative ? '-' : '') + digits
}

/** Full amount in đồng, for a detail screen where the exact figure matters. */
export function fmtMoney(n: number): string {
  return fmtNum(n) + ' ₫'
}

/** Shortened for lists, tiles and chart axes.
 *
 *  Branch figures run to tens of billions, and a column of thirteen-digit
 *  numbers is unreadable — "2,4 tỷ" is taken in at a glance, which is what a
 *  pipeline list is for. The full number stays available on the detail screen. */
export function fmtShort(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''

  if (abs >= 1_000_000_000) return `${sign}${trim(abs / 1_000_000_000)} tỷ`
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)} tr`
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)} n`
  return fmtNum(n)
}

function trim(value: number): string {
  return value
    .toFixed(value >= 100 ? 0 : 1)
    .replace(/\.0$/, '')
    .replace('.', ',')
}

export function fmtPercent(value: number): string {
  return `${Math.round(value)}%`
}

/** A signed change, for a figure that moved. */
export function fmtDelta(value: number): string {
  return (value >= 0 ? '+' : '') + fmtShort(value)
}

/** Duration in words, for the timing figures the audit trail produces.
 *
 *  Rounded to one unit deliberately: "2 ngày" is what someone reports upward,
 *  and "2 ngày 4 giờ 18 phút" is precision nobody asked for. */
export function fmtDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—'

  const minutes = Math.round(ms / 60_000)
  if (minutes < 1) return 'dưới 1 phút'
  if (minutes < 60) return `${minutes} phút`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} giờ`

  return `${Math.round(hours / 24)} ngày`
}

/** Initials for an avatar. Takes the last two words, because Vietnamese names
 *  put the given name last and "Nguyễn Văn Hải" is known as Hải, not as N. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
