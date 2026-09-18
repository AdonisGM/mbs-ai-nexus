import '../env'
import { runMigrations } from './migrate'

/** Applies migrations without booting Nest, for use during development and
 *  from the deploy script. The API also runs them on start. */
runMigrations()
  .then(() => console.log('Migrations applied.'))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
