# ADR-0002: Bilingual text storage

- **Status:** Accepted
- **Date:** 2026-09-25
- **Deciders:** Mohamed Saad
- **Blocks:** M1 (A catalog worth searching), M11 (Arabic and RTL), unit 1.8 (English full-text search)

## Context

M1 in the [PRD](../PRD.md) requires that every listing should have bilingual name fields populated and in M11, "Arabic search handles diacritics and common spelling variation" and "As an operator, I can provide bilingual listing content".

We have only 2 languages to support, and no other language will be added, as per the **Non-goals** section in the [definition](../definition.md) document.

Postgres requires the language (the text-search configuration) to be fixed inside the index expression, which makes the language a fact of the schema and not a fact of the data. And we need the types to be known and the multiple languages to be enforced at the schema level.

Postgres parses text for full-text search with a text-search configuration, and only the variants of `to_tsvector` that name a configuration can appear in an index expression. Postgres 17 ships an `arabic` configuration, and it already does part of M11's job: `to_tsvector('arabic', 'مَدْرَسَة')` matches a query for `مدرسة`, with the diacritics stripped.

## Decision

We will store the bilingual names and titles in two separate non null fields, one for each language. The fields will be named with a suffix indicating the language, e.g., `name_en`, and `name_ar`. Descriptions will be nullable and will be stored in two separate fields, e.g., `description_en` and `description_ar` because M1 requires only names and titles fields to be non-nullable. This partially answers PRD open question 24: operators must supply names and titles in both languages, and descriptions are optional.

## Consequences

- We have three translatable fields today (destination name, tour title, tour description), stored as six columns across `destinations` and `tours`.
- Adding a new language will require adding three new fields across the two tables, which will require a database migration, one more full-text index per language on each searched table, and code changes.
- Every read has to pick a column by locale.
- Every new translatable field means two columns now and two indexes in M11.
- There's no way to express a fallback when description_ar is null.

## Alternatives Considered

- **Storing bilingual text in a jsonb field:** This would allow us to store the bilingual text in a single field, and we can add GIN indexes on the jsonb field to support full-text search. However, this would require us to write custom code to handle the bilingual text. In addition, the drizzle type generated from using a jsonb field will be `unknown`, which is much weaker from type safety perspective and it doesn't enforce the bilingual text to be present for each listing. So jsonb meets the first requirement above (each key can get its own index expression with a fixed configuration) but fails the second one (types and enforcement at the schema level).

- **Storing bilingual text in a separate translation table:** This would allow us to store the bilingual text in a separate table with any number of languages, and we can join the translation table with the parent table to get the bilingual text. However, the language becomes a value in each row, so every index and every search has to read it, which fails the first requirement above. In addition, it can't easily enforce that both rows exist, which fails the second one.

## Scope

This decision does not settle:

- Cross-lingual matching (the M11 exit gate, "an Arabic query matching English content"). No storage shape solves it; it belongs to the embedding strategy.
- Who translates descriptions, and what a traveler sees when one is missing (the rest of open question 24).
- Diacritics and spelling variation. They live in the text-search configuration, not in storage. Postgres 17's `arabic` configuration already strips diacritics.
- Index design, which is deferred to unit 1.8.

## Revisit Triggers

- If we need to support more than 2 languages in the future, we will need to revisit this decision and consider using a separate translation table or a jsonb field to store the bilingual text.
- If more than 20% of active tours lack a description in one language after operators onboard (M8), we will need to revisit whether descriptions should be required.

## References

- `docs/PRD.md`: M1 acceptance criteria, M11, open question 24
- `docs/definition.md`: Non-goals
- PostgreSQL 17: [Text Search: Tables and Indexes](https://www.postgresql.org/docs/17/textsearch-tables.html)
