import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

/* ──────────────────────────────────────────────────────────────────────────
 * Units
 * ────────────────────────────────────────────────────────────────────────── */

/** Business unit. `parentId` points back at this table, so growing a region or
 *  area tier later is a matter of inserting rows, not changing the structure.
 *  The contest build only ever uses a single `branch` row. */
export const units = pgTable(
  'units',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    /** `branch` is the lowest tier and the only one the contest build populates. */
    kind: text('kind').notNull().default('branch'),
    parentId: text('parent_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({ columns: [t.parentId], foreignColumns: [t.id] }).onDelete('set null'),
    check('units_kind', sql`${t.kind} in ('branch', 'region', 'area')`),
  ],
)

/* ──────────────────────────────────────────────────────────────────────────
 * Users
 * ────────────────────────────────────────────────────────────────────────── */

/** Three concepts that are easy to conflate, kept apart because they serve
 *  three different jobs:
 *
 *    role   System permission. Four values, and the ONLY column authorization
 *           is allowed to read. Adding a job title never touches a guard.
 *    title  Job title shown on screen. Free text, HR can rename it any time.
 *    level  Career grade. Carries no permission at all; it exists so a team
 *           lead can compare two salespeople on the same grade, and so the
 *           "skill gap" view has something to stand on.
 *
 *  Collapsing the three into one column is the classic trap: the day someone
 *  adds a new grade, authorization has to change with it.
 *
 *  The management tree lives in `managerId`, not in `role`. That is why the
 *  contest build can give one team lead a single salesperson while a real
 *  rollout gives them eight to ten, with no code change. */
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    /** Login handle: SALE-SSE-01, TL-RB-01, BM-TH-01. */
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    passwordHash: text('password_hash').notNull(),

    /** System permission. Four values, closed set. */
    role: text('role').notNull(),
    /** Job title, for display only. Free text. */
    title: text('title').notNull(),
    /** Career grade. Never read by authorization. */
    level: text('level'),

    /** Customer segment covered. A branch manager covers none, so it is null. */
    segment: text('segment'),

    unitId: text('unit_id')
      .notNull()
      .references(() => units.id),
    /** Direct manager. The branch manager is the root, so it is null there. */
    managerId: text('manager_id'),

    joinedOn: date('joined_on'),
    /** Display order inside a team lead's roster. */
    sort: integer('sort').notNull().default(0),
    active: boolean('active').notNull().default(true),

    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({ columns: [t.managerId], foreignColumns: [t.id] }).onDelete('set null'),

    index('users_manager').on(t.managerId),
    index('users_unit_role').on(t.unitId, t.role),

    check('users_role', sql`${t.role} in ('sale', 'team_lead', 'bm', 'admin')`),
    check('users_segment', sql`${t.segment} is null or ${t.segment} in ('sse', 'rb')`),
    check(
      'users_level',
      sql`${t.level} is null or ${t.level} in ('cv1', 'cv2', 'cv3', 'cvc', 'tn', 'gd')`,
    ),

    /** Salespeople and team leads belong to a segment; a branch manager covers
     *  the whole unit and an admin sits outside the sales line entirely.
     *  Without this the SSE pipeline and the retail pipeline blend together. */
    check(
      'users_segment_by_role',
      sql`${t.role} in ('bm', 'admin') or ${t.segment} is not null`,
    ),

    /** Everyone reports to someone except the branch manager at the root and
     *  the admin, who is not part of the tree. Without this an orphaned
     *  salesperson silently drops out of every report and nobody notices. */
    check(
      'users_manager_by_role',
      sql`${t.role} in ('bm', 'admin') or ${t.managerId} is not null`,
    ),

    /** An admin is a technical account, so it sits outside the sales line for
     *  good rather than by convention: no segment to be counted under, no
     *  manager to hang off. The two checks above only stop those fields being
     *  required — this one stops them being set at all. */
    check(
      'users_admin_outside_tree',
      sql`${t.role} <> 'admin' or (${t.segment} is null and ${t.managerId} is null)`,
    ),
  ],
)

/* ──────────────────────────────────────────────────────────────────────────
 * Customers
 * ────────────────────────────────────────────────────────────────────────── */

/** A customer file. The bedrock of everything, and deliberately quiet: across
 *  the whole life of a deal this table changes about twice — when the customer
 *  is taken on, and when a product is finally sold. Everything that moves
 *  belongs in `signals` or `opportunities`.
 *
 *  It carries no approval status, so it needs no audit trail either. Only
 *  opportunities travel up the chain. */
export const customers = pgTable(
  'customers',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    segment: text('segment').notNull(),

    /** The salesperson who holds this relationship. Row-level scoping reads
     *  this together with `users.manager_id`: a team lead sees their own
     *  people's customers, never a peer's. */
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),

    /** MSB products already in use. An array rather than a join table because
     *  nothing is ever queried by product in this build, and a join table
     *  would cost a migration and two screens for no gain. */
    currentProducts: text('current_products').array().notNull().default(sql`'{}'`),

    /** Turnover in whole đồng. `bigint` in Postgres, `mode: 'number'` in
     *  TypeScript: the values sit far inside what a double holds exactly,
     *  while a real BigInt would refuse to serialize to JSON on the way out.
     *  Arithmetic on any amount goes through lib/money.ts, never raw floats. */
    revenue: bigint('revenue', { mode: 'number' }),

    /** Where the relationship stands with MSB, free text for now. */
    relationStage: text('relation_stage'),

    /** Fields that differ by segment — cash-flow share moving to another bank
     *  for SSE, repayment source and collateral for retail. They live here
     *  rather than as columns because half of them would be null for half the
     *  rows, and because the sales team can add one without a migration.
     *
     *  The rule for choosing: anything filtered, summed or shown in a list
     *  column gets a real column; anything read only on the detail screen
     *  goes in here. */
    attributes: jsonb('attributes').notNull().default(sql`'{}'::jsonb`),

    contactName: text('contact_name'),
    contactPhone: text('contact_phone'),
    note: text('note'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('customers_owner').on(t.ownerId),
    index('customers_segment').on(t.segment),
    check('customers_segment', sql`${t.segment} in ('sse', 'rb')`),
    check('customers_revenue', sql`${t.revenue} is null or ${t.revenue} >= 0`),
  ],
)

/* ──────────────────────────────────────────────────────────────────────────
 * Signals
 * ────────────────────────────────────────────────────────────────────────── */

/** What was just observed about a customer: cash moving to another bank, a
 *  rate being compared, a deadline appearing. Where `customers` holds traits
 *  that barely change, this holds events that do.
 *
 *  It is the model's raw material. Generating a draft reads the customer for
 *  context and the signals for what has actually been happening; without this
 *  table the model only ever sees a static file.
 *
 *  Append-only. A signal that turns out to be wrong is corrected by writing a
 *  newer one over the top, never by editing or deleting: the mistaken reading
 *  is itself evidence, and it feeds the recurring-blocker view the branch
 *  manager works from.
 *
 *  Signals hang off the customer, not off a deal, because one observation can
 *  feed several — "cash moving to another bank" is both a current-account
 *  opportunity and a working-capital one. */
export const signals = pgTable(
  'signals',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),

    type: text('type').notNull(),
    /** The observation itself, one sentence. */
    content: text('content').notNull(),
    source: text('source').notNull().default('sale'),

    /** When it was observed, which is not when it was typed up. A meeting on
     *  Friday entered on Monday has to sort by the Friday. */
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull().defaultNow(),

    /** Null when the system or the model wrote the row. */
    authorId: text('author_id').references(() => users.id),

    /** The salesperson's own sentence, kept verbatim.
     *
     *  This is the evidence behind "the model proposes, a person confirms":
     *  it can be put side by side with what the model inferred from it. Also
     *  the honest record if the model reads a sentence wrongly. */
    rawNote: text('raw_note'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /** The customer timeline, newest first — the one query this table serves. */
    index('signals_customer_observed').on(t.customerId, t.observedAt),
    check(
      'signals_type',
      sql`${t.type} in ('cash_flow', 'product_gap', 'need', 'competition', 'deadline', 'documents', 'other')`,
    ),
    check('signals_source', sql`${t.source} in ('sale', 'system', 'ai')`),
    /** A signal written by a person has to say who. Only the system and the
     *  model are allowed to be anonymous. */
    check(
      'signals_author_by_source',
      sql`${t.source} <> 'sale' or ${t.authorId} is not null`,
    ),
  ],
)

/* ──────────────────────────────────────────────────────────────────────────
 * Opportunities
 * ────────────────────────────────────────────────────────────────────────── */

/** A deal: one customer, one product, one need. The centre of the system and
 *  the only thing that travels up the chain.
 *
 *  The unit that gets approved, counted into the pipeline and added to a
 *  target is this, not the customer. One customer can have several open at
 *  once — a mortgage and a credit card are two deals on one file — which is
 *  why the pipeline counts rows here and never counts people.
 *
 *  Three axes run through this table and must not be collapsed into one:
 *
 *    stage           how far the customer has come. Their journey.
 *    approvalStatus  how far the paperwork has come inside MSB. One-way.
 *    nextAction      who has to do something next. Runs both ways.
 *
 *  A deal can be in `negotiation` with the customer while the paperwork has
 *  only reached `sale_confirmed` at home, and the next action can bounce back
 *  down to the salesperson without the approval status ever going backwards. */
export const opportunities = pgTable(
  'opportunities',
  {
    id: text('id').primaryKey(),
    /** Human-facing reference, OPP-2026-0001. People say it out loud. */
    code: text('code').notNull().unique(),

    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),

    /** Copied from the customer rather than joined. Every pipeline, gap and
     *  forecast query filters on it, and the branch manager's screen compares
     *  the two segments side by side; paying for a join on the hottest query
     *  in the app to avoid a column that changes almost never is a bad trade.
     *  Whatever moves a customer between segments has to update this too. */
    segment: text('segment').notNull(),

    product: text('product').notNull(),
    need: text('need').notNull(),
    /** Deal size in whole đồng. Arithmetic goes through lib/money.ts. */
    value: bigint('value', { mode: 'number' }).notNull(),

    stage: text('stage').notNull().default('prospecting'),

    /** What a person has checked and stands behind. */
    confirmedData: jsonb('confirmed_data').notNull().default(sql`'{}'::jsonb`),
    /** What the model inferred and nobody has confirmed yet.
     *
     *  Two columns, never one. This separation is the whole argument of the
     *  entry — the model proposes, a person confirms — and the screen shows
     *  them in two different colours. Merging them loses the point and loses
     *  the answer to "how do you keep a human in control". */
    aiHypothesis: jsonb('ai_hypothesis').notNull().default(sql`'{}'::jsonb`),
    /** What is still unknown. Also what a team lead sends a deal back for. */
    missingInfo: text('missing_info').array().notNull().default(sql`'{}'`),

    /** Why the deal is stuck, as a code so identical blockers group together.
     *
     *  Free text here would have killed the branch manager's best screen: the
     *  point is to see that eleven deals worth 47 billion are all stuck on
     *  the same thing, which is a process problem, not eleven people's
     *  problem. `select blocker_code, count(*), sum(value) ... group by 1`
     *  only works if the values are a closed set. */
    blockerCode: text('blocker_code'),
    /** The specifics in the salesperson's own words. */
    blockerNote: text('blocker_note'),

    nextAction: text('next_action'),
    /** Who owes the next move. Points at the salesperson most of the time,
     *  but a branch manager's decision hands work back down through it, which
     *  is what closes the loop instead of ending at a dashboard. */
    nextActionOwnerId: text('next_action_owner_id').references(() => users.id),

    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    /** A date, not a timestamp: a bank deadline is a day, and comparing days
     *  keeps "overdue" from flipping with the clock. */
    dueDate: date('due_date'),

    /** Conversion chance, 0-100. Defaults follow the stage but a person may
     *  override it — they have met the customer and the table has not. */
    winProbability: integer('win_probability').notNull().default(10),

    supportNeeded: text('support_needed'),
    /** What the branch manager actually granted, e.g. a rate concession. */
    bmDecision: text('bm_decision'),

    approvalStatus: text('approval_status').notNull().default('sale_reviewing'),

    outcome: text('outcome').notNull().default('open'),
    outcomeReason: text('outcome_reason'),

    /** Typed by a person or drafted by the model. This one column is the
     *  before/after axis of the whole trial: the same system, measured twice. */
    createdVia: text('created_via').notNull().default('manual'),

    /** Timing marks, so the trial numbers are measured rather than estimated.
     *  drafted → confirmed is what a deal costs a salesperson; confirmed →
     *  lead acted is how long support takes to arrive. */
    draftedAt: timestamp('drafted_at', { withTimezone: true }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    leadActedAt: timestamp('lead_acted_at', { withTimezone: true }),
    bmActedAt: timestamp('bm_acted_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('opportunities_customer').on(t.customerId),
    /** A salesperson's own list, and a team lead's inbox of confirmed deals. */
    index('opportunities_owner_status').on(t.ownerId, t.approvalStatus),
    /** The pipeline, per segment. */
    index('opportunities_segment_stage').on(t.segment, t.stage),
    index('opportunities_due').on(t.dueDate),
    /** "Today's priorities" for whoever is signed in. */
    index('opportunities_next_action').on(t.nextActionOwnerId, t.dueDate),
    /** Recurring blockers, the branch manager's view. */
    index('opportunities_blocker').on(t.blockerCode),

    check('opportunities_segment', sql`${t.segment} in ('sse', 'rb')`),
    check('opportunities_value', sql`${t.value} > 0`),
    check(
      'opportunities_win_probability',
      sql`${t.winProbability} between 0 and 100`,
    ),
    check(
      'opportunities_stage',
      sql`${t.stage} in ('prospecting', 'discovery', 'proposal', 'negotiation', 'documentation', 'closing')`,
    ),
    check(
      'opportunities_approval_status',
      sql`${t.approvalStatus} in ('ai_drafted', 'sale_reviewing', 'sale_confirmed', 'lead_viewed', 'lead_returned', 'lead_approved', 'escalated_to_bm', 'bm_decided', 'completed', 'closed_lost')`,
    ),
    check('opportunities_outcome', sql`${t.outcome} in ('open', 'won', 'lost')`),
    check('opportunities_created_via', sql`${t.createdVia} in ('manual', 'ai')`),
    check(
      'opportunities_blocker_code',
      sql`${t.blockerCode} is null or ${t.blockerCode} in ('rate', 'speed', 'experience', 'documents', 'collateral', 'policy', 'competitor', 'customer_hesitation', 'other')`,
    ),

    /** A closed deal has to say why. The brief asks for it, and a pipeline
     *  full of losses with no reason teaches nobody anything. */
    check(
      'opportunities_outcome_reason',
      sql`${t.outcome} = 'open' or ${t.outcomeReason} is not null`,
    ),
  ],
)

/* ──────────────────────────────────────────────────────────────────────────
 * Audit events
 * ────────────────────────────────────────────────────────────────────────── */

/** Every move a deal makes: who, when, what changed, and why.
 *
 *  Append-only, written inside the same transaction as the change it records,
 *  so the log cannot disagree with the row it describes.
 *
 *  This table is also the data behind the approval-process charts, which is
 *  why it carries two columns a plain audit trail would not:
 *
 *    heldMs  how long the deal sat in `fromStatus` before this move. Computed
 *            once at write time. Without it, every timing chart becomes a
 *            window function over the whole log, recomputed on each render,
 *            and "average time from confirmed to supported" stops being a
 *            one-line query.
 *    seq     position within this deal's own history. Two events can land in
 *            the same millisecond; a trace drawn from timestamps alone would
 *            then render them in either order.
 *
 *  Between them the table answers, in one SELECT each: how many deals flowed
 *  from each status to each other status (a Sankey, loop-backs included),
 *  where deals sit longest, how often work is sent back, and the full trace
 *  of any single deal. */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    opportunityId: text('opportunity_id')
      .notNull()
      .references(() => opportunities.id, { onDelete: 'cascade' }),

    /** Position in this deal's history, starting at 1. */
    seq: integer('seq').notNull(),

    /** Who did it. An admin acting on someone's behalf lands here like anyone
     *  else — that is the point of keeping the technical account inside the
     *  same log rather than beside it. */
    actorId: text('actor_id')
      .notNull()
      .references(() => users.id),

    /** Null only on the first event, when the deal comes into being. */
    fromStatus: text('from_status'),
    toStatus: text('to_status').notNull(),

    /** Which way the deal moved. Up is asking for something — a salesperson
     *  confirming, a team lead escalating — and is gated. Down is handing work
     *  out, and is not: taking on responsibility needs no permission.
     *  `in_place` is an edit that changed no status. */
    direction: text('direction').notNull(),
    /** Who the deal was handed to, when it was handed to anyone. Drives the
     *  team lead's "needs support" list and a salesperson's day. */
    toUserId: text('to_user_id').references(() => users.id),

    /** Milliseconds spent in `fromStatus`. Null on the first event. */
    heldMs: bigint('held_ms', { mode: 'number' }),

    /** Field-level before/after, e.g. { "value": [2000000000, 2500000000] }. */
    changes: jsonb('changes').notNull().default(sql`'{}'::jsonb`),
    /** Why. Required when sending a deal back — the brief asks for it, and a
     *  rejection with no reason just costs the salesperson another round. */
    reason: text('reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /** One deal's trace, in order. Also enforces that no two events claim the
     *  same position. */
    uniqueIndex('audit_events_trace').on(t.opportunityId, t.seq),
    /** Transition counts and per-step timings, for the flow charts. */
    index('audit_events_transition').on(t.fromStatus, t.toStatus),
    /** Anything waiting on a given person, newest first. */
    index('audit_events_to_user').on(t.toUserId, t.createdAt),
    index('audit_events_created').on(t.createdAt),

    check('audit_events_seq', sql`${t.seq} >= 1`),
    check('audit_events_direction', sql`${t.direction} in ('up', 'down', 'in_place')`),
    check('audit_events_held_ms', sql`${t.heldMs} is null or ${t.heldMs} >= 0`),

    /** The first event is the only one allowed to have no predecessor, and it
     *  is also the only one with nothing to time. Keeping these two facts
     *  locked together stops a gap appearing in the middle of a trace, which
     *  would quietly bend every duration drawn from it. */
    check(
      'audit_events_first_event',
      sql`(${t.fromStatus} is null) = (${t.seq} = 1) and (${t.heldMs} is null) = (${t.seq} = 1)`,
    ),

    /** A handover has to name someone; an in-place edit must not. */
    check(
      'audit_events_to_user_by_direction',
      sql`case when ${t.direction} = 'in_place' then ${t.toUserId} is null else ${t.toUserId} is not null end`,
    ),
  ],
)

/* ──────────────────────────────────────────────────────────────────────────
 * Sessions
 * ────────────────────────────────────────────────────────────────────────── */

/** The cookie carries the raw token; the table stores only its hash, so
 *  reading the database straight does not let anyone forge a session.
 *
 *  One difference from the `home` version: no `credentialId`, because login
 *  here is a password rather than a passkey. Making five people enrol a
 *  WebAuthn device before filming is a risk this project does not need. */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userAgent: text('user_agent'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('sessions_user').on(t.userId)],
)

/* ──────────────────────────────────────────────────────────────────────────
 * Inferred types and enums
 * ────────────────────────────────────────────────────────────────────────── */

export type Unit = typeof units.$inferSelect
export type User = typeof users.$inferSelect
export type Session = typeof sessions.$inferSelect
export type Customer = typeof customers.$inferSelect
export type Signal = typeof signals.$inferSelect

/** What kind of thing was observed. The list comes straight from the two
 *  customer scenarios in the brief; `other` is the escape hatch so a
 *  salesperson is never blocked from recording something real. */
export const SIGNAL_TYPES = [
  'cash_flow',
  'product_gap',
  'need',
  'competition',
  'deadline',
  'documents',
  'other',
] as const
export type SignalType = (typeof SIGNAL_TYPES)[number]

export const SIGNAL_SOURCES = ['sale', 'system', 'ai'] as const
export type SignalSource = (typeof SIGNAL_SOURCES)[number]

export type Opportunity = typeof opportunities.$inferSelect

/** How far the customer has come. Their journey, not the paperwork's. */
export const STAGES = [
  'prospecting',
  'discovery',
  'proposal',
  'negotiation',
  'documentation',
  'closing',
] as const
export type Stage = (typeof STAGES)[number]

/** Default conversion chance per stage, and the only input to the forecast
 *  besides deal size. A person may override it on any single deal.
 *
 *  These numbers decide every figure on the branch manager's screen, so they
 *  are a business decision, not a technical one — they need signing off by
 *  someone who actually runs a branch before the trial. */
export const STAGE_WIN_PROBABILITY: Record<Stage, number> = {
  prospecting: 10,
  discovery: 25,
  proposal: 50,
  negotiation: 70,
  documentation: 85,
  closing: 100,
}

/** The ten approval states from the brief, in order.
 *
 *  Internal vocabulary only: nobody ever picks one from a dropdown. A person
 *  presses "Confirm" or "Send back" and the status is the consequence. Two of
 *  these are the gates that decide what the tier above can see at all. */
export const APPROVAL_STATUSES = [
  'ai_drafted',
  'sale_reviewing',
  'sale_confirmed',
  'lead_viewed',
  'lead_returned',
  'lead_approved',
  'escalated_to_bm',
  'bm_decided',
  'completed',
  'closed_lost',
] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

/** A team lead sees nothing before this point — drafts stay private to the
 *  salesperson who wrote them. */
export const VISIBLE_TO_LEAD: readonly ApprovalStatus[] = [
  'sale_confirmed',
  'lead_viewed',
  'lead_returned',
  'lead_approved',
  'escalated_to_bm',
  'bm_decided',
  'completed',
  'closed_lost',
]

/** A branch manager opens a deal only once it has been escalated. They still
 *  see every VISIBLE_TO_LEAD row in the totals — the pipeline would be short
 *  otherwise — but the list they can act on is this one. */
export const VISIBLE_TO_BM: readonly ApprovalStatus[] = [
  'escalated_to_bm',
  'bm_decided',
  'completed',
  'closed_lost',
]

export const OUTCOMES = ['open', 'won', 'lost'] as const
export type Outcome = (typeof OUTCOMES)[number]

export const CREATED_VIA = ['manual', 'ai'] as const
export type CreatedVia = (typeof CREATED_VIA)[number]

/** Why a deal is stuck. A closed set so identical blockers group together
 *  across the branch — the first three come straight from the brief's two
 *  customer scenarios. */
export type AuditEvent = typeof auditEvents.$inferSelect

/** Which way a deal moved. Asking upward is gated by the two visibility
 *  gates; handing work downward is not. */
export const DIRECTIONS = ['up', 'down', 'in_place'] as const
export type Direction = (typeof DIRECTIONS)[number]

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
export type BlockerCode = (typeof BLOCKER_CODES)[number]

/** The four roles. Authorization reads this and nothing else. */
export const ROLES = ['sale', 'team_lead', 'bm', 'admin'] as const
export type Role = (typeof ROLES)[number]

/** The roles that make up the sales line, in reporting order.
 *
 *  Every query that counts people, builds a pipeline, sums a target or fills a
 *  dashboard must filter on this list rather than on the whole users table.
 *  An admin is a technical account: leaving it in would make the branch
 *  manager's unit look one head larger and skew every per-person average.
 *  Admin actions still land in the audit log like anyone else's. */
export const SALES_ROLES = ['bm', 'team_lead', 'sale'] as const
export type SalesRole = (typeof SALES_ROLES)[number]

export function isSalesRole(role: string): role is SalesRole {
  return (SALES_ROLES as readonly string[]).includes(role)
}

/** SSE covers small businesses and household traders, RB covers individuals. */
export const SEGMENTS = ['sse', 'rb'] as const
export type Segment = (typeof SEGMENTS)[number]

/** Career grades. Placeholder list — replace both this constant and the
 *  `users_level` check once MSB's real grade ladder is confirmed. */
export const LEVELS = ['cv1', 'cv2', 'cv3', 'cvc', 'tn', 'gd'] as const
export type Level = (typeof LEVELS)[number]

/* No display labels live here, and none live anywhere else in the API.
 * The API speaks codes — `sale`, `sse`, `cv1` — and the web app owns the
 * dictionary that turns them into words. That keeps every user-facing string
 * in one place, so adding English later is a second dictionary file rather
 * than a sweep through controllers. See apps/web/src/i18n. */
