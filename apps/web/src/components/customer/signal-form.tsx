import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ApiError } from '~/api/client'
import { createSignal, SIGNAL_TYPES, type SignalType } from '~/api/signals'
import { inputBase } from '~/components/ui/form-controls'
import { Modal } from '~/components/ui/modal'
import { Button, cx } from '~/components/ui/primitives'
import { t, tError } from '~/i18n'

/** Recording what just happened with a customer.
 *
 *  The big box comes first and the structured fields follow, which is the
 *  opposite of a normal form and the whole point of this one. A salesperson
 *  coming out of a meeting has a sentence in their head, not a taxonomy; made
 *  to classify first, they pick whatever is nearest and the note loses the
 *  detail that mattered.
 *
 *  It is also the slot the model plugs into. Today the sentence is kept
 *  verbatim in `rawNote` and the person fills in the rest; later the same
 *  sentence is what gets read to fill those fields in, and this form stops
 *  being two steps. Nothing else about the screen changes. */
export function SignalForm({
  customerId,
  open,
  onClose,
}: {
  customerId: string
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const [rawNote, setRawNote] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState<SignalType>('need')
  const [observedAt, setObservedAt] = useState(today())

  function reset() {
    setRawNote('')
    setContent('')
    setType('need')
    setObservedAt(today())
  }

  const save = useMutation({
    mutationFn: () =>
      createSignal(customerId, {
        type,
        /** The one-line summary is what the timeline shows. Left blank, the
         *  raw sentence stands in rather than the row rendering empty. */
        content: content.trim() || rawNote.trim(),
        rawNote: rawNote.trim() || undefined,
        observedAt: new Date(`${observedAt}T09:00:00`).toISOString(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'signals'] })
      toast.success(t('signals.saved'))
      reset()
      onClose()
    },
    onError: (error) => {
      toast.error(tError(error instanceof ApiError ? error.message : null))
    },
  })

  const ready = (rawNote.trim() || content.trim()).length > 0 && !save.isPending

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      width={560}
      title={t('signals.newTitle')}
      subtitle={t('signals.newSubtitle')}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="lg" variant="primary" disabled={!ready} onClick={() => save.mutate()}>
            {save.isPending ? t('signals.saving') : t('signals.save')}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] text-muted">{t('signals.rawNote')}</span>
        <textarea
          id="rawNote"
          value={rawNote}
          rows={4}
          autoFocus
          onChange={(event) => setRawNote(event.target.value)}
          placeholder={t('signals.rawNotePlaceholder')}
          className={cx(inputBase, 'h-auto resize-y py-2.5 leading-relaxed')}
        />
        <span className="text-[11px] text-muted">{t('signals.rawNoteHint')}</span>
      </label>

      <div className="h-px bg-line" />

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-muted">{t('signals.type')}</span>
        <div className="flex flex-wrap gap-1.5">
          {SIGNAL_TYPES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setType(id)}
              className={cx(
                'rounded-md border px-2.5 py-1.5 text-[11.5px] transition-colors',
                id === type
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-line2 text-muted hover:text-ink',
              )}
            >
              {t(`signal.${id}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] text-muted">{t('signals.content')}</span>
          <input
            id="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t('signals.contentPlaceholder')}
            className={inputBase}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          {/** Dated by when it was seen, not when it was typed: a Friday
            *  meeting written up on Monday still belongs on the Friday, or the
            *  timeline reports the wrong order of events. */}
          <span className="text-[11px] text-muted">{t('signals.observedAt')}</span>
          <input
            id="observedAt"
            type="date"
            value={observedAt}
            max={today()}
            onChange={(event) => setObservedAt(event.target.value)}
            className={cx(inputBase, 'font-mono')}
          />
        </label>
      </div>
    </Modal>
  )
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
