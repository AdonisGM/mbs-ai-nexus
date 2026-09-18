import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: ['./src/test/global-setup.ts'],
    /** Test files share one Postgres database and truncate between tests, so
     *  running them at the same time would have one file wiping another's rows
     *  mid-assertion. Sequential is slower and honest; the alternative is a
     *  schema per worker, which is not worth it at this size. */
    fileParallelism: false,
    include: ['src/**/*.spec.ts'],
  },
})
