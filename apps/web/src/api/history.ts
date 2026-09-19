import { queryOptions } from '@tanstack/react-query'
import { api } from './client'

/** One step in a deal's approval trace, with the person behind it already
 *  resolved — the screen shows names and tiers, not ids. */
export type HistoryEvent = {
  id: string
  seq: number
  fromStatus: string | null
  toStatus: string
  direction: 'up' | 'down' | 'in_place'
  heldMs: number | null
  readAt: string | null
  changes: Record<string, [unknown, unknown]>
  reason: string | null
  createdAt: string
  actorId: string
  actorName: string
  actorRole: 'sale' | 'team_lead' | 'bm' | 'admin'
  toUserId: string | null
  toUserName: string | null
  toUserRole: 'sale' | 'team_lead' | 'bm' | 'admin' | null
}

export function historyQuery(opportunityId: string, enabled = true) {
  return queryOptions({
    queryKey: ['opportunities', opportunityId, 'history'],
    queryFn: () => api<HistoryEvent[]>(`/opportunities/${opportunityId}/history`),
    /** Only fetched once a row is actually expanded. Several can be open at
     *  once, and pre-loading a trace nobody opened is a request per row. */
    enabled,
  })
}
