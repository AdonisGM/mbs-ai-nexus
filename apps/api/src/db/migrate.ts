import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { join } from 'node:path'
import { createSql } from './db.module'

/** Apply migrations before the API accepts a request. Fine for a single
 *  instance; if this ever runs behind more than one replica, move it to a
 *  deploy step so two boots cannot race each other. */
export async function runMigrations() {
  const sql = createSql(1)
  try {
    /** Not managed by drizzle-kit, so turn them on by hand. `unaccent` powers
     *  accent-insensitive customer search, `pg_trgm` powers fuzzy matching.
     *  Both are trusted extensions since Postgres 13, so the database owner
     *  can enable them without superuser rights. */
    await sql`create extension if not exists unaccent`
    await sql`create extension if not exists pg_trgm`
    await migrate(drizzle(sql), { migrationsFolder: join(__dirname, '..', '..', 'drizzle') })
  } finally {
    await sql.end({ timeout: 5 })
  }
}
