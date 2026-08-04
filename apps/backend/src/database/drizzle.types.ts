import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema';

/** The Drizzle instance, typed against the full schema. */
export type DrizzleDb = NodePgDatabase<typeof schema>;

/** The transaction-scoped handle passed to `db.transaction(...)` callbacks. */
export type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];
