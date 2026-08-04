# Rihla

A travel marketplace where travelers discover destinations, build multi-stop itineraries, and pay for tours and stays. The system is designed to teach the hard problems of concurrency, eventual consistency, and distributed transactions in a real-world context — see [docs/definition.md](docs/definition.md).

## Stack

| Piece | Tech | Location |
| --- | --- | --- |
| Frontend | Next.js 16, React 19, Tailwind 4 | [apps/frontend](apps/frontend) |
| API | NestJS 11, Drizzle over `node-postgres` | [apps/backend](apps/backend) |
| Database | Postgres 17 via Docker | [docker-compose.yml](docker-compose.yml) |
| Shared code | Domain types used by both sides | [packages/shared](packages/shared) |
| Build orchestration | Turborepo, pnpm workspaces | [turbo.json](turbo.json) |

## Getting started

Requires Node 22+, pnpm 10, and Docker.

```bash
pnpm install
cp .env.example .env      # defaults work as-is
pnpm db:up                # start Postgres, wait for healthy
pnpm dev                  # frontend :3000, API :4000
```

Open http://localhost:3000 — the page renders live API and database status. `GET http://localhost:4000/api/health` returns the same payload, and answers **503** when the database is unreachable.

## Scripts

Run from the repo root.

| Command | Does |
| --- | --- |
| `pnpm dev` | Runs every app's dev server in parallel |
| `pnpm build` | Builds `@rihla/shared` first, then both apps |
| `pnpm typecheck` | `tsc --noEmit` across the workspace |
| `pnpm lint` | ESLint per app |
| `pnpm test` | Jest |
| `pnpm db:up` / `db:down` | Start / stop Postgres |
| `pnpm db:logs` | Tail Postgres logs |
| `pnpm db:reset` | Destroy the volume and recreate the database |
| `pnpm db:psql` | Open a psql shell in the container |
| `pnpm db:generate` | Diff the schema and write a migration SQL file |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:check` | Check migrations for conflicts |
| `pnpm db:studio` | Open Drizzle Studio |

## Adding dependencies

This is a pnpm workspace. Always install from the repo root using `--filter` with the target's package name:

```bash
pnpm --filter frontend add zod              # runtime dep for the Next app
pnpm --filter backend add -D @types/pg      # dev dep for the Nest app
pnpm --filter @rihla/shared add zod         # dep for the shared package
pnpm add -Dw turbo                          # root-level tooling only
```

`cd apps/backend && pnpm add pg` works too — pnpm walks up and finds the workspace.

To depend on an internal package, use the `workspace:` protocol so it symlinks to local source instead of resolving from the registry:

```bash
pnpm --filter frontend add @rihla/shared --workspace
```

> **Never run `npm install` or `yarn` here.** A competing lockfile breaks workspace resolution in ways that are tedious to diagnose.

## Where types come from

Three sources, deliberately kept apart:

- **`@rihla/shared`** — domain types both sides genuinely share: the money model, booking states, the `/api/health` contract. It compiles to `dist/` via `tsc` and turbo builds it before either app, so importing it is ordinary:

  ```ts
  import { type HealthResponse, formatMoney, money } from '@rihla/shared';
  ```

  Add modules under `packages/shared/src/` and re-export from `index.ts`.

- **Drizzle schema** — the storage shape, private to the API under [apps/backend/src/database/schema/](apps/backend/src/database/schema/). Never exported to the frontend; storage layout changes for different reasons than the domain does.

- **Generated SDK** — transport types for the frontend, generated from the API surface. Not built yet (there is one endpoint and no schema to describe); see below.

## Database

Drizzle sits on the same `pg.Pool` the app already owns, so there is exactly one pool in the process. `DatabaseService` exposes `db` for typed queries, `transaction(fn, config)` with an explicit isolation level, and `raw()` as the driver escape hatch for SQL Drizzle cannot express.

Migrations are generate-then-apply, never `push`:

```bash
# 1. add or edit a table under src/database/schema/, re-export it from index.ts
pnpm db:generate     # writes apps/backend/drizzle/NNNN_*.sql — read it before committing
pnpm db:migrate      # applies pending migrations
```

The generated SQL is committed alongside the schema change. That matters the moment a migration needs `CREATE INDEX CONCURRENTLY`, a backfill, or a lock-safe column add — things a schema diff will not do for you.

There is no schema yet; the pool connects to an empty database.

## Environment

The root `.env` drives docker-compose and the API. Next.js reads env files from its own directory, so frontend overrides go in `apps/frontend/.env.local` — see [apps/frontend/.env.example](apps/frontend/.env.example). Both `.env.example` files are committed; the real `.env` files are not.

## Not yet built

- **Schema, migrations, seed data** — the pipeline works; nothing is defined yet.
- **Generated SDK** for the frontend — deferred until there is an API surface worth describing.
- Auth, the mock provider service, and the search layer.

The mock provider deliberately gets a foreign data shape and does **not** share this schema — the anti-corruption layer is the exercise.

See [docs/definition.md](docs/definition.md) for where this is going; architectural decisions land in [docs/ADRs/](docs/ADRs/).
