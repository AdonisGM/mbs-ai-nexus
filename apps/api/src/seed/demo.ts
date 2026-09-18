import { asc, eq, sql } from 'drizzle-orm'
import type { Db } from '../db/db.module'
import { CustomersService } from '../customers/customers.service'
import { OpportunitiesService } from '../opportunities/opportunities.service'
import { SignalsService } from '../signals/signals.service'
import { TargetsService } from '../targets/targets.service'
import { auditEvents, opportunities, users, type User } from '../db/schema'
import { ACCOUNT_IDS } from './accounts'
import { DEALS, PERIOD, RB_CUSTOMERS, SSE_CUSTOMERS, TARGETS, type SeedCustomer } from './data'

const DAY = 24 * 60 * 60 * 1000

function daysFromNow(days: number) {
  return new Date(Date.now() + days * DAY)
}

function isoDate(days: number) {
  return daysFromNow(days).toISOString().slice(0, 10)
}

/** Deterministic, so two runs of the seed produce the same demo and a
 *  rehearsal matches what was rehearsed. */
function rng(seed: number) {
  let state = seed
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648
    return state / 2_147_483_648
  }
}

/** Wipes the demo data and builds it again.
 *
 *  Deals are replayed through the real services rather than written straight
 *  into the tables. It costs more than a bulk insert and it is the whole
 *  point: the audit trail, the send-backs, the handovers and the timings come
 *  out genuine, so opening the history of a deal during the demo shows a real
 *  trace instead of an empty panel. */
export async function seedDemo(db: Db) {
  const customersService = new CustomersService(db)
  const signalsService = new SignalsService(db)
  const opportunitiesService = new OpportunitiesService(db)
  const targetsService = new TargetsService(db)

  const actors = await loadActors(db)

  await db.execute(
    sql`truncate table audit_events, opportunities, signals, customers, targets restart identity cascade`,
  )

  const customerIds = new Map<string, string>()

  for (const [segment, list, owner] of [
    ['sse', SSE_CUSTOMERS, actors.saleSse],
    ['rb', RB_CUSTOMERS, actors.saleRb],
  ] as const) {
    for (const seed of list as SeedCustomer[]) {
      const customer = await customersService.create(owner, {
        name: seed.name,
        segment,
        currentProducts: seed.currentProducts ?? [],
        revenue: seed.revenue,
        relationStage: seed.relationStage,
        attributes: seed.attributes ?? {},
        contactName: seed.contactName,
        contactPhone: seed.contactPhone,
        note: seed.note,
      })
      customerIds.set(seed.key, customer.id)

      for (const signal of seed.signals) {
        await signalsService.create(owner, customer.id, {
          type: signal.type,
          content: signal.content,
          observedAt: daysFromNow(-signal.daysAgo).toISOString(),
          rawNote: signal.rawNote,
        })
      }
    }
  }

  for (const deal of DEALS) {
    const customerId = customerIds.get(deal.customer)
    if (!customerId) throw new Error(`Unknown customer key: ${deal.customer}`)

    const owner = SSE_CUSTOMERS.some((customer) => customer.key === deal.customer)
      ? actors.saleSse
      : actors.saleRb
    const lead = owner.id === actors.saleSse.id ? actors.leadSse : actors.leadRb

    const created = await opportunitiesService.create(owner, {
      customerId,
      product: deal.product,
      need: deal.need,
      value: deal.value,
      stage: deal.stage,
      winProbability: deal.winProbability,
      dueDate: deal.dueInDays === undefined ? undefined : isoDate(deal.dueInDays),
      blockerCode: deal.blockerCode,
      blockerNote: deal.blockerNote,
      nextAction: deal.nextAction,
      supportNeeded: deal.supportNeeded,
      missingInfo: deal.missingInfo,
      confirmedData: deal.confirmedData,
    })

    for (const step of deal.script) {
      const actor =
        step.action === 'confirm' || step.action === 'complete'
          ? owner
          : step.action === 'decide'
            ? actors.bm
            : lead

      await opportunitiesService.act(actor, created.id, step.action, {
        reason: step.reason,
        ...(step.body ?? {}),
      })
    }
  }

  await seedTargets(targetsService, actors)
  await backdate(db)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(opportunities)

  return {
    customers: SSE_CUSTOMERS.length + RB_CUSTOMERS.length,
    opportunities: Number(count),
  }
}

async function seedTargets(
  service: TargetsService,
  actors: Awaited<ReturnType<typeof loadActors>>,
) {
  await service.set(actors.bm, { scope: 'unit', period: PERIOD, amount: TARGETS.unit })
  await service.set(actors.bm, {
    scope: 'unit',
    segment: 'sse',
    period: PERIOD,
    amount: TARGETS.sse,
  })
  await service.set(actors.bm, {
    scope: 'unit',
    segment: 'rb',
    period: PERIOD,
    amount: TARGETS.rb,
  })
  await service.set(actors.bm, {
    scope: 'user',
    ownerId: actors.saleSse.id,
    period: PERIOD,
    amount: TARGETS.saleSse,
  })
  await service.set(actors.bm, {
    scope: 'user',
    ownerId: actors.saleRb.id,
    period: PERIOD,
    amount: TARGETS.saleRb,
  })
}

/** Spreads each trace back across the last few weeks.
 *
 *  Replaying a deal through the services takes milliseconds, so every step
 *  would otherwise be timed at a fraction of a second and the bottleneck chart
 *  would be a flat line of zeroes. Real approvals take hours or days; this
 *  rewrites the clock so the charts show something worth reading, and
 *  recomputes `heldMs` from the new timestamps so the two never disagree.
 *
 *  Only demo data is ever touched. */
async function backdate(db: Db) {
  const deals = await db
    .select({ id: opportunities.id })
    .from(opportunities)
    .orderBy(asc(opportunities.code))

  const random = rng(20260919)

  for (const [index, deal] of deals.entries()) {
    const trace = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.opportunityId, deal.id))
      .orderBy(asc(auditEvents.seq))

    if (trace.length === 0) continue

    /** Started somewhere in the last six weeks, staggered so the deals do not
     *  all begin on the same day. */
    const start = Date.now() - (7 + index * 2 + random() * 20) * DAY
    const timed: Array<{ toStatus: string; at: Date }> = []

    let at = start
    let previous: number | null = null

    for (const event of trace) {
      if (previous !== null) {
        /** Two hours to three days between steps — the range a branch
         *  actually works in, with the odd slow one to make the bottleneck
         *  chart worth drawing. */
        at += (2 + random() * 70) * 60 * 60 * 1000
      }

      await db
        .update(auditEvents)
        .set({
          createdAt: new Date(at),
          heldMs: previous === null ? null : Math.round(at - previous),
        })
        .where(eq(auditEvents.id, event.id))

      timed.push({ toStatus: event.toStatus, at: new Date(at) })
      previous = at
    }

    /** The deal's own marks have to move with its trace, or "time from draft
     *  to confirmation" would be measured against a clock that no longer
     *  matches the log it came from. */
    const when = (...statuses: string[]) =>
      timed.find((event) => statuses.includes(event.toStatus))?.at ?? null

    await db
      .update(opportunities)
      .set({
        createdAt: new Date(start),
        draftedAt: new Date(start),
        confirmedAt: when('sale_confirmed'),
        leadActedAt: when('lead_returned', 'lead_approved', 'escalated_to_bm'),
        bmActedAt: when('bm_decided'),
        closedAt: when('completed', 'closed_lost'),
        updatedAt: new Date(at),
      })
      .where(eq(opportunities.id, deal.id))
  }
}

async function loadActors(db: Db) {
  const rows = await db.select().from(users)
  const byId = new Map(rows.map((row) => [row.id, row]))

  const pick = (id: string): User => {
    const found = byId.get(id)
    if (!found) throw new Error(`Missing account ${id}. Run the account seed first.`)
    return found
  }

  return {
    bm: pick(ACCOUNT_IDS.bm),
    leadSse: pick(ACCOUNT_IDS.leadSse),
    leadRb: pick(ACCOUNT_IDS.leadRb),
    saleSse: pick(ACCOUNT_IDS.saleSse),
    saleRb: pick(ACCOUNT_IDS.saleRb),
  }
}
