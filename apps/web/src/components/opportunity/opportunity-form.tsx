import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ApiError } from '~/api/client'
import {
  BLOCKER_CODES,
  STAGES,
  STAGE_WIN_PROBABILITY,
  createOpportunity,
} from '~/api/opportunities'
import { inputBase } from '~/components/ui/form-controls'
import { Modal } from '~/components/ui/modal'
import { Button, cx } from '~/components/ui/primitives'
import { t, tCode, tError } from '~/i18n'
import { fmtMoney } from '~/lib/format'

/** Opening a new deal on a customer.
 *
 *  Kept to what a salesperson knows coming out of a meeting: what they are
 *  selling, why, how much and by when. Everything else the deal will collect —
 *  the blocker, the missing information, who it is waiting on — arrives as the
 *  deal moves, and asking for it up front just produces guesses.
 *
 *  It opens in the salesperson's own draft, invisible to their team lead until
 *  they confirm it. That is the point of the first gate: a half-written deal
 *  is not a report. */
export function OpportunityForm({
  customerId,
  open,
  onClose,
}: {
  customerId: string
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const [product, setProduct] = useState('')
  const [need, setNeed] = useState('')
  const [value, setValue] = useState('')
  const [stage, setStage] = useState<string>('prospecting')
  const [dueDate, setDueDate] = useState('')
  const [blockerCode, setBlockerCode] = useState('')
  const [blockerNote, setBlockerNote] = useState('')

  /** Shown before saving rather than appearing afterwards. The figure drives
   *  the branch manager's forecast, so someone entering a deal should see what
   *  they are adding to it. */
  const probability = STAGE_WIN_PROBABILITY[stage] ?? 10
  const amount = Number(value.replace(/\D/g, '')) || 0

  function reset() {
    setProduct('')
    setNeed('')
    setValue('')
    setStage('prospecting')
    setDueDate('')
    setBlockerCode('')
    setBlockerNote('')
  }

  const save = useMutation({
    mutationFn: () =>
      createOpportunity({
        customerId,
        product: product.trim(),
        need: need.trim(),
        value: amount,
        stage,
        dueDate: dueDate || undefined,
        blockerCode: blockerCode || undefined,
        blockerNote: blockerNote.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      toast.success(t('opportunities.created'))
      reset()
      onClose()
    },
    onError: (error) => {
      toast.error(tError(error instanceof ApiError ? error.message : null))
    },
  })

  const ready =
    product.trim().length > 0 && need.trim().length > 0 && amount > 0 && !save.isPending

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      width={560}
      title={t('opportunities.newTitle')}
      subtitle={t('opportunities.newSubtitle')}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="lg" variant="primary" disabled={!ready} onClick={() => save.mutate()}>
            {save.isPending ? t('opportunities.creating') : t('opportunities.create')}
          </Button>
        </>
      }
    >
      <Field label={t('field.product')} required>
        <input
          id="product"
          value={product}
          autoFocus
          onChange={(event) => setProduct(event.target.value)}
          placeholder="Vay mua bất động sản"
          className={inputBase}
        />
      </Field>

      <Field label={t('field.need')} required>
        <input
          id="need"
          value={need}
          onChange={(event) => setNeed(event.target.value)}
          placeholder="Mua căn hộ, cần giải ngân trước hạn hợp đồng"
          className={inputBase}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
        <Field label={`${t('field.value')} (đồng)`} required>
          <input
            id="value"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            inputMode="numeric"
            placeholder="2000000000"
            className={cx(inputBase, 'font-mono')}
          />
          {amount > 0 ? (
            <span className="font-mono text-[11px] text-muted">{fmtMoney(amount)}</span>
          ) : null}
        </Field>

        <Field label={t('field.dueDate')}>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className={cx(inputBase, 'font-mono')}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-muted">
          {t('field.stage')}
          {/** The probability follows the stage, so the consequence of the
            *  choice is visible while it is being made. */}
          <span className="ml-2 font-mono text-muted">· {probability}%</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setStage(id)}
              className={cx(
                'rounded-md border px-2.5 py-1.5 text-[11.5px] transition-colors',
                id === stage
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-line2 text-muted hover:text-ink',
              )}
            >
              {tCode('stage', id, id)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-muted">
          {t('field.blocker')} · {t('common.optional')}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {BLOCKER_CODES.map((id) => (
            <button
              key={id}
              type="button"
              /** Tapping the chosen one again clears it. A deal with nothing
                *  in its way is the normal case, and a picker with no way back
                *  to "none" forces a blocker onto every deal. */
              onClick={() => setBlockerCode((current) => (current === id ? '' : id))}
              className={cx(
                'rounded-md border px-2.5 py-1.5 text-[11.5px] transition-colors',
                id === blockerCode
                  ? 'border-[var(--warn)] bg-warn-soft text-ink'
                  : 'border-line2 text-muted hover:text-ink',
              )}
            >
              {tCode('blocker', id, id)}
            </button>
          ))}
        </div>
      </div>

      {blockerCode ? (
        <Field label={t('field.blockerNote')}>
          <input
            id="blockerNote"
            value={blockerNote}
            onChange={(event) => setBlockerNote(event.target.value)}
            placeholder="VCB chào 7,9% năm đầu, khách so sánh"
            className={inputBase}
          />
        </Field>
      ) : null}
    </Modal>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] text-muted">
        {label}
        {required ? <span className="ml-1 text-[var(--warn)]">*</span> : null}
      </span>
      {children}
    </label>
  )
}
