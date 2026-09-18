import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { closeDb, resetDb, testDb } from '../test/db'
import { makeBranch, makeCustomer, makeUser, type Branch } from '../test/factories'
import { CustomersService } from './customers.service'

const service = new CustomersService(testDb)

beforeEach(resetDb)
afterAll(closeDb)

async function seedBranch(): Promise<Branch> {
  return makeBranch()
}

describe('list', () => {
  it('returns only what the caller may see', async () => {
    const branch = await seedBranch()
    const mine = await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb' })
    await makeCustomer({ ownerId: branch.saleSse.id, segment: 'sse' })

    const page = await service.list(branch.saleRb, {})

    expect(page.rows.map((row) => row.id)).toEqual([mine.id])
    expect(page.total).toBe(1)
  })

  it("counts only what the caller may see, not the whole table", async () => {
    const branch = await seedBranch()
    await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb' })
    await makeCustomer({ ownerId: branch.saleSse.id, segment: 'sse' })

    expect((await service.list(branch.saleRb, {})).total).toBe(1)
    expect((await service.list(branch.bm, {})).total).toBe(2)
  })

  it('pages without losing the scope', async () => {
    const branch = await seedBranch()
    for (let i = 0; i < 5; i++) {
      await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb' })
    }
    await makeCustomer({ ownerId: branch.saleSse.id, segment: 'sse' })

    const first = await service.list(branch.saleRb, { page: 1, pageSize: 2 })
    const last = await service.list(branch.saleRb, { page: 3, pageSize: 2 })

    expect(first.rows).toHaveLength(2)
    expect(last.rows).toHaveLength(1)
    expect(first.total).toBe(5)
  })

  it('filters by segment on top of the scope', async () => {
    const branch = await seedBranch()
    const rb = await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb' })
    await makeCustomer({ ownerId: branch.saleSse.id, segment: 'sse' })

    const page = await service.list(branch.bm, { segment: 'rb' })
    expect(page.rows.map((row) => row.id)).toEqual([rb.id])
  })

  it('narrows to one salesperson for a team lead', async () => {
    const branch = await seedBranch()
    const theirs = await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb' })
    await makeCustomer({ ownerId: branch.leadRb.id, segment: 'rb' })

    const page = await service.list(branch.leadRb, { ownerId: branch.saleRb.id })
    expect(page.rows.map((row) => row.id)).toEqual([theirs.id])
  })

  /** An owner filter must not be a way around the scope: asking for a peer's
   *  book returns nothing rather than that peer's customers. */
  it('returns nothing when asked for someone out of scope', async () => {
    const branch = await seedBranch()
    await makeCustomer({ ownerId: branch.saleSse.id, segment: 'sse' })

    const page = await service.list(branch.saleRb, { ownerId: branch.saleSse.id })
    expect(page.rows).toEqual([])
  })

  describe('search', () => {
    it('finds a name typed without its accents', async () => {
      const branch = await seedBranch()
      const customer = await makeCustomer({
        ownerId: branch.saleRb.id,
        segment: 'rb',
        name: 'Nguyễn Văn Hà',
      })

      const page = await service.list(branch.saleRb, { q: 'van ha' })
      expect(page.rows.map((row) => row.id)).toEqual([customer.id])
    })

    it('finds a name typed with accents when the record has none', async () => {
      const branch = await seedBranch()
      const customer = await makeCustomer({
        ownerId: branch.saleRb.id,
        segment: 'rb',
        name: 'Nguyen Van Ha',
      })

      const page = await service.list(branch.saleRb, { q: 'Hà' })
      expect(page.rows.map((row) => row.id)).toEqual([customer.id])
    })

    it('matches on the code too', async () => {
      const branch = await seedBranch()
      const customer = await makeCustomer({
        ownerId: branch.saleRb.id,
        segment: 'rb',
        code: 'CUS-RB-042',
      })

      const page = await service.list(branch.saleRb, { q: 'rb-042' })
      expect(page.rows.map((row) => row.id)).toEqual([customer.id])
    })

    it('still respects the scope while searching', async () => {
      const branch = await seedBranch()
      await makeCustomer({ ownerId: branch.saleSse.id, segment: 'sse', name: 'Công ty Hà An' })

      const page = await service.list(branch.saleRb, { q: 'Hà An' })
      expect(page.rows).toEqual([])
    })
  })
})

describe('get', () => {
  it('returns a customer in scope', async () => {
    const branch = await seedBranch()
    const customer = await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb' })

    expect((await service.get(branch.saleRb, customer.id)).id).toBe(customer.id)
  })

  /** Reported as missing rather than forbidden: confirming that a record
   *  exists but belongs to someone else is already a leak. */
  it("reports a peer's customer as missing, not forbidden", async () => {
    const branch = await seedBranch()
    const theirs = await makeCustomer({ ownerId: branch.saleSse.id, segment: 'sse' })

    await expect(service.get(branch.saleRb, theirs.id)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('lets a team lead read their own people', async () => {
    const branch = await seedBranch()
    const customer = await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb' })

    expect((await service.get(branch.leadRb, customer.id)).id).toBe(customer.id)
    await expect(service.get(branch.leadSse, customer.id)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('throws for an id that does not exist at all', async () => {
    const branch = await seedBranch()
    await expect(service.get(branch.bm, 'nope')).rejects.toBeInstanceOf(NotFoundException)
  })
})

describe('create', () => {
  it('puts a new customer in the caller’s own book by default', async () => {
    const branch = await seedBranch()

    const customer = await service.create(branch.saleRb, { name: 'Anh A', segment: 'rb' })

    expect(customer.ownerId).toBe(branch.saleRb.id)
    expect(customer.code).toBe('CUS-RB-001')
  })

  it('numbers codes per segment', async () => {
    const branch = await seedBranch()

    const first = await service.create(branch.saleRb, { name: 'A', segment: 'rb' })
    const second = await service.create(branch.saleRb, { name: 'B', segment: 'rb' })
    const other = await service.create(branch.saleSse, { name: 'C', segment: 'sse' })

    expect([first.code, second.code, other.code]).toEqual([
      'CUS-RB-001',
      'CUS-RB-002',
      'CUS-SSE-001',
    ])
  })

  it('lets a team lead assign to one of their own people', async () => {
    const branch = await seedBranch()

    const customer = await service.create(branch.leadRb, {
      name: 'Anh A',
      segment: 'rb',
      ownerId: branch.saleRb.id,
    })

    expect(customer.ownerId).toBe(branch.saleRb.id)
  })

  /** Without this the scope on the way out would be decorative: anyone could
   *  push a row into a colleague's book and simply lose sight of it. */
  it("refuses to assign into a peer's book", async () => {
    const branch = await seedBranch()

    await expect(
      service.create(branch.leadRb, {
        name: 'Anh A',
        segment: 'sse',
        ownerId: branch.saleSse.id,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('refuses a segment the owner does not cover', async () => {
    const branch = await seedBranch()

    await expect(
      service.create(branch.saleRb, { name: 'Công ty A', segment: 'sse' }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('refuses to put a customer in a branch manager’s name', async () => {
    const branch = await seedBranch()

    await expect(
      service.create(branch.bm, { name: 'Anh A', segment: 'rb', ownerId: branch.bm.id }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('keeps segment-specific fields in attributes', async () => {
    const branch = await seedBranch()

    const customer = await service.create(branch.saleRb, {
      name: 'Anh A',
      segment: 'rb',
      attributes: { repaymentSource: 'salary', collateral: 'apartment' },
      currentProducts: ['payment_account'],
      revenue: 1_200_000_000,
    })

    expect(customer.attributes).toEqual({
      repaymentSource: 'salary',
      collateral: 'apartment',
    })
    expect(customer.currentProducts).toEqual(['payment_account'])
    expect(customer.revenue).toBe(1_200_000_000)
  })

  it('defaults the flexible fields rather than leaving them null', async () => {
    const branch = await seedBranch()
    const customer = await service.create(branch.saleRb, { name: 'Anh A', segment: 'rb' })

    expect(customer.attributes).toEqual({})
    expect(customer.currentProducts).toEqual([])
    expect(customer.revenue).toBeNull()
  })

  it('walks past a code already taken', async () => {
    const branch = await seedBranch()
    await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb', code: 'CUS-RB-001' })

    const customer = await service.create(branch.saleRb, { name: 'Anh A', segment: 'rb' })
    expect(customer.code).toBe('CUS-RB-002')
  })
})

describe('update', () => {
  it('edits a customer in scope', async () => {
    const branch = await seedBranch()
    const customer = await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb' })

    const updated = await service.update(branch.saleRb, customer.id, { name: 'Anh B' })
    expect(updated.name).toBe('Anh B')
  })

  it("refuses to edit a peer's customer", async () => {
    const branch = await seedBranch()
    const theirs = await makeCustomer({ ownerId: branch.saleSse.id, segment: 'sse' })

    await expect(
      service.update(branch.saleRb, theirs.id, { name: 'Taken' }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('leaves untouched fields alone', async () => {
    const branch = await seedBranch()
    const customer = await makeCustomer({
      ownerId: branch.saleRb.id,
      segment: 'rb',
      note: 'Keep me',
      attributes: { repaymentSource: 'salary' },
    })

    const updated = await service.update(branch.saleRb, customer.id, { name: 'Anh B' })

    expect(updated.note).toBe('Keep me')
    expect(updated.attributes).toEqual({ repaymentSource: 'salary' })
  })

  it('lets a team lead hand a customer to another of their people', async () => {
    const branch = await seedBranch()
    const customer = await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb' })
    const second = await makeUser({
      unitId: branch.unit.id,
      role: 'sale',
      segment: 'rb',
      managerId: branch.leadRb.id,
    })

    const updated = await service.update(branch.leadRb, customer.id, { ownerId: second.id })
    expect(updated.ownerId).toBe(second.id)
  })

  it("refuses to hand a customer to a peer's salesperson", async () => {
    const branch = await seedBranch()
    const customer = await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb' })

    await expect(
      service.update(branch.leadRb, customer.id, { ownerId: branch.saleSse.id }),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('refuses a new owner who does not cover the segment', async () => {
    const branch = await seedBranch()
    const customer = await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb' })
    const sseSale = await makeUser({
      unitId: branch.unit.id,
      role: 'sale',
      segment: 'sse',
      managerId: branch.leadRb.id,
    })

    await expect(
      service.update(branch.leadRb, customer.id, { ownerId: sseSale.id }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('moves the updated mark so the list resorts', async () => {
    const branch = await seedBranch()
    const customer = await makeCustomer({ ownerId: branch.saleRb.id, segment: 'rb' })

    const updated = await service.update(branch.saleRb, customer.id, { name: 'Anh B' })
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(customer.updatedAt.getTime())
  })
})
