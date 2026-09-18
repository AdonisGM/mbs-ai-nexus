import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import * as schema from './schema'

export const DB = 'DB'
export const PG = 'PG'

export type Db = PostgresJsDatabase<typeof schema>

export function createSql(max = 10): Sql {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('Missing DATABASE_URL')
  /** Swallow Postgres notices such as "already exists, skipping" so CLI output
   *  stays readable. */
  return postgres(url, { max, onnotice: () => {} })
}

/** One Postgres connection shared by the whole application. */
@Global()
@Module({
  providers: [
    { provide: PG, useFactory: () => createSql() },
    { provide: DB, inject: [PG], useFactory: (sql: Sql) => drizzle(sql, { schema }) },
  ],
  exports: [DB, PG],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(PG) private readonly sql: Sql) {}

  async onApplicationShutdown() {
    await this.sql.end({ timeout: 5 })
  }
}
