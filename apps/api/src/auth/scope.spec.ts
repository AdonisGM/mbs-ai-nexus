import { and, eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { closeDb, resetDb, testDb } from '../test/db'
import { makeBranch, makeCustomer, makeOpportunity, makeUser, type Branch } from '../test/factories'
import { customers, opportunities, type User } from '../db/schema'
import { customerScope, opportunityScope, type OpportunityView } from './scope'

/** The rule these tests defend: visibility runs vertically, never sideways.
 *  A salesperson sees their own book, a team lead sees their own people, a
 *  branch manager sees the unit — and nobody sees a peer's customers.
 *
 *  Every assertion goes through the same query shape the services use, so a
 *  scope that compiles but selects the wrong rows fails here. */

async function visibleCustomers(user: User) {
  const rows = await testDb
    .select({ id: customers.id })
    .from(customers)
    .where(customerScope(testDb, user))
  return rows.map((row) => row.id).sort()
}

async function visibleOpportunities(user: User, view: OpportunityView = 'actionable') {
  const rows = await testDb
    .select({ id: opportunities.id })
    .from(opportunities)
    .where(opportunityScope(testDb, user, view))
  return rows.map((row) => row.id).sort()
}

beforeEach(resetDb)
afterAll(closeDb)

describe('customer scope', () => {
  type Fixture = Branch & { sseCustomer: string; rbCustomer: string }

  async function branchWithCustomers(): Promise<Fixture> {
    const branch = await makeBranch()
    const sseCustomer = await makeCustomer({ ownerId: branch.saleSse.id, segment: 'sse' })
    const rbCustomer = await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb' })
    return { ...branch, sseCustomer: sseCustomer.id, rbCustomer: rbCustomer.id }
  }

  it('gives a salesperson only their own book', async () => {
    const f = await branchWithCustomers()
    expect(await visibleCustomers(f.saleSse)).toEqual([f.sseCustomer])
  })

  it("hides a peer's customers from a salesperson", async () => {
    const f = await branchWithCustomers()
    expect(await visibleCustomers(f.saleRb)).not.toContain(f.sseCustomer)
  })

  it('gives a team lead their own people', async () => {
    const f = await branchWithCustomers()
    expect(await visibleCustomers(f.leadSse)).toEqual([f.sseCustomer])
  })

  it("hides the other team's customers from a team lead", async () => {
    const f = await branchWithCustomers()
    expect(await visibleCustomers(f.leadSse)).not.toContain(f.rbCustomer)
    expect(await visibleCustomers(f.leadRb)).not.toContain(f.sseCustomer)
  })

  it("includes a team lead's own accounts alongside their people's", async () => {
    const f = await branchWithCustomers()
    const ownAccount = await makeCustomer({ ownerId: f.leadSse.id, segment: 'sse' })

    expect(await visibleCustomers(f.leadSse)).toEqual([f.sseCustomer, ownAccount.id].sort())
  })

  it('gives a branch manager the whole unit', async () => {
    const f = await branchWithCustomers()
    expect(await visibleCustomers(f.bm)).toEqual([f.sseCustomer, f.rbCustomer].sort())
  })

  it('stops at the unit boundary', async () => {
    const here = await branchWithCustomers()
    const elsewhere = await makeBranch()
    const theirCustomer = await makeCustomer({ ownerId: elsewhere.saleRb.id })

    expect(await visibleCustomers(here.bm)).not.toContain(theirCustomer.id)
    expect(await visibleCustomers(elsewhere.bm)).not.toContain(here.rbCustomer)
  })

  it('gives an admin everything, across units', async () => {
    const here = await branchWithCustomers()
    const elsewhere = await makeBranch()
    const theirCustomer = await makeCustomer({ ownerId: elsewhere.saleRb.id })
    const admin = await makeUser({ role: 'admin', unitId: here.unit.id })

    expect(await visibleCustomers(admin)).toEqual(
      [here.sseCustomer, here.rbCustomer, theirCustomer.id].sort(),
    )
  })

  it('returns nothing rather than erroring when a salesperson has no book', async () => {
    const branch = await makeBranch()
    expect(await visibleCustomers(branch.saleSse)).toEqual([])
  })
})

describe('opportunity scope', () => {
  async function branchWithDeals() {
    const branch = await makeBranch()
    const customer = await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb' })

    const draft = await makeOpportunity({
      customerId: customer.id,
      ownerId: branch.saleRb.id,
      approvalStatus: 'sale_reviewing',
    })
    const confirmed = await makeOpportunity({
      customerId: customer.id,
      ownerId: branch.saleRb.id,
      approvalStatus: 'sale_confirmed',
    })
    const escalated = await makeOpportunity({
      customerId: customer.id,
      ownerId: branch.saleRb.id,
      approvalStatus: 'escalated_to_bm',
    })

    return { ...branch, draft: draft.id, confirmed: confirmed.id, escalated: escalated.id }
  }

  it('lets a salesperson see their own drafts', async () => {
    const f = await branchWithDeals()
    expect(await visibleOpportunities(f.saleRb)).toEqual(
      [f.draft, f.confirmed, f.escalated].sort(),
    )
  })

  /** The first gate, and the answer to "is my every keystroke being watched".
   *  It is not: a manager sees what was agreed to, not what was typed. */
  it('hides a draft from the team lead until it is confirmed', async () => {
    const f = await branchWithDeals()
    const visible = await visibleOpportunities(f.leadRb)

    expect(visible).not.toContain(f.draft)
    expect(visible).toEqual([f.confirmed, f.escalated].sort())
  })

  it("hides the other team's deals from a team lead", async () => {
    const f = await branchWithDeals()
    expect(await visibleOpportunities(f.leadSse)).toEqual([])
  })

  /** The second gate. The totals must cover everything a team lead can see,
   *  or the pipeline comes up short; the list a branch manager can act on must
   *  not, or they end up reaching into every deal in the branch. */
  it('counts every confirmed deal for a branch manager but opens only escalations', async () => {
    const f = await branchWithDeals()

    expect(await visibleOpportunities(f.bm, 'reporting')).toEqual(
      [f.confirmed, f.escalated].sort(),
    )
    expect(await visibleOpportunities(f.bm, 'actionable')).toEqual([f.escalated])
  })

  it("keeps a draft out of the branch manager's totals too", async () => {
    const f = await branchWithDeals()
    expect(await visibleOpportunities(f.bm, 'reporting')).not.toContain(f.draft)
  })

  it('gives an admin every deal at every status', async () => {
    const f = await branchWithDeals()
    const admin = await makeUser({ role: 'admin', unitId: f.unit.id })

    expect(await visibleOpportunities(admin)).toEqual(
      [f.draft, f.confirmed, f.escalated].sort(),
    )
  })

  it('stops at the unit boundary for a branch manager', async () => {
    const here = await branchWithDeals()
    const elsewhere = await makeBranch()
    const theirCustomer = await makeCustomer({ ownerId: elsewhere.saleRb.id })
    const theirDeal = await makeOpportunity({
      customerId: theirCustomer.id,
      ownerId: elsewhere.saleRb.id,
      approvalStatus: 'escalated_to_bm',
    })

    expect(await visibleOpportunities(here.bm, 'reporting')).not.toContain(theirDeal.id)
  })

  /** Scoping has to survive being combined with the filters a screen adds,
   *  which is where a condition built as a bare `or` would silently widen. */
  it('still holds when a screen adds its own filter', async () => {
    const f = await branchWithDeals()

    const rows = await testDb
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(
        and(
          opportunityScope(testDb, f.leadRb),
          eq(opportunities.approvalStatus, 'sale_confirmed'),
        ),
      )

    expect(rows.map((row) => row.id)).toEqual([f.confirmed])
  })
})
