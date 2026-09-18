import '../env'

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { join } from 'node:path'

/** Creates the test database if it is missing and brings it up to the current
 *  migration, once per run.
 *
 *  Tests talk to a real Postgres rather than a mocked client. Much of what
 *  makes this schema correct lives in check constraints — a closed deal must
 *  carry a reason, an audit trace cannot have a hole in it, two targets cannot
 *  describe the same thing — and a mock would assert none of it while looking
 *  like it did. Drizzle's chained builder is also miserable to fake convincingly.
 *
 *  The cost is a running container, which `pnpm db:up` already provides. */
export default async function setup() {
  const url = testDatabaseUrl()
  const { database, adminUrl } = splitDatabase(url)

  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} })
  try {
    const [existing] = await admin`select 1 from pg_database where datname = ${database}`
    if (!existing) await admin.unsafe(`create database "${database}"`)
  } finally {
    await admin.end({ timeout: 5 })
  }

  const sql = postgres(url, { max: 1, onnotice: () => {} })
  try {
    await sql`create extension if not exists unaccent`
    await sql`create extension if not exists pg_trgm`
    await migrate(drizzle(sql), {
      migrationsFolder: join(__dirname, '..', '..', 'drizzle'),
    })
  } finally {
    await sql.end({ timeout: 5 })
  }
}

/** Never the development database. Dropping rows between tests against the
 *  seeded demo data would be a bad afternoon. */
export function testDatabaseUrl() {
  const url = process.env.TEST_DATABASE_URL
  if (url) return url

  const base = process.env.DATABASE_URL
  if (!base) throw new Error('Missing DATABASE_URL')
  return base.replace(/\/[^/?]+(\?|$)/, '/nexus_test$1')
}

function splitDatabase(url: string) {
  const parsed = new URL(url)
  const database = parsed.pathname.replace(/^\//, '')
  parsed.pathname = '/postgres'
  return { database, adminUrl: parsed.toString() }
}
