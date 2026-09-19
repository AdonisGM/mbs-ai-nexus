import type { HistoryEvent } from '~/api/history'

/** The three tiers a deal passes through, left to right.
 *
 *  This is the spine of every approval view: the swimlane a step is drawn in,
 *  the progress bar on a collapsed row, and the label saying who is holding it
 *  all read off the same list, so they cannot disagree. */
export const LANES = [
  { id: 'sale', label: 'Sale' },
  { id: 'team_lead', label: 'Team-lead' },
  { id: 'bm', label: 'BM' },
] as const

export type LaneId = (typeof LANES)[number]['id']

/** Which lane a step belongs in.
 *
 *  Taken from the status reached rather than from whoever clicked. The two
 *  agree in normal use, and they part company exactly when an admin unsticks
 *  something during a demo — at which point the honest answer is still "this
 *  was a team lead's move", not "this was the admin's". */
export function laneOf(status: string): LaneId {
  if (status.startsWith('lead_') || status === 'escalated_to_bm') return 'team_lead'
  if (status === 'bm_decided') return 'bm'
  return 'sale'
}

export function laneIndex(status: string): number {
  return LANES.findIndex((lane) => lane.id === laneOf(status))
}

/** How far up the chain a deal has got, as one segment per tier.
 *
 *  `done` is a tier the deal has passed through, `current` is where it sits
 *  now, `todo` is ahead of it. A deal that ends at the team lead is not
 *  "incomplete" — most never need a branch manager — so a finished deal fills
 *  only the tiers it actually used. */
export type LaneState = 'done' | 'current' | 'todo'

export function laneStates(status: string): LaneState[] {
  const reached = laneIndex(status)
  const finished = status === 'completed' || status === 'closed_lost'

  return LANES.map((_, index) => {
    if (index < reached) return 'done'
    if (index === reached) return finished ? 'done' : 'current'
    return 'todo'
  })
}

/** Who is holding the deal right now, in a few words. */
export function holderLabel(status: string): string {
  switch (status) {
    case 'ai_drafted':
    case 'sale_reviewing':
      return 'Nhân viên'
    case 'lead_returned':
      return 'Chờ bổ sung'
    case 'sale_confirmed':
      return 'Chờ TL'
    case 'lead_viewed':
      return 'TL đang xem'
    case 'lead_approved':
      return 'TL đã duyệt'
    case 'escalated_to_bm':
      return 'Chờ BM'
    case 'bm_decided':
      return 'BM đã quyết'
    case 'completed':
      return 'Hoàn thành'
    case 'closed_lost':
      return 'Đã đóng'
    default:
      return status
  }
}

/** Whether a step moved the deal on, sent it back, or changed nothing. Drives
 *  the colour of the result chip in both the table and the diagram. */
export function toneOf(event: HistoryEvent): 'good' | 'warn' | 'muted' {
  if (event.toStatus === 'lead_returned' || event.toStatus === 'closed_lost') return 'warn'
  if (event.direction === 'in_place') return 'muted'
  return 'good'
}
