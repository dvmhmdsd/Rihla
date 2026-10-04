import { sql } from 'drizzle-orm';
import {
  bigint,
  char,
  check,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const destinationsTable = pgTable(
  'destinations',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    nameEn: text().notNull(),
    nameAr: text().notNull(),
    countryCode: char({ length: 2 }).notNull(),
    timezone: text().notNull(),
    archivedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .$onUpdate(() => new Date())
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'destinations_name_en_not_blank_check',
      sql`length(trim(${table.nameEn})) > 0`,
    ),
    check(
      'destinations_name_ar_not_blank_check',
      sql`length(trim(${table.nameAr})) > 0`,
    ),
    check(
      'destinations_country_code_format_check',
      sql`${table.countryCode} ~ '^[A-Z]{2}$'`,
    ),
  ],
);
