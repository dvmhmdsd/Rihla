import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DRIZZLE, PG_POOL } from './database.constants';
import { DatabaseService } from './database.service';
import type { DrizzleDb } from './drizzle.types';
import * as schema from './schema';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Pool => {
        const pool = new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_URL'),
          max: 10,
          connectionTimeoutMillis: 5_000,
          idleTimeoutMillis: 30_000,
        });

        // An idle client erroring with no listener attached takes the whole
        // process down. Log it and let the pool discard the client instead.
        pool.on('error', (error) => {
          new Logger('PgPool').error(`Idle client error: ${error.message}`);
        });

        return pool;
      },
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      // Drizzle wraps the pool we already own rather than opening its own, so
      // there is exactly one connection pool in the process.
      useFactory: (pool: Pool): DrizzleDb => drizzle({ client: pool, schema }),
    },
    DatabaseService,
  ],
  exports: [DatabaseService, DRIZZLE, PG_POOL],
})
export class DatabaseModule {}
