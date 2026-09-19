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

/** What the signed-in person may press on this deal, and what each press
 *  needs. Comes from the server so the screen never offers a move the server
 *  would then refuse. */
export type OfferedAction = {
  action:
    | 'confirm'
    | 'view'
    | 'send_back'
    | 'coach'
    | 'escalate'
    | 'decide'
    | 'complete'
    | 'close'
  requiresReason: boolean
}

export type OpportunityWithActions = Opportunity & { actions: OfferedAction[] }

export type OpportunityPage = {
  rows: OpportunityWithActions[]
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

export type ActBody = {
  reason?: string
  missingInfo?: string[]
  nextAction?: string
  dueDate?: string
  bmDecision?: string
  winProbability?: number
}

export function actOnOpportunity(id: string, action: string, body: ActBody = {}) {
  return api<Opportunity>(`/opportunities/${id}/actions/${action}`, {
    method: 'POST',
    body,
  })
}

export type NewOpportunity = {
  customerId: string
  product: string
  need: string
  value: number
  stage?: string
  winProbability?: number
  dueDate?: string
  blockerCode?: string
  blockerNote?: string
  nextAction?: string
  supportNeeded?: string
  missingInfo?: string[]
}

export function createOpportunity(body: NewOpportunity) {
  return api<Opportunity>('/opportunities', { method: 'POST', body })
}

export const STAGES = [
  'prospecting',
  'discovery',
  'proposal',
  'negotiation',
  'documentation',
  'closing',
] as const

export const BLOCKER_CODES = [
  'rate',
  'speed',
  'experience',
  'documents',
  'collateral',
  'policy',
  'competitor',
  'customer_hesitation',
  'other',
] as const

/** Default conversion chance per stage. Mirrors the server, which applies the
 *  same defaults when the field is left out — shown here so the number is
 *  visible before saving rather than appearing afterwards. */
export const STAGE_WIN_PROBABILITY: Record<string, number> = {
  prospecting: 10,
  discovery: 25,
  proposal: 50,
  negotiation: 70,
  documentation: 85,
  closing: 100,
}
