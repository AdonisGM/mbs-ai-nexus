import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { customerScope } from '../auth/scope'
import { DB, type Db } from '../db/db.module'
import { customers, signals, type Signal, type User } from '../db/schema'
import type { CreateSignalDto, ListSignalsDto } from './dto'

export const DEFAULT_LIMIT = 50

/** The customer timeline.
 *
 *  There is no update and no delete, and that is the design rather than an
 *  omission: a signal that turns out to be wrong is corrected by writing a
 *  newer one over the top. The mistaken reading is itself worth keeping — it
 *  is what the recurring-blocker view is built from, and it is the honest
 *  record when a sentence gets read the wrong way.
 *
 *  Everything here reads through the customer, so a signal is exactly as
 *  visible as the file it belongs to and no more. */
@Injectable()
export class SignalsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(user: User, customerId: string, query: ListSignalsDto = {}): Promise<Signal[]> {
    await this.assertCustomerVisible(user, customerId)

    const where = query.type
      ? and(eq(signals.customerId, customerId), eq(signals.type, query.type))
      : eq(signals.customerId, customerId)

    return this.db
      .select()
      .from(signals)
      .where(where)
      /** Newest first, and by what was observed rather than what was typed. */
      .orderBy(desc(signals.observedAt), desc(signals.createdAt))
      .limit(query.limit ?? DEFAULT_LIMIT)
  }

  async create(user: User, customerId: string, body: CreateSignalDto): Promise<Signal> {
    await this.assertCustomerVisible(user, customerId)

    const [row] = await this.db
      .insert(signals)
      .values({
        id: randomUUID(),
        customerId,
        type: body.type,
        content: body.content,
        /** Always `sale` through the API. The system and the model write their
         *  own rows internally, and letting a caller claim to be either would
         *  put unattributable observations in a customer file. */
        source: 'sale',
        authorId: user.id,
        observedAt: body.observedAt ? new Date(body.observedAt) : new Date(),
        rawNote: body.rawNote ?? null,
      })
      .returning()

    return row
  }

  /** Reported as missing rather than forbidden, for the same reason as
   *  everywhere else: confirming a customer exists is already a leak. */
  private async assertCustomerVisible(user: User, customerId: string) {
    const [found] = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, customerId), customerScope(this.db, user)))
      .limit(1)

    if (!found) throw new NotFoundException('customer_not_found')
  }
}
