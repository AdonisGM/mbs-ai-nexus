import { queryOptions } from '@tanstack/react-query'
import { api } from './client'

export type Signal = {
  id: string
  customerId: string
  type: string
  content: string
  source: 'sale' | 'system' | 'ai'
  observedAt: string
  authorId: string | null
  rawNote: string | null
  createdAt: string
}

export function signalsQuery(customerId: string) {
  return queryOptions({
    queryKey: ['customers', customerId, 'signals'],
    queryFn: () => api<Signal[]>(`/customers/${customerId}/signals`),
  })
}
