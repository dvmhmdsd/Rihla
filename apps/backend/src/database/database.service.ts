import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { PgTransactionConfig } from 'drizzle-orm/pg-core';
import type { Pool, QueryResult, QueryResultRow } from 'pg';
import { DRIZZLE, PG_POOL } from './database.constants';
import type { DrizzleDb, DrizzleTx } from './drizzle.types';

/**
 * Owns database access. Drizzle handles the typed query surface; `raw` stays
 * available for the SQL Drizzle cannot express, so isolation levels, advisory
 * locks and `FOR UPDATE` remain first-class rather than fought against.
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @Inject(DRIZZLE) readonly db: DrizzleDb,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  /**
   * Runs `fn` in a transaction. Pass an isolation level explicitly whenever
   * the work depends on it — Postgres defaults to READ COMMITTED, which is not
   * enough to protect a capacity check from a concurrent booking.
   */
  transaction<T>(
    fn: (tx: DrizzleTx) => Promise<T>,
    config?: PgTransactionConfig,
  ): Promise<T> {
    return this.db.transaction(fn, config);
  }

  /**
   * Escape hatch to the driver. Parameterized only — never interpolate values
   * into `text`.
   */
  raw<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params as unknown[] | undefined);
  }

  /** True when the database answers. Swallows the error by design. */
  async ping(): Promise<boolean> {
    try {
      await this.db.execute(sql`select 1`);
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
