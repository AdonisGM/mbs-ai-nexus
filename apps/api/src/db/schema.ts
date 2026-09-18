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
