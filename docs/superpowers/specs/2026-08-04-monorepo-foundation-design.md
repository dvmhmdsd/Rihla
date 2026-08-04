# Rihla Monorepo Foundation — Design

**Date:** 2026-08-04
**Status:** Approved

## Goal

Turn the current half-scaffolded repo into a working Turborepo monorepo: a Next.js frontend, a NestJS backend connected to Postgres, Postgres itself in Docker, and a shared package whose types both apps import. Success means one command installs, one command builds, and one HTTP request exercises the whole chain.

## Starting state

- Root is a pnpm workspace (`apps/*`, `packages/*`) with `turbo` installed but no `turbo.json` and no root scripts.
- `apps/frontend` — Next.js 16, React 19, Tailwind 4. Carries a nested `.git` (one throwaway `create-next-app` commit, no remote, clean tree), its own `pnpm-lock.yaml`, and its own `pnpm-workspace.yaml`. All three conflict with the root workspace.
- `apps/backend` — NestJS 11 starter, no database wiring.
- No `packages/` directory, no `docker-compose.yml`. Repo root is not a git repository.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| DB access layer | Raw `pg` (node-postgres), no ORM | Locking and isolation semantics stay visible instead of hidden behind a query builder — the point of the project per `docs/definition.md`. |
| Shared package consumption | Compiled: `tsc` → `dist/` + `.d.ts`, wired as a turbo build dependency | Nest resolves with `nodenext`, Next with `bundler`. A compiled package with an `exports` map satisfies both without per-app transpile config. |
| Shared tooling configs | `packages/typescript-config` only | One source of truth for compiler assumptions. ESLint stays per-app — Next's and Nest's lint configs are genuinely different and merging them is unrelated work. |
| Version control | `git init` at root, delete `apps/frontend/.git` | Standard monorepo layout. The nested repo holds nothing worth preserving. |
| Schema / migrations | Out of scope | The pool connects to an empty database; `SELECT 1` is all the health check needs. Schema arrives with the first real domain. |

## Target layout

```
rihla/
├─ .gitignore                 (new)
├─ .env.example / .env        (new)
├─ docker-compose.yml         (new)
├─ turbo.json                 (new)
├─ package.json               (root scripts added)
├─ pnpm-workspace.yaml        (absorbs frontend's ignoredBuiltDependencies)
├─ README.md                  (workspace usage documented)
├─ apps/
│  ├─ frontend/               Next 16
│  └─ backend/                Nest 11 + pg
└─ packages/
   ├─ shared/                 @rihla/shared
   └─ typescript-config/      @rihla/typescript-config
```

## Components

### `packages/shared`

Compiles to CommonJS with declarations into `dist/`. No `"type": "module"` — CJS keeps Nest's `nodenext` resolution simple and Next consumes it without ceremony. The `exports` map carries a `types` condition so both resolvers land on the declarations.

Contents stay thin — enough to prove the wiring, seeded from `docs/definition.md`:

- `money.ts` — `CurrencyCode`, `Money { amountMinor: number; currency: CurrencyCode }`. Integer minor units, never floats.
- `health.ts` — `HealthResponse`, returned by Nest and rendered by Next.

`HealthResponse` is the real deliverable: one type, defined once, flowing from an API response into a React component. If it compiles in both apps, the monorepo is wired.

### `packages/typescript-config`

`base.json`, `nextjs.json`, `nestjs.json`. Each app's `tsconfig.json` shrinks to an `extends` plus its own `paths`/`include`. Nest keeps `nodenext` + decorators; Next keeps `bundler` + the next plugin. Shared settings (strict, target, `skipLibCheck`) live in one place so the shared package cannot drift out from under either app.

### `apps/backend` — database layer

`src/database/` holds a `@Global()` `DatabaseModule` providing a single `pg.Pool` under a `PG_POOL` token.

- Pool built from `DATABASE_URL` via `@nestjs/config`.
- `onModuleDestroy` calls `pool.end()` so dev restarts do not leak connections.
- A thin `DatabaseService` wrapping `query<T>(sql, params)`. Parameterized only — no string interpolation. This is the seam future locking work plugs into (`SELECT … FOR UPDATE`, explicit `BEGIN … COMMIT`).

New dependencies: `pg`, `@types/pg`, `@nestjs/config`.

`GET /api/health` runs `SELECT 1` and returns a `HealthResponse` from `@rihla/shared`, shaped `{ status, db, uptimeSeconds, timestamp }`. It returns **503 when the database is unreachable** rather than a misleading 200 — a health check that cannot fail is worthless.

### `apps/frontend`

Home page fetches `/api/health` and renders the status, importing the same `HealthResponse` type. One request then exercises: shared package → Nest → pg pool → Postgres container → typed React render.

### Docker

One `postgres` service, `postgres:17-alpine`, named volume `rihla-pgdata`, `pg_isready` healthcheck, credentials from `.env`, host port via `POSTGRES_PORT`.

Pinned to 17 rather than 18 deliberately: the Postgres 18 image relocated `PGDATA`, and there is no reason to absorb that here.

No app services in compose — Next and Nest run on the host via `pnpm dev` for fast HMR.

### Turbo

Turbo 2 `tasks` schema:

- `build` — `dependsOn: ["^build"]`, outputs `dist/**` and `.next/**` (minus cache)
- `dev` — persistent, uncached, `dependsOn: ["^build"]` so shared is built before apps boot
- `lint`, `test`, `typecheck`

Root scripts: `dev`, `build`, `lint`, `test`, `typecheck`, plus `db:up` / `db:down` / `db:logs` / `db:reset`.

## Cleanup

In `apps/frontend`: delete `.git`, delete `pnpm-lock.yaml` (a nested lockfile silently breaks root workspace resolution), and fold `pnpm-workspace.yaml`'s `ignoredBuiltDependencies` (`sharp`, `unrs-resolver`) into the root workspace file, then delete it.

## Workspace usage (documented in root README)

```bash
pnpm --filter frontend add zod          # add to one app
pnpm --filter backend add -D @types/pg  # dev dependency
pnpm add -Dw turbo                      # root tooling only
pnpm --filter frontend add @rihla/shared --workspace
```

Internal packages use the `workspace:` protocol so they symlink to local source instead of resolving from the registry. Never run `npm install` or `yarn` in this repo — a competing lockfile shatters the workspace.

## Ports

| Service | Port |
|---|---|
| Next.js | 3000 |
| NestJS | 4000 |
| Postgres | 5432 |

## Verification

Every step below is run, not assumed:

1. `pnpm install` completes clean from root.
2. `pnpm build` — shared compiles first, both apps build.
3. `docker compose up -d` → container reports healthy via `pg_isready`.
4. `pnpm typecheck` passes in both apps.
5. `curl localhost:4000/api/health` returns 200 with `db: "up"`.
6. `docker compose stop postgres` → same endpoint returns 503 with `db: "down"`.
7. `localhost:3000` renders the health status.

Then `git init` at root, add root `.gitignore`, one initial commit.

## Out of scope

ORM, entities, migrations, schema, seed data, the mock provider service, auth, and a shared ESLint package. Each earns its own spec.
