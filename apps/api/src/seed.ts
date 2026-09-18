import './env'

import { hashSync } from 'bcryptjs'
import { createSql } from './db/db.module'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './db/schema'
import { units, users, type Level, type Role, type Segment } from './db/schema'
import { required } from './env'

/** Identifiers are hand-written and stable rather than generated, so running
 *  the seed twice updates the same rows instead of creating a second set, and
 *  so demo data written later can reference an account by a readable id. */

const UNIT_ID = 'unit_th'

type SeedUser = {
  id: string
  code: string
  name: string
  role: Role
  title: string
  level: Level
  segment: Segment | null
  managerId: string | null
}

type SeedAdmin = Omit<SeedUser, 'level'> & { level: Level | null }

/** The technical account. Kept out of SEED_USERS so it never accidentally ends
 *  up in a report: it has no segment, no manager and no career grade, and
 *  every sales query filters on SALES_ROLES anyway. */
const ADMIN: SeedAdmin = {
  id: 'usr_admin_01',
  code: 'ADMIN-01',
  name: 'Nguyễn Mạnh Tùng',
  role: 'admin',
  title: 'Quản trị hệ thống',
  level: null,
  segment: null,
  managerId: null,
}

/** The five operating accounts from the brief. Order matters: the branch
 *  manager is the root of the tree and has to exist before anyone points at
 *  them, and the `users_manager_by_role` constraint enforces that. */
const SEED_USERS: SeedUser[] = [
  {
    id: 'usr_bm_th_01',
    code: 'BM-TH-01',
    name: 'Đức Anh',
    role: 'bm',
    title: 'Giám đốc đơn vị',
    level: 'gd',
    segment: null,
    managerId: null,
  },
  {
    id: 'usr_tl_sse_01',
    code: 'TL-SSE-01',
    name: 'Bùi Phương',
    role: 'team_lead',
    title: 'Trưởng nhóm khách hàng doanh nghiệp SSE',
    level: 'tn',
    segment: 'sse',
    managerId: 'usr_bm_th_01',
  },
  {
    id: 'usr_tl_rb_01',
    code: 'TL-RB-01',
    name: 'Huy',
    role: 'team_lead',
    title: 'Trưởng nhóm khách hàng cá nhân',
    level: 'tn',
    segment: 'rb',
    managerId: 'usr_bm_th_01',
  },
  {
    id: 'usr_sale_sse_01',
    code: 'SALE-SSE-01',
    name: 'Hà',
    role: 'sale',
    title: 'Chuyên viên khách hàng doanh nghiệp SSE',
    level: 'cv2',
    segment: 'sse',
    managerId: 'usr_tl_sse_01',
  },
  {
    id: 'usr_sale_rb_01',
    code: 'SALE-RB-01',
    name: 'Hải',
    role: 'sale',
    title: 'Chuyên viên khách hàng cá nhân',
    level: 'cv2',
    segment: 'rb',
    managerId: 'usr_tl_rb_01',
  },
]

async function seed() {
  /** Every demo account shares one password. Deliberate: five people have to
   *  swap roles quickly while filming, and a forgotten password mid-take is a
   *  worse risk than a weak one in a database holding no real customers.
   *  It is never committed — it comes from .env. */
  const password = required('SEED_PASSWORD')
  const passwordHash = hashSync(password, 10)

  const sql = createSql(1)
  const db = drizzle(sql, { schema })

  try {
    await db
      .insert(units)
      .values({
        id: UNIT_ID,
        code: 'TH',
        name: 'Đơn vị TH',
        kind: 'branch',
      })
      /** Idempotent on purpose: the seed runs again every time the demo data
       *  is refreshed, and it must not fail or duplicate. */
      .onConflictDoUpdate({
        target: units.id,
        set: { code: 'TH', name: 'Đơn vị TH' },
      })

    const all = [ADMIN, ...SEED_USERS]

    for (const user of all) {
      await db
        .insert(users)
        .values({ ...user, unitId: UNIT_ID, passwordHash, active: true })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            code: user.code,
            name: user.name,
            role: user.role,
            title: user.title,
            level: user.level,
            segment: user.segment,
            managerId: user.managerId,
            passwordHash,
            updatedAt: new Date(),
          },
        })
    }

    console.log(`Seeded 1 unit and ${all.length} users.`)
    for (const user of all) {
      console.log(`  ${user.code.padEnd(12)} ${user.name.padEnd(18)} ${user.role}`)
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
