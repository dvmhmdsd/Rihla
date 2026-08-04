# Rihla

A travel marketplace where travelers discover destinations, build multi-stop itineraries, and pay for tours and stays. The system is designed to teach the hard problems of concurrency, eventual consistency, and distributed transactions in a real-world context — see [docs/definition.md](docs/definition.md).

## Stack

| Piece | Tech | Location |
| --- | --- | --- |
| Frontend | Next.js 16, React 19, Tailwind 4 | [apps/frontend](apps/frontend) |
| API | NestJS 11, raw `pg` (no ORM) | [apps/backend](apps/backend) |
| Database | Postgres 17 via Docker | [docker-compose.yml](docker-compose.yml) |
| Shared code | TypeScript package consumed by both apps | [packages/shared](packages/shared) |
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

## Shared code

`@rihla/shared` holds anything both the API and the web app must agree on — currently the money model and the `/api/health` contract. It compiles to `dist/` via `tsc`, and turbo builds it before either app, so importing it is ordinary:

```ts
import { type HealthResponse, formatMoney, money } from '@rihla/shared';
```

Add new modules under `packages/shared/src/` and re-export them from `index.ts`.

## Environment

The root `.env` drives docker-compose and the API. Next.js reads env files from its own directory, so frontend overrides go in `apps/frontend/.env.local` — see [apps/frontend/.env.example](apps/frontend/.env.example). Both `.env.example` files are committed; the real `.env` files are not.

## Not yet built

No schema, migrations, or seed data — the pool connects to an empty database. Auth, the mock provider service, and the search layer are all still ahead. See [docs/definition.md](docs/definition.md) for where this is going and [docs/superpowers/specs/](docs/superpowers/specs/) for design records.
