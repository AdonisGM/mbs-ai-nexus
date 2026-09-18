import './env'

import { drizzle } from 'drizzle-orm/postgres-js'
import { createSql } from './db/db.module'
import * as schema from './db/schema'
import { required } from './env'
import { seedAccounts } from './seed/accounts'
import { seedDemo } from './seed/demo'

/** `pnpm seed` writes the six accounts and leaves everything else alone.
 *  `pnpm seed:demo` also rebuilds the customers, deals and targets, which
 *  wipes whatever is there — so the two are separate commands rather than one
 *  with a surprise. */
async function main() {
  const withDemo = process.argv.includes('--demo')

  /** Every demo account shares one password. Deliberate: five people swap
   *  roles quickly while filming, and a forgotten password mid-take is a worse
   *  risk than a weak one in a database holding no real customers. It is never
   *  committed — it comes from .env. */
  const password = required('SEED_PASSWORD')

  const sql = createSql(1)
  const db = drizzle(sql, { schema })

  try {
    const accounts = await seedAccounts(db, password)
    console.log(`Seeded 1 unit and ${accounts.length} accounts.`)
    for (const account of accounts) {
      console.log(`  ${account.code.padEnd(12)} ${account.name.padEnd(18)} ${account.role}`)
    }

    if (withDemo) {
      const result = await seedDemo(db)
      console.log(
        `\nSeeded ${result.customers} customers and ${result.opportunities} opportunities,` +
          ` replayed through the services so the audit trail is real.`,
      )
    } else {
      console.log('\nRun with --demo to rebuild customers, deals and targets.')
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
