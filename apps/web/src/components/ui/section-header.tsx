import type { ReactNode } from 'react'

/** Tiêu đề mục trong trang Cài đặt. */
export function SectionHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="m-0 text-[20px] font-semibold tracking-[-0.01em]">{title}</h2>
      <p className="m-0 text-[13px] text-muted">{children}</p>
    </div>
  )
}
