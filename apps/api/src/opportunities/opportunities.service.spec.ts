import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { auditEvents, type Opportunity } from '../db/schema'
import { closeDb, resetDb, testDb } from '../test/db'
import { makeBranch, makeCustomer, type Branch } from '../test/factories'
import { OpportunitiesService } from './opportunities.service'

const service = new OpportunitiesService(testDb)

beforeEach(resetDb)
afterAll(closeDb)

/** A branch with one retail customer on Hải's book — the scenario from the
 *  brief, and the shape every approval test needs. */
async function scene() {
  const branch = await makeBranch()
  const customer = await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb' })
  return { ...branch, customerId: customer.id }
}

async function aDeal(s: Awaited<ReturnType<typeof scene>>, value = 2_000_000_000) {
  return service.create(s.saleRb, {
    customerId: s.customerId,
    product: 'Mortgage',
    need: 'Buy a home',
    value,
  })
}

async function trace(id: string) {
  return testDb
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.opportunityId, id))
    .orderBy(asc(auditEvents.seq))
}

describe('create', () => {
  it('starts a deal as the salesperson’s own draft', async () => {
    const s = await scene()
    const deal = await aDeal(s)

    expect(deal.approvalStatus).toBe('sale_reviewing')
    expect(deal.ownerId).toBe(s.saleRb.id)
    expect(deal.code).toMatch(/^OPP-\d{4}-0001$/)
    expect(deal.draftedAt).not.toBeNull()
  })

  /** The pipeline filters on segment constantly; a deal that disagreed with
   *  its customer would land in numbers nobody reviews. */
  it('takes the segment from the customer, not the caller', async () => {
    const s = await scene()
    const deal = await aDeal(s)
    expect(deal.segment).toBe('rb')
  })

  it('defaults the win probability from the stage', async () => {
    const s = await scene()
    const deal = await service.create(s.saleRb, {
      customerId: s.customerId,
      product: 'Mortgage',
      need: 'Buy a home',
      value: 1_000_000_000,
      stage: 'negotiation',
    })
    expect(deal.winProbability).toBe(70)
  })

  it('lets a person override the probability, because they met the customer', async () => {
    const s = await scene()
    const deal = await service.create(s.saleRb, {
      customerId: s.customerId,
      product: 'Mortgage',
      need: 'Buy a home',
      value: 1_000_000_000,
      stage: 'negotiation',
      winProbability: 40,
    })
    expect(deal.winProbability).toBe(40)
  })

  it("refuses to attach a deal to a customer the caller cannot see", async () => {
    const s = await scene()
    const theirs = await makeCustomer({ ownerId: s.saleSse.id, segment: 'sse' })

    await expect(
      service.create(s.saleRb, {
        customerId: theirs.id,
        product: 'Loan',
        need: 'Working capital',
        value: 1_000_000_000,
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('opens the trace with one event that has no predecessor and nothing to time', async () => {
    const s = await scene()
    const deal = await aDeal(s)

    const rows = await trace(deal.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ seq: 1, fromStatus: null, heldMs: null, direction: 'in_place' })
  })

  it('numbers deals sequentially within the year', async () => {
    const s = await scene()
    const first = await aDeal(s)
    const second = await aDeal(s)

    expect(Number(second.code.slice(-4))).toBe(Number(first.code.slice(-4)) + 1)
  })
})

describe('what the screen may offer', () => {
  /** The buttons come from the server with the rows. A screen that worked them
   *  out itself would eventually offer one the server refuses, and the person
   *  pressing it would see a form clear itself for no visible reason. */
  it('carries the available actions on every row of the list', async () => {
    const s = await scene()
    await aDeal(s)

    const page = await service.list(s.saleRb, {})
    expect(page.rows[0].actions.map((a) => a.action)).toEqual(['confirm'])
  })

  it('says which of them need a reason', async () => {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')

    const page = await service.list(s.leadRb, {})
    const offered = Object.fromEntries(
      page.rows[0].actions.map((a) => [a.action, a.requiresReason]),
    )

    expect(offered.send_back).toBe(true)
    expect(offered.escalate).toBe(true)
    expect(offered.coach).toBe(false)
    expect(offered.view).toBe(false)
  })

  it('offers a salesperson nothing on a deal that is already up the chain', async () => {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')

    const page = await service.list(s.saleRb, {})
    expect(page.rows[0].actions.map((a) => a.action)).not.toContain('confirm')
  })
})

describe('confirm', () => {
  it('is the first gate: nothing reaches the team lead before it', async () => {
    const s = await scene()
    const deal = await aDeal(s)

    await expect(service.get(s.leadRb, deal.id)).rejects.toBeInstanceOf(NotFoundException)

    await service.act(s.saleRb, deal.id, 'confirm')
    expect((await service.get(s.leadRb, deal.id)).id).toBe(deal.id)
  })

  it('hands the deal to the team lead and records the mark', async () => {
    const s = await scene()
    const deal = await aDeal(s)

    const after = await service.act(s.saleRb, deal.id, 'confirm')

    expect(after.approvalStatus).toBe('sale_confirmed')
    expect(after.nextActionOwnerId).toBe(s.leadRb.id)
    expect(after.confirmedAt).not.toBeNull()
  })

  it('clears outstanding questions, because confirming is standing behind it', async () => {
    const s = await scene()
    const deal = await service.create(s.saleRb, {
      customerId: s.customerId,
      product: 'Mortgage',
      need: 'Buy a home',
      value: 1_000_000_000,
      missingInfo: ['repayment source'],
    })

    const after = await service.act(s.saleRb, deal.id, 'confirm')
    expect(after.missingInfo).toEqual([])
  })

  it('will not let a team lead confirm on the salesperson’s behalf', async () => {
    const s = await scene()
    const deal = await aDeal(s)

    /** The lead cannot even see the draft, so this fails as missing rather
     *  than forbidden — which is the stronger guarantee. */
    await expect(service.act(s.leadRb, deal.id, 'confirm')).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('records the move as upward, addressed to the team lead', async () => {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')

    const rows = await trace(deal.id)
    expect(rows[1]).toMatchObject({
      seq: 2,
      fromStatus: 'sale_reviewing',
      toStatus: 'sale_confirmed',
      direction: 'up',
      toUserId: s.leadRb.id,
      readAt: null,
    })
    expect(rows[1].heldMs).toBeGreaterThanOrEqual(0)
  })
})

describe('the team lead', () => {
  async function confirmed() {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')
    return { s, deal }
  }

  it('marks a deal viewed the first time it is opened, and clears the badge', async () => {
    const { s, deal } = await confirmed()

    const after = await service.markViewed(s.leadRb, deal.id)
    expect((after as Opportunity).approvalStatus).toBe('lead_viewed')

    const rows = await trace(deal.id)
    const handover = rows.find((row) => row.toUserId === s.leadRb.id)
    expect(handover?.readAt).not.toBeNull()
  })

  it('does not write a second view event on every reopen', async () => {
    const { s, deal } = await confirmed()

    await service.markViewed(s.leadRb, deal.id)
    const afterFirst = (await trace(deal.id)).length
    await service.markViewed(s.leadRb, deal.id)

    expect(await trace(deal.id)).toHaveLength(afterFirst)
  })

  it('sends a deal back with the reason and the questions attached', async () => {
    const { s, deal } = await confirmed()

    const after = await service.act(s.leadRb, deal.id, 'send_back', {
      reason: 'Second repayment source is unclear',
      missingInfo: ['second repayment source'],
    })

    expect(after.approvalStatus).toBe('lead_returned')
    expect(after.nextActionOwnerId).toBe(s.saleRb.id)
    expect(after.missingInfo).toEqual(['second repayment source'])

    const rows = await trace(deal.id)
    expect(rows.at(-1)).toMatchObject({
      direction: 'down',
      toUserId: s.saleRb.id,
      reason: 'Second repayment source is unclear',
    })
  })

  /** A rejection with no reason just costs the salesperson another round. */
  it('refuses to send a deal back without saying why', async () => {
    const { s, deal } = await confirmed()

    await expect(service.act(s.leadRb, deal.id, 'send_back')).rejects.toBeInstanceOf(
      BadRequestException,
    )
    await expect(
      service.act(s.leadRb, deal.id, 'send_back', { reason: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('escalates to the branch manager, not to itself', async () => {
    const { s, deal } = await confirmed()

    const after = await service.act(s.leadRb, deal.id, 'escalate', {
      reason: 'Rate concession beyond my authority',
    })

    expect(after.approvalStatus).toBe('escalated_to_bm')
    expect(after.nextActionOwnerId).toBe(s.bm.id)
  })

  it("cannot touch another team's deal at all", async () => {
    const { s, deal } = await confirmed()

    await expect(
      service.act(s.leadSse, deal.id, 'escalate', { reason: 'Mine now' }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })
})

describe('the branch manager', () => {
  async function escalated() {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')
    await service.act(s.leadRb, deal.id, 'escalate', { reason: 'Needs a rate concession' })
    return { s, deal }
  }

  it('is the second gate: nothing is actionable before escalation', async () => {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')

    await expect(service.get(s.bm, deal.id)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('counts a confirmed deal in the totals even while it cannot be opened', async () => {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')

    const reporting = await service.list(s.bm, {}, 'reporting')
    const actionable = await service.list(s.bm, {}, 'actionable')

    expect(reporting.rows.map((row) => row.id)).toEqual([deal.id])
    expect(actionable.rows).toEqual([])
  })

  /** The move that closes the loop: a decision does not stop at a dashboard,
   *  it becomes something concrete on the salesperson's screen. */
  it('hands work back down to the salesperson when it decides', async () => {
    const { s, deal } = await escalated()

    const after = await service.act(s.bm, deal.id, 'decide', {
      bmDecision: 'Rate concession of 0.3% approved, valid to 30 September',
      nextAction: 'Tell the customer and close before the deadline',
      dueDate: '2026-09-30',
      winProbability: 90,
    })

    expect(after.approvalStatus).toBe('bm_decided')
    expect(after.nextActionOwnerId).toBe(s.saleRb.id)
    expect(after.bmDecision).toContain('0.3%')
    expect(after.nextAction).toContain('customer')
    expect(after.winProbability).toBe(90)
    expect(after.bmActedAt).not.toBeNull()

    const rows = await trace(deal.id)
    expect(rows.at(-1)).toMatchObject({ direction: 'down', toUserId: s.saleRb.id })
  })

  it('cannot decide on a deal that was never escalated', async () => {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')

    await expect(service.act(s.bm, deal.id, 'decide')).rejects.toBeInstanceOf(NotFoundException)
  })
})

describe('the loop back', () => {
  it('lets a returned deal be fixed and confirmed again', async () => {
    const s = await scene()
    const deal = await aDeal(s)

    await service.act(s.saleRb, deal.id, 'confirm')
    await service.act(s.leadRb, deal.id, 'send_back', { reason: 'Need more' })
    await service.update(s.saleRb, deal.id, { confirmedData: { repaymentSource: 'salary' } })
    const after = await service.act(s.saleRb, deal.id, 'confirm')

    expect(after.approvalStatus).toBe('sale_confirmed')
    expect(after.nextActionOwnerId).toBe(s.leadRb.id)
  })

  /** The first mark measures what a deal cost the salesperson. Overwriting it
   *  on resubmission would report a much smaller number and quietly flatter
   *  the trial results. */
  it('keeps the original confirmation mark through a round trip', async () => {
    const s = await scene()
    const deal = await aDeal(s)

    const first = await service.act(s.saleRb, deal.id, 'confirm')
    await service.act(s.leadRb, deal.id, 'send_back', { reason: 'Need more' })
    const second = await service.act(s.saleRb, deal.id, 'confirm')

    expect(second.confirmedAt?.getTime()).toBe(first.confirmedAt?.getTime())
  })

  it('leaves the send-back visible as its own edge in the trace', async () => {
    const s = await scene()
    const deal = await aDeal(s)

    await service.act(s.saleRb, deal.id, 'confirm')
    await service.act(s.leadRb, deal.id, 'send_back', { reason: 'Need more' })
    await service.act(s.saleRb, deal.id, 'confirm')

    const rows = await trace(deal.id)
    const edges = rows.map((row) => `${row.fromStatus ?? 'start'}>${row.toStatus}`)

    expect(edges).toEqual([
      'start>sale_reviewing',
      'sale_reviewing>sale_confirmed',
      'sale_confirmed>lead_returned',
      'lead_returned>sale_confirmed',
    ])
  })
})

describe('finishing', () => {
  async function decided() {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')
    await service.act(s.leadRb, deal.id, 'escalate', { reason: 'Rate' })
    await service.act(s.bm, deal.id, 'decide', { bmDecision: 'Approved' })
    return { s, deal }
  }

  it('records a win with its reason and takes it off everyone’s list', async () => {
    const { s, deal } = await decided()

    const after = await service.act(s.saleRb, deal.id, 'complete', {
      reason: 'Rate concession closed it',
    })

    expect(after.outcome).toBe('won')
    expect(after.outcomeReason).toBe('Rate concession closed it')
    expect(after.winProbability).toBe(100)
    expect(after.closedAt).not.toBeNull()
    expect(after.nextActionOwnerId).toBeNull()
  })

  it('records a loss the same way', async () => {
    const { s, deal } = await decided()

    const after = await service.act(s.saleRb, deal.id, 'close', {
      reason: 'Customer went with another bank',
    })

    expect(after.outcome).toBe('lost')
    expect(after.winProbability).toBe(0)
    expect(after.nextActionOwnerId).toBeNull()
  })

  it('refuses to finish a deal without saying why', async () => {
    const { s, deal } = await decided()
    await expect(service.act(s.saleRb, deal.id, 'complete')).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('will not reopen a finished deal', async () => {
    const { s, deal } = await decided()
    await service.act(s.saleRb, deal.id, 'complete', { reason: 'Won' })

    await expect(service.act(s.saleRb, deal.id, 'confirm')).rejects.toBeInstanceOf(
      ConflictException,
    )
    await expect(
      service.update(s.saleRb, deal.id, { value: 3_000_000_000 }),
    ).rejects.toBeInstanceOf(ConflictException)
  })
})

describe('refusals', () => {
  it('tells a stale screen apart from a forbidden move', async () => {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')

    /** Right role, wrong state — the deal moved on under them. */
    await expect(service.act(s.saleRb, deal.id, 'confirm')).rejects.toBeInstanceOf(
      ConflictException,
    )

    /** Right state, wrong role — never theirs to press. */
    await expect(
      service.act(s.saleRb, deal.id, 'escalate', { reason: 'Please' }),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('rejects an action that does not exist', async () => {
    const s = await scene()
    const deal = await aDeal(s)

    await expect(
      service.act(s.saleRb, deal.id, 'approve_everything' as never),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})

describe('edits', () => {
  it('records only the fields that actually changed', async () => {
    const s = await scene()
    const deal = await aDeal(s)

    await service.update(s.saleRb, deal.id, {
      value: 2_500_000_000,
      product: 'Mortgage',
      reason: 'Customer asked for more',
    })

    const rows = await trace(deal.id)
    expect(rows.at(-1)?.changes).toEqual({ value: [2_000_000_000, 2_500_000_000] })
    expect(rows.at(-1)?.reason).toBe('Customer asked for more')
  })

  it('writes nothing when nothing changed', async () => {
    const s = await scene()
    const deal = await aDeal(s)
    const before = (await trace(deal.id)).length

    await service.update(s.saleRb, deal.id, { value: 2_000_000_000 })

    expect(await trace(deal.id)).toHaveLength(before)
  })

  it('leaves the approval status alone', async () => {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')

    const after = await service.update(s.saleRb, deal.id, { value: 2_500_000_000 })
    expect(after.approvalStatus).toBe('sale_confirmed')

    const rows = await trace(deal.id)
    expect(rows.at(-1)).toMatchObject({
      direction: 'in_place',
      toUserId: null,
      fromStatus: 'sale_confirmed',
      toStatus: 'sale_confirmed',
    })
  })
})

describe('the whole six-step flow', () => {
  /** The scenario the entry is judged on, end to end: Hải writes it up, the
   *  team lead escalates, the branch manager decides, and the work lands back
   *  on Hải — one trace, every edge intact, every step timed. */
  it('runs from draft to decision and leaves a complete trace', async () => {
    const s = await scene()
    const deal = await aDeal(s)

    await service.act(s.saleRb, deal.id, 'confirm')
    await service.markViewed(s.leadRb, deal.id)
    await service.act(s.leadRb, deal.id, 'escalate', {
      reason: 'Rate concession beyond my authority',
    })
    const final = await service.act(s.bm, deal.id, 'decide', {
      bmDecision: 'Rate concession of 0.3% approved',
      nextAction: 'Tell the customer, close before 30 September',
      winProbability: 90,
    })

    expect(final.approvalStatus).toBe('bm_decided')
    expect(final.nextActionOwnerId).toBe(s.saleRb.id)

    const rows = await trace(deal.id)
    expect(rows.map((row) => row.toStatus)).toEqual([
      'sale_reviewing',
      'sale_confirmed',
      'lead_viewed',
      'escalated_to_bm',
      'bm_decided',
    ])

    /** Positions are unique and contiguous, so the trace draws in order. */
    expect(rows.map((row) => row.seq)).toEqual([1, 2, 3, 4, 5])

    /** Only the first event has nothing to time; every later step is measured,
     *  which is what makes the bottleneck chart possible. */
    expect(rows[0].heldMs).toBeNull()
    expect(rows.slice(1).every((row) => typeof row.heldMs === 'number')).toBe(true)

    /** Both gates are recorded as upward moves, addressed to a real person. */
    const upward = rows.filter((row) => row.direction === 'up')
    expect(upward.map((row) => row.toUserId)).toEqual([s.leadRb.id, s.bm.id])
  })

  it('shows the same trace through the history endpoint', async () => {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')

    const history = await service.history(s.saleRb, deal.id)
    expect(history.map((row) => row.seq)).toEqual([1, 2])
  })

  /** The screen shows who did each step and which tier they acted from.
   *  Returning bare ids would make it fetch the roster separately — one
   *  request per expanded row, on a list where several can be open at once. */
  it('names the person behind each step and the tier they acted from', async () => {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')
    await service.act(s.leadRb, deal.id, 'escalate', { reason: 'Rate' })

    const history = await service.history(s.saleRb, deal.id)

    expect(history.map((row) => row.actorName)).toEqual([
      s.saleRb.name,
      s.saleRb.name,
      s.leadRb.name,
    ])
    expect(history.map((row) => row.actorRole)).toEqual(['sale', 'sale', 'team_lead'])
  })

  it('names who each handover went to, and leaves it out when nobody', async () => {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')

    const history = await service.history(s.saleRb, deal.id)

    /** The opening event hands the deal to nobody; the confirmation hands it
     *  up to the team lead. */
    expect(history[0].toUserName).toBeNull()
    expect(history[1].toUserName).toBe(s.leadRb.name)
    expect(history[1].toUserRole).toBe('team_lead')
  })

  it("keeps the history of a deal out of another team's reach", async () => {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')

    await expect(service.history(s.leadSse, deal.id)).rejects.toBeInstanceOf(NotFoundException)
  })
})

describe('what is waiting on me', () => {
  it('lists only what this person owes a move on', async () => {
    const s = await scene()
    const mine = await aDeal(s)
    const other = await aDeal(s)

    await service.act(s.saleRb, other.id, 'confirm')

    const waiting = await service.list(s.saleRb, { mine: true })
    expect(waiting.rows.map((row) => row.id)).toEqual([mine.id])
  })

  it('moves to the team lead once the salesperson confirms', async () => {
    const s = await scene()
    const deal = await aDeal(s)
    await service.act(s.saleRb, deal.id, 'confirm')

    expect((await service.list(s.leadRb, { mine: true })).rows.map((row) => row.id)).toEqual([
      deal.id,
    ])
    expect((await service.list(s.saleRb, { mine: true })).rows).toEqual([])
  })
})
