import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { and, asc, count, desc, eq, sql, type SQL } from 'drizzle-orm'
import { canAssignTo, customerScope } from '../auth/scope'
import { DB, type Db } from '../db/db.module'
import { customers, users, type Customer, type User } from '../db/schema'
import type { CreateCustomerDto, ListCustomersDto, UpdateCustomerDto } from './dto'

export const DEFAULT_PAGE_SIZE = 25

@Injectable()
export class CustomersService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** One page of the customers this person may see.
   *
   *  Scope is applied first and unconditionally; the caller's filters are
   *  added on top with `and`, never in place of it. */
  async list(user: User, query: ListCustomersDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE

    const where = this.whereFor(user, query)

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(customers)
        .where(where)
        .orderBy(desc(customers.updatedAt), asc(customers.code))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db.select({ total: count() }).from(customers).where(where),
    ])

    return { rows, total, page, pageSize }
  }

  /** One customer, or a 404.
   *
   *  Out of scope is reported as missing rather than forbidden on purpose:
   *  "this exists but is not yours" already tells someone that a competitor's
   *  customer is on the books here. */
  async get(user: User, id: string): Promise<Customer> {
    const [row] = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), customerScope(this.db, user)))
      .limit(1)

    if (!row) throw new NotFoundException('customer_not_found')
    return row
  }

  async create(user: User, body: CreateCustomerDto): Promise<Customer> {
    const ownerId = body.ownerId ?? user.id
    const owner = await this.resolveOwner(user, ownerId, body.segment)

    /** Two people creating in the same instant land on the same number. The
     *  unique index catches it; this walks to the next one rather than making
     *  the second person retype the form. */
    for (let attempt = 0; ; attempt++) {
      try {
        const [row] = await this.db
          .insert(customers)
          .values({
            id: randomUUID(),
            code: await this.nextCode(body.segment, attempt),
            name: body.name,
            segment: body.segment,
            ownerId: owner.id,
            currentProducts: body.currentProducts ?? [],
            revenue: body.revenue ?? null,
            relationStage: body.relationStage ?? null,
            attributes: body.attributes ?? {},
            contactName: body.contactName ?? null,
            contactPhone: body.contactPhone ?? null,
            note: body.note ?? null,
          })
          .returning()

        return row
      } catch (error) {
        if (attempt >= 4 || !isUniqueViolation(error, 'customers_code_unique')) throw error
      }
    }
  }

  async update(user: User, id: string, body: UpdateCustomerDto): Promise<Customer> {
    /** Reads through the scope, so editing something out of reach fails as a
     *  404 before anything is written. */
    const current = await this.get(user, id)

    if (body.ownerId && body.ownerId !== current.ownerId) {
      await this.resolveOwner(user, body.ownerId, current.segment)
    }

    const [row] = await this.db
      .update(customers)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.ownerId !== undefined && { ownerId: body.ownerId }),
        ...(body.currentProducts !== undefined && { currentProducts: body.currentProducts }),
        ...(body.revenue !== undefined && { revenue: body.revenue }),
        ...(body.relationStage !== undefined && { relationStage: body.relationStage }),
        ...(body.attributes !== undefined && { attributes: body.attributes }),
        ...(body.contactName !== undefined && { contactName: body.contactName }),
        ...(body.contactPhone !== undefined && { contactPhone: body.contactPhone }),
        ...(body.note !== undefined && { note: body.note }),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning()

    return row
  }

  private whereFor(user: User, query: ListCustomersDto): SQL | undefined {
    const parts: (SQL | undefined)[] = [customerScope(this.db, user)]

    if (query.segment) parts.push(eq(customers.segment, query.segment))
    if (query.ownerId) parts.push(eq(customers.ownerId, query.ownerId))

    /** Accent-insensitive on both sides, so typing "ha" finds "Hà" and typing
     *  "Hà" finds a name someone entered without the accent. Vietnamese names
     *  get typed both ways and a search that only matches one is a search
     *  people stop using. */
    if (query.q) {
      parts.push(
        sql`(unaccent(${customers.name}) ilike unaccent(${'%' + query.q + '%'})
             or ${customers.code} ilike ${'%' + query.q + '%'})`,
      )
    }

    const defined = parts.filter((part): part is SQL => part !== undefined)
    return defined.length > 0 ? and(...defined) : undefined
  }

  /** Checks that the caller may assign to this person, and that the person can
   *  actually hold a customer in that segment.
   *
   *  The segment rule exists because a customer's segment decides which
   *  pipeline their deals land in. An SSE customer in a retail salesperson's
   *  book would sit in a pipeline nobody reviews. */
  private async resolveOwner(actor: User, ownerId: string, segment: string) {
    if (!(await canAssignTo(this.db, actor, ownerId))) {
      throw new ForbiddenException('owner_out_of_scope')
    }

    const [owner] = await this.db.select().from(users).where(eq(users.id, ownerId)).limit(1)
    if (!owner) throw new NotFoundException('owner_not_found')

    if (owner.role !== 'sale' && owner.role !== 'team_lead') {
      throw new BadRequestException('owner_not_in_sales_line')
    }
    if (owner.segment !== segment) {
      throw new BadRequestException('owner_segment_mismatch')
    }

    return owner
  }

  /** CUS-SSE-001, numbered per segment.
   *
   *  Derived from the highest number in use rather than a database sequence,
   *  because these codes get read aloud in meetings and a sequence leaves gaps
   *  every time an insert rolls back. The trailing digits are parsed out, so a
   *  code that does not end in a number is simply ignored instead of breaking
   *  the next one. */
  private async nextCode(segment: string, attempt = 0): Promise<string> {
    const [row] = await this.db
      .select({
        highest: sql<number>`coalesce(max((substring(${customers.code} from '[0-9]+$'))::int), 0)`,
      })
      .from(customers)
      .where(eq(customers.segment, segment))

    const next = Number(row?.highest ?? 0) + 1 + attempt
    return `CUS-${segment.toUpperCase()}-${String(next).padStart(3, '0')}`
  }
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const seen = error as { constraint_name?: string; cause?: { constraint_name?: string } }
  return (seen?.constraint_name ?? seen?.cause?.constraint_name) === constraint
}
