import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { and, asc, count, desc, eq, isNull, max, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { customerScope, opportunityScope, type OpportunityView } from '../auth/scope'
import { DB, type Db } from '../db/db.module'
import {
  STAGE_WIN_PROBABILITY,
  auditEvents,
  customers,
  opportunities,
  users,
  type ApprovalStatus,
  type Opportunity,
  type Role,
  type Stage,
  type User,
} from '../db/schema'
import type { ActDto, CreateOpportunityDto, ListOpportunitiesDto, UpdateOpportunityDto } from './dto'
import { actionsFor, allows, findTransition, type ActionName } from './transitions'

export const DEFAULT_PAGE_SIZE = 25

/** Fields worth recording a before/after for. Timestamps and the status are
 *  left out: the status is already the point of the row, and the timestamps
 *  are noise that would bury the change someone actually made. */
const TRACKED = [
  'product',
  'need',
  'value',
  'stage',
  'winProbability',
  'dueDate',
  'blockerCode',
  'blockerNote',
  'nextAction',
  'supportNeeded',
  'missingInfo',
  'confirmedData',
] as const

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

@Injectable()
export class OpportunitiesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(user: User, query: ListOpportunitiesDto, view: OpportunityView = 'actionable') {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE

    const parts: (SQL | undefined)[] = [opportunityScope(this.db, user, view)]
    if (query.segment) parts.push(eq(opportunities.segment, query.segment))
    if (query.stage) parts.push(eq(opportunities.stage, query.stage))
    if (query.approvalStatus) parts.push(eq(opportunities.approvalStatus, query.approvalStatus))
    if (query.ownerId) parts.push(eq(opportunities.ownerId, query.ownerId))
    if (query.customerId) parts.push(eq(opportunities.customerId, query.customerId))
    /** "Today's priorities": whatever is sitting on this person right now. */
    if (query.mine) parts.push(eq(opportunities.nextActionOwnerId, user.id))

    const defined = parts.filter((part): part is SQL => part !== undefined)
    const where = defined.length > 0 ? and(...defined) : undefined

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(opportunities)
        .where(where)
        /** Deadline first, nulls last: what is due drives the day. */
        .orderBy(sql`${opportunities.dueDate} asc nulls last`, desc(opportunities.updatedAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db.select({ total: count() }).from(opportunities).where(where),
    ])

    return {
      rows: rows.map((row) => ({
        ...row,
        /** Carried on every row, not just on a single fetch. The buttons sit
         *  in the expanded row, and asking the server per row for its own
         *  buttons is a request per row on a list built to open several. */
        actions: actionsFor(user.role as Role, row.approvalStatus as ApprovalStatus),
      })),
      total,
      page,
      pageSize,
    }
  }

  /** One deal, plus the buttons this person may press on it.
   *
   *  The available actions come from the table rather than the screen, so a
   *  rule added there reaches every screen at once and no button can be shown
   *  that the server would then refuse. */
  async get(user: User, id: string) {
    const [row] = await this.db
      .select()
      .from(opportunities)
      .where(and(eq(opportunities.id, id), opportunityScope(this.db, user, 'actionable')))
      .limit(1)

    if (!row) throw new NotFoundException('opportunity_not_found')

    return {
      ...row,
      actions: actionsFor(user.role as Role, row.approvalStatus as ApprovalStatus),
    }
  }

  async create(user: User, body: CreateOpportunityDto): Promise<Opportunity> {
    /** Read through the customer scope, so a deal cannot be attached to a file
     *  the caller is not allowed to see. */
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, body.customerId), customerScope(this.db, user)))
      .limit(1)

    if (!customer) throw new NotFoundException('customer_not_found')

    const stage = (body.stage ?? 'prospecting') as Stage

    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(opportunities)
        .values({
          id: randomUUID(),
          code: await this.nextCode(tx),
          customerId: customer.id,
          /** Copied from the customer: the pipeline filters on it constantly,
           *  and a deal must never drift into the other segment's numbers. */
          segment: customer.segment,
          ownerId: customer.ownerId,
          product: body.product,
          need: body.need,
          value: body.value,
          stage,
          winProbability: body.winProbability ?? STAGE_WIN_PROBABILITY[stage],
          dueDate: body.dueDate ?? null,
          blockerCode: body.blockerCode ?? null,
          blockerNote: body.blockerNote ?? null,
          nextAction: body.nextAction ?? null,
          nextActionOwnerId: customer.ownerId,
          supportNeeded: body.supportNeeded ?? null,
          confirmedData: body.confirmedData ?? {},
          missingInfo: body.missingInfo ?? [],
          approvalStatus: 'sale_reviewing',
          createdVia: 'manual',
          draftedAt: new Date(),
        })
        .returning()

      await this.writeEvent(tx, {
        opportunityId: row.id,
        actorId: user.id,
        fromStatus: null,
        toStatus: 'sale_reviewing',
        direction: 'in_place',
        toUserId: null,
      })

      return row
    })
  }

  /** An edit in place. Records what changed, and never touches the status. */
  async update(user: User, id: string, body: UpdateOpportunityDto): Promise<Opportunity> {
    const before = await this.get(user, id)
    this.assertOpen(before.approvalStatus as ApprovalStatus)

    const patch: Record<string, unknown> = {}
    for (const field of TRACKED) {
      const value = (body as Record<string, unknown>)[field]
      if (value !== undefined) patch[field] = value
    }

    if (Object.keys(patch).length === 0) return before

    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(opportunities)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(opportunities.id, id))
        .returning()

      const changes = diff(before, row)
      if (Object.keys(changes).length > 0) {
        await this.writeEvent(tx, {
          opportunityId: id,
          actorId: user.id,
          fromStatus: before.approvalStatus as ApprovalStatus,
          toStatus: before.approvalStatus as ApprovalStatus,
          direction: 'in_place',
          toUserId: null,
          changes,
          reason: body.reason ?? null,
        })
      }

      return row
    })
  }

  /** Presses a button.
   *
   *  Everything the move implies happens in one transaction: the status, the
   *  timing marks, who owes the next move, and the audit row. Splitting them
   *  is how a log ends up disagreeing with the record it describes. */
  async act(user: User, id: string, action: ActionName, body: ActDto = {}): Promise<Opportunity> {
    const before = await this.get(user, id)
    const from = before.approvalStatus as ApprovalStatus

    const transition = findTransition(action)
    if (!transition) throw new BadRequestException('unknown_action')

    if (!allows(transition, user.role as Role, from)) {
      /** Two different failures, kept apart because they mean different things
       *  to whoever hits them: the deal has moved on under you, versus this
       *  was never yours to press. */
      const reachable = transition.from.includes(from)
      throw reachable
        ? new ForbiddenException('action_not_allowed_for_role')
        : new ConflictException('action_not_allowed_from_status')
    }

    if (transition.requiresReason && !body.reason?.trim()) {
      throw new BadRequestException('reason_required')
    }

    const recipientId = await this.resolveRecipient(before, transition.handTo)
    if (transition.handTo !== 'none' && !recipientId) {
      throw new BadRequestException('no_recipient_above_owner')
    }

    return this.db.transaction(async (tx) => {
      const now = new Date()
      const patch: Record<string, unknown> = {
        approvalStatus: transition.to,
        updatedAt: now,
      }

      if (body.winProbability !== undefined) patch.winProbability = body.winProbability
      if (body.nextAction !== undefined) patch.nextAction = body.nextAction
      if (body.dueDate !== undefined) patch.dueDate = body.dueDate
      if (body.missingInfo !== undefined) patch.missingInfo = body.missingInfo

      switch (action) {
        case 'confirm':
          /** First confirmation only: the mark measures how long the first
           *  draft took, and a resubmission after a send-back would otherwise
           *  overwrite it with a much smaller number. */
          if (!before.confirmedAt) patch.confirmedAt = now
          /** Confirming is standing behind it, so nothing is outstanding. */
          patch.missingInfo = body.missingInfo ?? []
          break

        case 'send_back':
        case 'coach':
        case 'escalate':
          patch.leadActedAt = now
          break

        case 'decide':
          patch.bmActedAt = now
          if (body.bmDecision !== undefined) patch.bmDecision = body.bmDecision
          break

        case 'complete':
          patch.outcome = 'won'
          patch.outcomeReason = body.reason
          patch.closedAt = now
          patch.winProbability = 100
          patch.stage = 'closing'
          break

        case 'close':
          patch.outcome = 'lost'
          patch.outcomeReason = body.reason
          patch.closedAt = now
          patch.winProbability = 0
          break
      }

      /** A finished deal owes nobody anything, so it stops appearing in
       *  anyone's day. */
      patch.nextActionOwnerId =
        transition.handTo === 'none'
          ? action === 'view'
            ? before.nextActionOwnerId
            : null
          : recipientId

      const [row] = await tx
        .update(opportunities)
        .set(patch)
        .where(eq(opportunities.id, id))
        .returning()

      await this.writeEvent(tx, {
        opportunityId: id,
        actorId: user.id,
        fromStatus: from,
        toStatus: transition.to,
        direction: transition.direction,
        toUserId: transition.handTo === 'none' ? null : recipientId,
        changes: diff(before, row),
        reason: body.reason ?? null,
      })

      /** Opening a deal clears the badge that brought you here. */
      if (action === 'view') await this.markHandoversRead(tx, id, user.id)

      return row
    })
  }

  /** Called when a team lead opens a confirmed deal. Moves it to `lead_viewed`
   *  the first time and clears their badge; after that it only clears badges.
   *
   *  Separate from `act` because it is a side effect of looking, not a button,
   *  and it must never fail a page load. */
  async markViewed(user: User, id: string) {
    const deal = await this.get(user, id)

    if (user.role === 'team_lead' && deal.approvalStatus === 'sale_confirmed') {
      return this.act(user, id, 'view')
    }

    await this.db.transaction((tx) => this.markHandoversRead(tx, id, user.id))
    return deal
  }

  /** The full trace of one deal, oldest first — the data behind the approval
   *  charts and the history panel.
   *
   *  Names and roles come back with it rather than as bare ids. The screen
   *  shows who did each step and which tier they were acting from, and making
   *  it fetch the roster separately to find that out would mean one request
   *  per expanded row on a list where several can be open at once. */
  async history(user: User, id: string) {
    await this.get(user, id)

    const actor = alias(users, 'actor')
    const recipient = alias(users, 'recipient')

    return this.db
      .select({
        id: auditEvents.id,
        seq: auditEvents.seq,
        fromStatus: auditEvents.fromStatus,
        toStatus: auditEvents.toStatus,
        direction: auditEvents.direction,
        heldMs: auditEvents.heldMs,
        readAt: auditEvents.readAt,
        changes: auditEvents.changes,
        reason: auditEvents.reason,
        createdAt: auditEvents.createdAt,
        actorId: auditEvents.actorId,
        actorName: actor.name,
        actorRole: actor.role,
        toUserId: auditEvents.toUserId,
        toUserName: recipient.name,
        toUserRole: recipient.role,
      })
      .from(auditEvents)
      .innerJoin(actor, eq(actor.id, auditEvents.actorId))
      .leftJoin(recipient, eq(recipient.id, auditEvents.toUserId))
      .where(eq(auditEvents.opportunityId, id))
      .orderBy(asc(auditEvents.seq))
  }

  private async markHandoversRead(tx: Tx, opportunityId: string, userId: string) {
    await tx
      .update(auditEvents)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(auditEvents.opportunityId, opportunityId),
          eq(auditEvents.toUserId, userId),
          isNull(auditEvents.readAt),
        ),
      )
  }

  /** Writes one row of the trace.
   *
   *  `seq` and `heldMs` are computed here rather than at read time because
   *  every timing chart depends on them, and a window function over the whole
   *  log on each render is the difference between a query and a report. */
  private async writeEvent(
    tx: Tx,
    input: {
      opportunityId: string
      actorId: string
      fromStatus: ApprovalStatus | null
      toStatus: ApprovalStatus
      direction: 'up' | 'down' | 'in_place'
      toUserId: string | null
      changes?: Record<string, unknown>
      reason?: string | null
    },
  ) {
    const [previous] = await tx
      .select({ seq: max(auditEvents.seq), at: max(auditEvents.createdAt) })
      .from(auditEvents)
      .where(eq(auditEvents.opportunityId, input.opportunityId))

    const seq = (previous?.seq ?? 0) + 1
    const heldMs = previous?.at ? Date.now() - previous.at.getTime() : null

    await tx.insert(auditEvents).values({
      id: randomUUID(),
      opportunityId: input.opportunityId,
      seq,
      actorId: input.actorId,
      /** The schema ties "first event" to "nothing to time", so the first row
       *  reports no predecessor whatever the caller passed. */
      fromStatus: seq === 1 ? null : input.fromStatus,
      toStatus: input.toStatus,
      direction: input.direction,
      toUserId: input.toUserId,
      heldMs: seq === 1 ? null : heldMs,
      changes: input.changes ?? {},
      reason: input.reason ?? null,
    })
  }

  /** Who the deal lands on. Derived from the deal's own owner rather than from
   *  whoever pressed the button, so an admin unsticking a demo hands it to the
   *  salesperson's team lead and not to their own. */
  private async resolveRecipient(
    deal: Opportunity,
    handTo: 'owner' | 'lead' | 'bm' | 'none',
  ): Promise<string | null> {
    if (handTo === 'none') return null
    if (handTo === 'owner') return deal.ownerId

    const [owner] = await this.db
      .select({ managerId: users.managerId })
      .from(users)
      .where(eq(users.id, deal.ownerId))
      .limit(1)

    if (!owner?.managerId) return null
    if (handTo === 'lead') return owner.managerId

    const [lead] = await this.db
      .select({ managerId: users.managerId })
      .from(users)
      .where(eq(users.id, owner.managerId))
      .limit(1)

    return lead?.managerId ?? null
  }

  private assertOpen(status: ApprovalStatus) {
    if (status === 'completed' || status === 'closed_lost') {
      throw new ConflictException('opportunity_is_closed')
    }
  }

  /** OPP-2026-0001, numbered per year so the code says when it started. */
  private async nextCode(tx: Tx): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `OPP-${year}-`

    const [row] = await tx
      .select({
        highest: sql<number>`coalesce(max((substring(${opportunities.code} from '[0-9]+$'))::int), 0)`,
      })
      .from(opportunities)
      .where(sql`${opportunities.code} like ${prefix + '%'}`)

    return `${prefix}${String(Number(row?.highest ?? 0) + 1).padStart(4, '0')}`
  }
}

/** Before/after for the fields worth tracking, as `{ field: [was, now] }`.
 *
 *  Compared as JSON so arrays and objects — `missingInfo`, `confirmedData` —
 *  do not register a change every time they are rewritten with equal contents,
 *  which would fill the history with rows nobody made. */
function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changes: Record<string, [unknown, unknown]> = {}

  for (const field of TRACKED) {
    const was = before[field]
    const now = after[field]
    if (JSON.stringify(was ?? null) !== JSON.stringify(now ?? null)) {
      changes[field] = [was ?? null, now ?? null]
    }
  }

  return changes
}
