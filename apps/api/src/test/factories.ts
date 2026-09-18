import { hashSync } from 'bcryptjs'
import {
  auditEvents,
  customers,
  opportunities,
  signals,
  targets,
  units,
  users,
  type AuditEvent,
  type Customer,
  type Opportunity,
  type Signal,
  type Target,
  type Unit,
  type User,
} from '../db/schema'
import { testDb } from './db'

/** Readable ids. A failure that prints `usr_3` is easier to follow back to the
 *  line that made it than one printing a UUID. Counters reset per test file,
 *  which is fine because the tables are truncated between tests anyway. */
let counter = 0
const nextId = (prefix: string) => `${prefix}_${++counter}`

/** The password every generated account shares, with the hash computed once.
 *  bcrypt is deliberately slow, and hashing per user would dominate the run. */
export const TEST_PASSWORD = 'test-password'
const TEST_PASSWORD_HASH = hashSync(TEST_PASSWORD, 4)

export async function makeUnit(overrides: Partial<Unit> = {}): Promise<Unit> {
  const id = overrides.id ?? nextId('unit')
  const [row] = await testDb
    .insert(units)
    .values({ id, code: id.toUpperCase(), name: `Unit ${id}`, ...overrides })
    .returning()
  return row
}

type MakeUser = Partial<User> & { password?: string }

/** Defaults to a salesperson, because most tests are about one.
 *
 *  A salesperson or team lead with nobody above them cannot exist — the schema
 *  refuses it — so when no manager is named, one is built above. That keeps
 *  `makeUser()` a one-liner for the many tests that only need *a* user and do
 *  not care about the tree.
 *
 *  Passing `managerId: null` explicitly is left alone, so a test can still
 *  reach for the orphan case on purpose. */
export async function makeUser(overrides: MakeUser = {}): Promise<User> {
  const { password, ...rest } = overrides
  const id = rest.id ?? nextId('usr')
  const unitId = rest.unitId ?? (await makeUnit()).id
  const role = rest.role ?? 'sale'
  const segment = role === 'bm' || role === 'admin' ? null : (rest.segment ?? 'rb')

  let managerId = rest.managerId
  if (managerId === undefined && (role === 'sale' || role === 'team_lead')) {
    const manager = await makeUser({
      unitId,
      role: role === 'sale' ? 'team_lead' : 'bm',
      segment: segment ?? undefined,
    })
    managerId = manager.id
  }

  const [row] = await testDb
    .insert(users)
    .values({
      id,
      code: rest.code ?? id.toUpperCase(),
      name: rest.name ?? `User ${id}`,
      passwordHash: password ? hashSync(password, 4) : TEST_PASSWORD_HASH,
      role,
      title: rest.title ?? 'Tester',
      ...rest,
      segment,
      managerId: managerId ?? null,
      unitId,
    })
    .returning()
  return row
}

export type Branch = {
  unit: Unit
  bm: User
  leadSse: User
  leadRb: User
  saleSse: User
  saleRb: User
}

/** The five operating accounts from the brief, wired into the same tree the
 *  seed builds: two salespeople, a team lead each, one branch manager above
 *  both.
 *
 *  Almost every scoping test needs exactly this shape — a peer to be hidden
 *  from, a manager to be visible to — so building it inline each time would
 *  bury the assertion under setup. */
export async function makeBranch(): Promise<Branch> {
  const unit = await makeUnit()
  const bm = await makeUser({ unitId: unit.id, role: 'bm', title: 'Branch manager' })
  const leadSse = await makeUser({
    unitId: unit.id,
    role: 'team_lead',
    segment: 'sse',
    managerId: bm.id,
  })
  const leadRb = await makeUser({
    unitId: unit.id,
    role: 'team_lead',
    segment: 'rb',
    managerId: bm.id,
  })
  const saleSse = await makeUser({
    unitId: unit.id,
    role: 'sale',
    segment: 'sse',
    managerId: leadSse.id,
  })
  const saleRb = await makeUser({
    unitId: unit.id,
    role: 'sale',
    segment: 'rb',
    managerId: leadRb.id,
  })
  return { unit, bm, leadSse, leadRb, saleSse, saleRb }
}

export async function makeCustomer(
  overrides: Partial<Customer> & { ownerId: string },
): Promise<Customer> {
  const id = overrides.id ?? nextId('cus')
  const [row] = await testDb
    .insert(customers)
    .values({
      id,
      code: overrides.code ?? id.toUpperCase(),
      name: overrides.name ?? `Customer ${id}`,
      segment: overrides.segment ?? 'rb',
      ...overrides,
    })
    .returning()
  return row
}

export async function makeSignal(
  overrides: Partial<Signal> & { customerId: string },
): Promise<Signal> {
  const [row] = await testDb
    .insert(signals)
    .values({
      id: overrides.id ?? nextId('sig'),
      type: overrides.type ?? 'need',
      content: overrides.content ?? 'Observed something',
      source: overrides.source ?? 'system',
      ...overrides,
    })
    .returning()
  return row
}

export async function makeOpportunity(
  overrides: Partial<Opportunity> & { customerId: string; ownerId: string },
): Promise<Opportunity> {
  const id = overrides.id ?? nextId('opp')
  const [row] = await testDb
    .insert(opportunities)
    .values({
      id,
      code: overrides.code ?? id.toUpperCase(),
      segment: overrides.segment ?? 'rb',
      product: overrides.product ?? 'Mortgage',
      need: overrides.need ?? 'Buy a home',
      value: overrides.value ?? 1_000_000_000,
      ...overrides,
    })
    .returning()
  return row
}

export async function makeTarget(
  overrides: Partial<Target> & { unitId: string },
): Promise<Target> {
  const [row] = await testDb
    .insert(targets)
    .values({
      id: overrides.id ?? nextId('tgt'),
      scope: overrides.scope ?? 'unit',
      period: overrides.period ?? '2026-Q3',
      amount: overrides.amount ?? 10_000_000_000,
      ...overrides,
    })
    .returning()
  return row
}

export async function makeAuditEvent(
  overrides: Partial<AuditEvent> & { opportunityId: string; actorId: string },
): Promise<AuditEvent> {
  const seq = overrides.seq ?? 1
  const first = seq === 1
  const direction = overrides.direction ?? 'up'

  const [row] = await testDb
    .insert(auditEvents)
    .values({
      ...overrides,
      id: overrides.id ?? nextId('aud'),
      seq,
      direction,
      toStatus: overrides.toStatus ?? 'sale_confirmed',
      /** The first event of a trace has no predecessor and nothing to time,
       *  and a handover has to name someone while an edit must not. Both are
       *  schema rules, so the defaults respect them rather than producing
       *  rows that cannot be written. */
      fromStatus: first ? null : (overrides.fromStatus ?? 'sale_reviewing'),
      heldMs: first ? null : (overrides.heldMs ?? 60_000),
      toUserId:
        direction === 'in_place' ? null : (overrides.toUserId ?? overrides.actorId),
    })
    .returning()
  return row
}
