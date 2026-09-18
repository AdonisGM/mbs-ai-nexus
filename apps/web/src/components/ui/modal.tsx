import { Dialog } from '@ark-ui/react/dialog'
import { Portal } from '@ark-ui/react/portal'
import type { ReactNode } from 'react'
import { Button } from './primitives'

/** Modal dùng Ark UI: bẫy focus, khoá cuộn nền, đóng bằng Esc, aria đầy đủ.
 *  Phần nhìn vẫn do Tailwind và token quyết định. */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  width = 560,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  width?: number
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-[var(--scrim)]" />
        <Dialog.Positioner className="fixed inset-0 z-40 flex items-start justify-center overflow-auto px-5 pt-[4vh] pb-6">
          <Dialog.Content
            style={{ maxWidth: width }}
            className="flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-modal"
          >
            <div className="flex items-center gap-3 border-b border-line px-[18px] py-4">
              <span className="mr-auto flex flex-col gap-0.5">
                <Dialog.Title className="text-[15px] font-semibold">{title}</Dialog.Title>
                {subtitle ? (
                  <Dialog.Description className="text-[11px] text-muted">
                    {subtitle}
                  </Dialog.Description>
                ) : null}
              </span>
              <Dialog.CloseTrigger asChild>
                <Button variant="quiet" size="bare">Đóng</Button>
              </Dialog.CloseTrigger>
            </div>

            <div className="flex flex-col gap-3.5 px-[18px] py-4">{children}</div>

            {footer ? (
              <div className="flex justify-end gap-2.5 border-t border-line bg-raised px-[18px] py-3.5">
                {footer}
              </div>
            ) : null}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

/** Hỏi lại trước một việc không hoàn tác được. Trang Passkey đã dựng tay khuôn
 *  này một lần; module Tiền còn nhiều chỗ cần hỏi lại nên gói lại dùng chung. */
export function ConfirmModal({
  open,
  onClose,
  title,
  confirm,
  danger,
  pending,
  onConfirm,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Chữ trên nút thuận, ví dụ "Xoá hẳn". */
  confirm: string
  danger?: boolean
  pending?: boolean
  onConfirm: () => void
  children: ReactNode
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      width={440}
      title={title}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            size="lg"
            variant={danger ? 'danger' : 'primary'}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? 'Đang xử lý' : confirm}
          </Button>
        </>
      }
    >
      <span className="text-[12.5px] leading-relaxed text-ink2">{children}</span>
    </Modal>
  )
}
