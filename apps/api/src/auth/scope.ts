import { and, eq, inArray, or, type SQL } from 'drizzle-orm'
import type { Db } from '../db/db.module'
import {
  SALES_ROLES,
  VISIBLE_TO_BM,
  VISIBLE_TO_LEAD,
  customers,
  opportunities,
  users,
  type User,
} from '../db/schema'

/** Row-level scoping: which records a person is allowed to see at all.
 *
 *  Kept apart from RolesGuard on purpose. The guard answers "may a team lead
 *  open this screen"; this answers "whose rows come back once they have". They
 *  fail differently too — a guard failure is a 403, a scope failure is simply
 *  an empty list, because telling someone a record exists but is not theirs is
 *  already a leak.
 *
 *  Everything funnels through one file so the rule has a single owner. Scoping
 *  spread across services is how a peer's customers eventually show up on the
 *  wrong screen: not because anyone wrote it wrongly, but because the eleventh
 *  query forgot to write it at all. */

/** Whose records a person may reach, expressed as a condition on `users`.
 *
 *  `undefined` means no restriction, which only an admin gets. Returning
 *  `undefined` rather than a tautology keeps the generated SQL clean and makes
 *  "unrestricted" impossible to produce by accident. */
function ownerFilter(user: User): SQL | undefined {
  switch (user.role) {
    /** Technical account. Sees everything, and every action is logged. */
    case 'admin':
      return undefined

    /** The whole unit, sales line only — an admin sitting in the same unit
     *  would otherwise turn up in the branch manager's headcount. */
    case 'bm':
      return and(eq(users.unitId, user.unitId), inArray(users.role, [...SALES_ROLES]))

    /** Their own people, plus themselves: a team lead may hold accounts.
     *  Notably NOT a peer's people — vertical, never horizontal. */
    case 'team_lead':
      return or(eq(users.id, user.id), eq(users.managerId, user.id))

    /** Only their own. */
    default:
      return eq(users.id, user.id)
  }
}

/** Customers this person may see. */
export function customerScope(db: Db, user: User): SQL | undefined {
  const filter = ownerFilter(user)
  if (!filter) return undefined
  return inArray(
    customers.ownerId,
    db.select({ id: users.id }).from(users).where(filter),
  )
}

/** What a branch manager is asking for.
 *
 *  `reporting` feeds the totals — pipeline, forecast, gap — and covers every
 *  deal a team lead can see. `actionable` feeds the list they can open and
 *  decide on, which is only what has been escalated to them.
 *
 *  The two differ for exactly one role, and conflating them breaks the screen
 *  in one of two ways: either the pipeline comes up short because it only
 *  counted escalations, or the branch manager ends up able to reach into every
 *  deal in the branch, which is not the job. */
export type OpportunityView = 'reporting' | 'actionable'

/** Opportunities this person may see.
 *
 *  Ownership is not enough here — the approval status gates matter just as
 *  much. A salesperson's drafts stay private until they confirm them, which is
 *  the mechanism behind "a manager sees what you agreed to, not every keystroke".
 */
export function opportunityScope(
  db: Db,
  user: User,
  view: OpportunityView = 'actionable',
): SQL | undefined {
  const filter = ownerFilter(user)

  /** Admin: no owner restriction and no status gate. */
  if (!filter) return undefined

  const byOwner = inArray(
    opportunities.ownerId,
    db.select({ id: users.id }).from(users).where(filter),
  )

  /** A salesperson sees their own work at every stage, drafts included. */
  if (user.role === 'sale') return byOwner

  const statuses =
    user.role === 'bm' && view === 'actionable' ? VISIBLE_TO_BM : VISIBLE_TO_LEAD

  return and(byOwner, inArray(opportunities.approvalStatus, [...statuses]))
}
