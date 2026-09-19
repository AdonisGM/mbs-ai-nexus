import { queryOptions } from '@tanstack/react-query'
import { api } from './client'

export type Customer = {
  id: string
  code: string
  name: string
  segment: 'sse' | 'rb'
  ownerId: string
  currentProducts: string[]
  revenue: number | null
  relationStage: string | null
  attributes: Record<string, unknown>
  contactName: string | null
  contactPhone: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export type CustomerPage = {
  rows: Customer[]
  total: number
  page: number
  pageSize: number
}

export type CustomerQuery = {
  q?: string
  segment?: string
  ownerId?: string
  page?: number
  pageSize?: number
}

/** Only sends the parameters that are set.
 *
 *  An empty `q=` is not the same request as no `q` — it changes the cache key
 *  and, on a server that takes the empty string literally, the results. */
function toSearch(query: CustomerQuery): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const search = params.toString()
  return search ? `?${search}` : ''
}

export function customersQuery(query: CustomerQuery) {
  return queryOptions({
    queryKey: ['customers', query],
    queryFn: () => api<CustomerPage>(`/customers${toSearch(query)}`),
    /** Keeps the previous page on screen while the next one loads, so paging
     *  and typing in the search box do not blank the table on every keystroke. */
    placeholderData: (previous) => previous,
  })
}

export function customerQuery(id: string) {
  return queryOptions({
    queryKey: ['customers', 'detail', id],
    queryFn: () => api<Customer>(`/customers/${id}`),
  })
}

export type UpdateCustomerBody = {
  name?: string
  ownerId?: string
  currentProducts?: string[]
  revenue?: number
  relationStage?: string
  attributes?: Record<string, unknown>
  contactName?: string
  contactPhone?: string
  note?: string
}

/** `segment` is deliberately absent: moving a customer between segments would
 *  strand their open deals in the other pipeline, so it is not something an
 *  edit form gets to do. The server refuses it too. */
export function updateCustomer(id: string, body: UpdateCustomerBody) {
  return api<Customer>(`/customers/${id}`, { method: 'PATCH', body })
}
