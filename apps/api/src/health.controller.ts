import { Controller, Get, Inject } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { DB, type Db } from './db/db.module'

@Controller('public/health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Reports the database too, not just the process: an API that answers while
   *  Postgres is down is the failure mode worth catching. */
  @Get()
  async check() {
    await this.db.execute(sql`select 1`)
    return { ok: true, at: new Date().toISOString() }
  }
}
