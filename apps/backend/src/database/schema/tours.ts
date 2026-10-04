import {
  bigint,
  char,
  check,
  integer,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { destinationsTable } from './destinations';
import { sql } from 'drizzle-orm';

export const toursTable = pgTable(
  'tours',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    destinationId: bigint({ mode: 'number' })
      .references(() => destinationsTable.id, { onDelete: 'restrict' })
      .notNull(),
    titleEn: text().notNull(),
    titleAr: text().notNull(),
    descriptionEn: text(),
    descriptionAr: text(),
    durationMinutes: integer().notNull(),
    price: bigint({ mode: 'number' }).notNull(),
    currency: char({ length: 3 }).notNull(),
    archived_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .$onUpdate(() => new Date())
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'tours_title_en_not_blank_check',
      sql`length(trim(${table.titleEn})) > 0`,
    ),
    check(
      'tours_title_ar_not_blank_check',
      sql`length(trim(${table.titleAr})) > 0`,
    ),
    check('tours_duration_check', sql`${table.durationMinutes} > 0`),
    check('tours_price_check', sql`${table.price} >= 0`),
    check('tours_currency_format_check', sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);
