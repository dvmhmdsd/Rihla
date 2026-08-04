/**
 * Drizzle schema — the storage shape, private to this service.
 *
 * Deliberately not exported through @rihla/shared. That package carries domain
 * types both the API and the web app genuinely share; storage layout is an
 * implementation detail that changes for different reasons. The frontend gets
 * transport types from the generated SDK instead.
 *
 * Add one file per table here and re-export it below, then run
 * `pnpm db:generate` to write the migration and `pnpm db:migrate` to apply it.
 */

export {};
