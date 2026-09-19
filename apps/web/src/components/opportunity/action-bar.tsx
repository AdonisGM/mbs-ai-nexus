import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  actOnOpportunity,
  type OfferedAction,
  type OpportunityWithActions,
} from '~/api/opportunities'
import { inputBase } from '~/components/ui/form-controls'
import { Modal } from '~/components/ui/modal'
import { Button, cx } from '~/components/ui/primitives'
import { t } from '~/i18n'
import { useWriteError } from '~/lib/use-write-error'

/** The moves the signed-in person may make on a deal.
 *
 *  The list comes from the server with the row, so nothing is offered here
 *  that the server would then refuse — and a rule added to the transition
 *  table reaches this bar without the screen being touched.
 *
 *  Moves that cost someone else work ask why before they go. A rejection with
 *  no reason just sends the salesperson round again, guessing. */
export function ActionBar({ deal }: { deal: OpportunityWithActions }) {
  const queryClient = useQueryClient()
  const onWriteError = useWriteError()
  const [asking, setAsking] = useState<OfferedAction | null>(null)
  const [reason, setReason] = useState('')

  const run = useMutation({
    mutationFn: ({ action, body }: { action: string; body?: { reason?: string } }) =>
      actOnOpportunity(deal.id, action, body),
    onSuccess: async (_, { action }) => {
      /** Everything the move touched: the deal's own row, its trace, and the
       *  lists it appears in — a confirmed deal leaves the salesperson's queue
       *  and joins the team lead's in the same instant. */
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['opportunities'] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
      ])
      toast.success(t(`actionDone.${action}` as never))
      close()
    },
    onError: (error) => void onWriteError(error),
  })

  function close() {
    setAsking(null)
    setReason('')
  }

  function press(offered: OfferedAction) {
    if (offered.requiresReason) {
      setAsking(offered)
      return
    }
    run.mutate({ action: offered.action })
  }

  /** "Đã xem" is written by opening the row, not by pressing anything, so it
   *  never appears as a button. */
  const buttons = deal.actions.filter((offered) => offered.action !== 'view')

  if (buttons.length === 0) {
    return <span className="text-[11.5px] text-muted">{t('actions.none')}</span>
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {buttons.map((offered) => (
          <Button
            key={offered.action}
            size="sm"
            variant={PRIMARY.has(offered.action) ? 'primary' : undefined}
            disabled={run.isPending}
            onClick={() => press(offered)}
          >
            {t(`action.${offered.action}`)}
          </Button>
        ))}
      </div>

      <Modal
        open={asking !== null}
        onClose={close}
        width={480}
        title={asking ? t(`action.${asking.action}`) : ''}
        subtitle={`${deal.code} · ${deal.product}`}
        footer={
          <>
            <Button size="lg" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button
              size="lg"
              variant={asking?.action === 'close' ? 'danger' : 'primary'}
              disabled={reason.trim().length === 0 || run.isPending}
              onClick={() =>
                asking && run.mutate({ action: asking.action, body: { reason: reason.trim() } })
              }
            >
              {run.isPending ? t('actions.working') : t('actions.send')}
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] text-muted">{t('actions.reason')}</span>
          <textarea
            id="reason"
            value={reason}
            rows={3}
            autoFocus
            onChange={(event) => setReason(event.target.value)}
            placeholder={asking ? reasonHint(asking.action) : ''}
            className={cx(inputBase, 'h-auto resize-y py-2.5 leading-relaxed')}
          />
          <span className="text-[11px] text-muted">{t('actions.reasonHint')}</span>
        </label>
      </Modal>
    </>
  )
}

/** The move that carries the deal forward gets the filled button. Anything
 *  else is a side road, and two primary buttons side by side make neither one
 *  the obvious next step. */
const PRIMARY = new Set(['confirm', 'coach', 'decide', 'complete'])

function reasonHint(action: string): string {
  switch (action) {
    case 'send_back':
      return t('actions.hint.send_back')
    case 'escalate':
      return t('actions.hint.escalate')
    case 'complete':
      return t('actions.hint.complete')
    case 'close':
      return t('actions.hint.close')
    default:
      return ''
  }
}
