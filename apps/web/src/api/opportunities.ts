import { queryOptions } from '@tanstack/react-query'
import { api } from './client'

export type Opportunity = {
  id: string
  code: string
  customerId: string
  segment: 'sse' | 'rb'
  product: string
  need: string
  value: number
  stage: string
  confirmedData: Record<string, unknown>
  aiHypothesis: Record<string, unknown>
  missingInfo: string[]
  blockerCode: string | null
  blockerNote: string | null
  nextAction: string | null
  nextActionOwnerId: string | null
  ownerId: string
  dueDate: string | null
  winProbability: number
  supportNeeded: string | null
  bmDecision: string | null
  approvalStatus: string
  outcome: 'open' | 'won' | 'lost'
  outcomeReason: string | null
  createdVia: 'manual' | 'ai'
  draftedAt: string | null
  confirmedAt: string | null
  leadActedAt: string | null
  bmActedAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

export type OpportunityPage = {
  rows: Opportunity[]
  total: number
  page: number
  pageSize: number
}

export type OpportunityQuery = {
  customerId?: string
  segment?: string
  stage?: string
  approvalStatus?: string
  ownerId?: string
  mine?: boolean
  page?: number
  pageSize?: number
  /** A branch manager only. `reporting` widens the list to everything that
   *  feeds the totals; the default is what they can actually act on. */
  view?: 'reporting' | 'actionable'
}

function toSearch(query: OpportunityQuery): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '' || value === false) continue
    params.set(key, String(value))
  }
  const search = params.toString()
  return search ? `?${search}` : ''
}

export function opportunitiesQuery(query: OpportunityQuery) {
  return queryOptions({
    queryKey: ['opportunities', query],
    queryFn: () => api<OpportunityPage>(`/opportunities${toSearch(query)}`),
    placeholderData: (previous) => previous,
  })
}
