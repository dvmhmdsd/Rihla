import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { PG_POOL } from './database.constants';

/**
 * Thin wrapper over `pg.Pool`. Deliberately not an ORM — transaction
 * boundaries, isolation levels and row locks stay written out in SQL where
 * they can be reasoned about.
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Parameterized queries only. Never interpolate values into `text`. */
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params as unknown[] | undefined);
  }

  /**
   * Runs `fn` inside a transaction on a single dedicated connection, so
   * `SELECT ... FOR UPDATE` and friends actually hold across statements.
   * Commits on return, rolls back on throw.
   */
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /** True when the database answers. Swallows the error by design. */
  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.warn(
        `Database ping failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('Postgres pool closed');
  }
}
