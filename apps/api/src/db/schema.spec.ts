import { and, eq, isNull } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { closeDb, resetDb, testDb } from '../test/db'
import {
  makeAuditEvent,
  makeBranch,
  makeCustomer,
  makeOpportunity,
  makeSignal,
  makeUnit,
  makeUser,
} from '../test/factories'
import { auditEvents, customers, opportunities, signals, targets, users } from './schema'

/** These rules live in the database rather than in a service on purpose: they
 *  are the ones that must hold even when a future controller forgets them, so
 *  they are worth asserting directly. Each test names the constraint it
 *  expects, so a rename that silently drops a rule fails here rather than in
 *  production.
 *
 *  Drizzle wraps the driver error, so the constraint name may sit on the error
 *  itself or on its cause. Reading both keeps the assertion about the rule
 *  rather than about which layer happened to raise it. */
function constraintOf(error: unknown): string | undefined {
  const seen = error as { constraint_name?: string; cause?: { constraint_name?: string } }
  return seen?.constraint_name ?? seen?.cause?.constraint_name
}

async function expectViolation(work: Promise<unknown>, constraint: string) {
  const error = await work.then(
    () => null,
    (caught: unknown) => caught,
  )
  expect(error, `expected ${constraint} to be violated, but the write succeeded`).not.toBeNull()
  expect(constraintOf(error)).toBe(constraint)
}

beforeEach(resetDb)
afterAll(closeDb)

describe('users', () => {
  it('accepts the five operating accounts wired into one tree', async () => {
    const branch = await makeBranch()

    expect(branch.bm.managerId).toBeNull()
    expect(branch.leadSse.managerId).toBe(branch.bm.id)
    expect(branch.saleSse.managerId).toBe(branch.leadSse.id)
    expect(branch.saleRb.managerId).toBe(branch.leadRb.id)
  })

  it('requires a segment for salespeople and team leads', async () => {
    const unit = await makeUnit()
    const bm = await makeUser({ unitId: unit.id, role: 'bm' })

    await expectViolation(
      testDb.insert(users).values({
        id: 'u_no_segment',
        code: 'U-NO-SEGMENT',
        name: 'No segment',
        passwordHash: 'x',
        role: 'sale',
        title: 'Tester',
        unitId: unit.id,
        managerId: bm.id,
        segment: null,
      }),
      'users_segment_by_role',
    )
  })

  it('lets a branch manager cover the whole unit with no segment', async () => {
    const bm = await makeUser({ role: 'bm' })
    expect(bm.segment).toBeNull()
  })

  it('requires everyone but the branch manager to report to someone', async () => {
    const unit = await makeUnit()

    await expectViolation(
      testDb.insert(users).values({
        id: 'u_orphan',
        code: 'U-ORPHAN',
        name: 'Orphan',
        passwordHash: 'x',
        role: 'team_lead',
        title: 'Tester',
        unitId: unit.id,
        segment: 'rb',
        managerId: null,
      }),
      'users_manager_by_role',
    )
  })

  it('keeps the admin out of the sales tree entirely', async () => {
    const unit = await makeUnit()
    const bm = await makeUser({ unitId: unit.id, role: 'bm' })

    await expectViolation(
      testDb.insert(users).values({
        id: 'u_admin_segment',
        code: 'U-ADMIN-SEGMENT',
        name: 'Admin with a segment',
        passwordHash: 'x',
        role: 'admin',
        title: 'Admin',
        unitId: unit.id,
        segment: 'rb',
      }),
      'users_admin_outside_tree',
    )

    await expectViolation(
      testDb.insert(users).values({
        id: 'u_admin_manager',
        code: 'U-ADMIN-MANAGER',
        name: 'Admin with a manager',
        passwordHash: 'x',
        role: 'admin',
        title: 'Admin',
        unitId: unit.id,
        managerId: bm.id,
      }),
      'users_admin_outside_tree',
    )
  })

  it('rejects a role outside the closed set', async () => {
    const unit = await makeUnit()
    const bm = await makeUser({ unitId: unit.id, role: 'bm' })

    await expectViolation(
      testDb.insert(users).values({
        id: 'u_superuser',
        code: 'U-SUPERUSER',
        name: 'Superuser',
        passwordHash: 'x',
        role: 'superuser',
        title: 'Tester',
        unitId: unit.id,
        segment: 'rb',
        managerId: bm.id,
      }),
      'users_role',
    )
  })
})

describe('signals', () => {
  it('records an observation against a customer', async () => {
    const owner = await makeUser()
    const customer = await makeCustomer({ ownerId: owner.id })
    const signal = await makeSignal({
      customerId: customer.id,
      type: 'competition',
      content: 'Comparing rates with another bank',
      source: 'sale',
      authorId: owner.id,
    })

    expect(signal.type).toBe('competition')
  })

  it('requires an author when a person wrote it', async () => {
    const owner = await makeUser()
    const customer = await makeCustomer({ ownerId: owner.id })

    await expectViolation(
      testDb.insert(signals).values({
        id: 'sig_anon',
        customerId: customer.id,
        type: 'need',
        content: 'Anonymous',
        source: 'sale',
        authorId: null,
      }),
      'signals_author_by_source',
    )
  })

  it('allows the system and the model to write anonymously', async () => {
    const owner = await makeUser()
    const customer = await makeCustomer({ ownerId: owner.id })

    const fromSystem = await makeSignal({ customerId: customer.id, source: 'system' })
    const fromModel = await makeSignal({ customerId: customer.id, source: 'ai' })

    expect(fromSystem.authorId).toBeNull()
    expect(fromModel.authorId).toBeNull()
  })

  it('goes away with its customer', async () => {
    const owner = await makeUser()
    const customer = await makeCustomer({ ownerId: owner.id })
    await makeSignal({ customerId: customer.id })

    await testDb.delete(customers)
    expect(await testDb.select().from(signals)).toHaveLength(0)
  })
})

describe('opportunities', () => {
  async function aDeal() {
    const owner = await makeUser()
    const customer = await makeCustomer({ ownerId: owner.id })
    return { owner, customer }
  }

  it("starts a deal in the salesperson's own draft state", async () => {
    const { owner, customer } = await aDeal()
    const deal = await makeOpportunity({ customerId: customer.id, ownerId: owner.id })

    expect(deal.approvalStatus).toBe('sale_reviewing')
    expect(deal.stage).toBe('prospecting')
    expect(deal.outcome).toBe('open')
    expect(deal.createdVia).toBe('manual')
  })

  it("keeps confirmed data and the model's guesses apart", async () => {
    const { owner, customer } = await aDeal()
    const deal = await makeOpportunity({
      customerId: customer.id,
      ownerId: owner.id,
      confirmedData: { repaymentSource: 'salary' },
      aiHypothesis: { blocker: 'rate' },
    })

    expect(deal.confirmedData).toEqual({ repaymentSource: 'salary' })
    expect(deal.aiHypothesis).toEqual({ blocker: 'rate' })
  })

  it('rejects a deal worth nothing', async () => {
    const { owner, customer } = await aDeal()

    await expectViolation(
      testDb.insert(opportunities).values({
        id: 'opp_zero',
        code: 'OPP-ZERO',
        customerId: customer.id,
        ownerId: owner.id,
        segment: 'rb',
        product: 'Mortgage',
        need: 'Buy a home',
        value: 0,
      }),
      'opportunities_value',
    )
  })

  it('keeps the win probability inside nought to a hundred', async () => {
    const { owner, customer } = await aDeal()

    await expectViolation(
      makeOpportunity({ customerId: customer.id, ownerId: owner.id, winProbability: 101 }),
      'opportunities_win_probability',
    )
    await expectViolation(
      makeOpportunity({ customerId: customer.id, ownerId: owner.id, winProbability: -1 }),
      'opportunities_win_probability',
    )
  })

  it('will not close a deal without saying why', async () => {
    const { owner, customer } = await aDeal()

    await expectViolation(
      makeOpportunity({ customerId: customer.id, ownerId: owner.id, outcome: 'lost' }),
      'opportunities_outcome_reason',
    )

    const won = await makeOpportunity({
      customerId: customer.id,
      ownerId: owner.id,
      outcome: 'won',
      outcomeReason: 'Rate concession approved',
    })
    expect(won.outcome).toBe('won')
  })

  it('only accepts a blocker from the closed set, so identical ones group', async () => {
    const { owner, customer } = await aDeal()

    await expectViolation(
      makeOpportunity({ customerId: customer.id, ownerId: owner.id, blockerCode: 'lai_suat' }),
      'opportunities_blocker_code',
    )

    const stuck = await makeOpportunity({
      customerId: customer.id,
      ownerId: owner.id,
      blockerCode: 'rate',
      blockerNote: 'Wants 0.3% off',
    })
    expect(stuck.blockerCode).toBe('rate')
  })

  it('rejects an approval status outside the ten from the brief', async () => {
    const { owner, customer } = await aDeal()

    await expectViolation(
      makeOpportunity({
        customerId: customer.id,
        ownerId: owner.id,
        approvalStatus: 'waiting_for_legal',
      }),
      'opportunities_approval_status',
    )
  })
})

describe('audit events', () => {
  async function aDeal() {
    const owner = await makeUser()
    const customer = await makeCustomer({ ownerId: owner.id })
    const deal = await makeOpportunity({ customerId: customer.id, ownerId: owner.id })
    return { owner, deal }
  }

  it('starts a trace with no predecessor and nothing to time', async () => {
    const { owner, deal } = await aDeal()

    const [first] = await testDb
      .insert(auditEvents)
      .values({
        id: 'aud_first',
        opportunityId: deal.id,
        seq: 1,
        actorId: owner.id,
        fromStatus: null,
        toStatus: 'sale_reviewing',
        direction: 'up',
        toUserId: owner.id,
        heldMs: null,
      })
      .returning()

    expect(first.seq).toBe(1)
    expect(first.heldMs).toBeNull()
  })

  it('refuses a later event that pretends to be the first', async () => {
    const { owner, deal } = await aDeal()

    await expectViolation(
      testDb.insert(auditEvents).values({
        id: 'aud_gap',
        opportunityId: deal.id,
        seq: 2,
        actorId: owner.id,
        fromStatus: null,
        toStatus: 'sale_confirmed',
        direction: 'up',
        toUserId: owner.id,
        heldMs: 5_000,
      }),
      'audit_events_first_event',
    )
  })

  it('refuses a later event with no time recorded, which would bend every duration', async () => {
    const { owner, deal } = await aDeal()

    await expectViolation(
      testDb.insert(auditEvents).values({
        id: 'aud_untimed',
        opportunityId: deal.id,
        seq: 2,
        actorId: owner.id,
        fromStatus: 'sale_reviewing',
        toStatus: 'sale_confirmed',
        direction: 'up',
        toUserId: owner.id,
        heldMs: null,
      }),
      'audit_events_first_event',
    )
  })

  it('makes a handover name someone and an in-place edit name nobody', async () => {
    const { owner, deal } = await aDeal()

    await expectViolation(
      testDb.insert(auditEvents).values({
        id: 'aud_nowhere',
        opportunityId: deal.id,
        seq: 1,
        actorId: owner.id,
        fromStatus: null,
        toStatus: 'sale_confirmed',
        direction: 'up',
        toUserId: null,
        heldMs: null,
      }),
      'audit_events_to_user_by_direction',
    )

    await expectViolation(
      testDb.insert(auditEvents).values({
        id: 'aud_edit_to_someone',
        opportunityId: deal.id,
        seq: 1,
        actorId: owner.id,
        fromStatus: null,
        toStatus: 'sale_reviewing',
        direction: 'in_place',
        toUserId: owner.id,
        heldMs: null,
      }),
      'audit_events_to_user_by_direction',
    )
  })

  it('will not let two events claim the same position in a trace', async () => {
    const { owner, deal } = await aDeal()

    await testDb.insert(auditEvents).values({
      id: 'aud_a',
      opportunityId: deal.id,
      seq: 1,
      actorId: owner.id,
      fromStatus: null,
      toStatus: 'sale_reviewing',
      direction: 'up',
      toUserId: owner.id,
      heldMs: null,
    })

    await expectViolation(
      testDb.insert(auditEvents).values({
        id: 'aud_b',
        opportunityId: deal.id,
        seq: 1,
        actorId: owner.id,
        fromStatus: null,
        toStatus: 'sale_confirmed',
        direction: 'up',
        toUserId: owner.id,
        heldMs: null,
      }),
      'audit_events_trace',
    )
  })

  it('leaves a handover unread until someone looks at it', async () => {
    const { owner, deal } = await aDeal()
    const lead = await makeUser({ role: 'team_lead' })

    const handover = await makeAuditEvent({
      opportunityId: deal.id,
      actorId: owner.id,
      toUserId: lead.id,
      toStatus: 'sale_confirmed',
      direction: 'up',
    })
    expect(handover.readAt).toBeNull()

    /** The unread badge is this query — no notifications table needed. */
    const unread = await testDb
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.toUserId, lead.id), isNull(auditEvents.readAt)))
    expect(unread).toHaveLength(1)

    await testDb
      .update(auditEvents)
      .set({ readAt: new Date() })
      .where(eq(auditEvents.id, handover.id))

    const stillUnread = await testDb
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.toUserId, lead.id), isNull(auditEvents.readAt)))
    expect(stillUnread).toHaveLength(0)
  })

  it('refuses a read mark on an edit addressed to nobody', async () => {
    const { owner, deal } = await aDeal()

    await expectViolation(
      testDb.insert(auditEvents).values({
        id: 'aud_read_edit',
        opportunityId: deal.id,
        seq: 1,
        actorId: owner.id,
        fromStatus: null,
        toStatus: 'sale_reviewing',
        direction: 'in_place',
        toUserId: null,
        heldMs: null,
        readAt: new Date(),
      }),
      'audit_events_read_by_direction',
    )
  })

  it('answers the flow chart in one query, loop-backs included', async () => {
    const { owner, deal } = await aDeal()

    const trace: Array<[number, string | null, string, number | null]> = [
      [1, null, 'sale_reviewing', null],
      [2, 'sale_reviewing', 'sale_confirmed', 60_000],
      [3, 'sale_confirmed', 'lead_returned', 120_000],
      [4, 'lead_returned', 'sale_confirmed', 30_000],
      [5, 'sale_confirmed', 'lead_approved', 45_000],
    ]

    for (const [seq, fromStatus, toStatus, heldMs] of trace) {
      await testDb.insert(auditEvents).values({
        id: `aud_flow_${seq}`,
        opportunityId: deal.id,
        seq,
        actorId: owner.id,
        fromStatus,
        toStatus,
        direction: fromStatus === 'lead_returned' ? 'up' : 'down',
        toUserId: owner.id,
        heldMs,
      })
    }

    const rows = await testDb.select().from(auditEvents)
    expect(rows).toHaveLength(5)

    /** The send-back and the rework after it both survive as their own edges,
     *  which is what makes the loop visible on a flow chart instead of the
     *  deal appearing to go straight through. */
    const sentBack = rows.filter((row) => row.toStatus === 'lead_returned')
    expect(sentBack).toHaveLength(1)

    const timed = rows.filter((row) => row.heldMs !== null)
    expect(timed).toHaveLength(4)
    expect(timed.reduce((total, row) => total + (row.heldMs ?? 0), 0)).toBe(255_000)
  })
})

describe('targets', () => {
  it('stores a unit number and a personal number side by side', async () => {
    const branch = await makeBranch()

    const unitTarget = await testDb
      .insert(targets)
      .values({
        id: 'tgt_unit',
        scope: 'unit',
        unitId: branch.unit.id,
        period: '2026-Q3',
        amount: 10_000_000_000,
      })
      .returning()

    const personal = await testDb
      .insert(targets)
      .values({
        id: 'tgt_person',
        scope: 'user',
        ownerId: branch.saleRb.id,
        unitId: branch.unit.id,
        period: '2026-Q3',
        amount: 2_000_000_000,
      })
      .returning()

    expect(unitTarget[0].ownerId).toBeNull()
    expect(personal[0].ownerId).toBe(branch.saleRb.id)
  })

  it('refuses a unit target that also names a person, which would double count', async () => {
    const branch = await makeBranch()

    await expectViolation(
      testDb.insert(targets).values({
        id: 'tgt_both',
        scope: 'unit',
        ownerId: branch.saleRb.id,
        unitId: branch.unit.id,
        period: '2026-Q3',
        amount: 1_000_000,
      }),
      'targets_owner_by_scope',
    )
  })

  it('refuses a personal target with nobody attached', async () => {
    const branch = await makeBranch()

    await expectViolation(
      testDb.insert(targets).values({
        id: 'tgt_nobody',
        scope: 'user',
        unitId: branch.unit.id,
        period: '2026-Q3',
        amount: 1_000_000,
      }),
      'targets_owner_by_scope',
    )
  })

  /** The reason the unique index uses coalesce: Postgres treats NULLs as
   *  distinct, so a plain index would let two unit targets for the same
   *  quarter through, and the gap would then depend on which row a query read
   *  first. */
  it('allows only one unit target per period', async () => {
    const branch = await makeBranch()

    await testDb.insert(targets).values({
      id: 'tgt_one',
      scope: 'unit',
      unitId: branch.unit.id,
      period: '2026-Q3',
      amount: 10_000_000_000,
    })

    await expectViolation(
      testDb.insert(targets).values({
        id: 'tgt_two',
        scope: 'unit',
        unitId: branch.unit.id,
        period: '2026-Q3',
        amount: 20_000_000_000,
      }),
      'targets_key',
    )
  })

  it('still allows one target per segment in the same unit and period', async () => {
    const branch = await makeBranch()

    for (const segment of ['sse', 'rb'] as const) {
      await testDb.insert(targets).values({
        id: `tgt_${segment}`,
        scope: 'unit',
        unitId: branch.unit.id,
        segment,
        period: '2026-Q3',
        amount: 5_000_000_000,
      })
    }

    expect(await testDb.select().from(targets)).toHaveLength(2)
  })

  it('rejects a target of zero', async () => {
    const branch = await makeBranch()

    await expectViolation(
      testDb.insert(targets).values({
        id: 'tgt_zero',
        scope: 'unit',
        unitId: branch.unit.id,
        period: '2026-Q3',
        amount: 0,
      }),
      'targets_amount',
    )
  })
})
