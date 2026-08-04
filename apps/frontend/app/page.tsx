import { formatMoney, money } from '@rihla/shared';
import { getHealth } from '@/lib/api';

const dotClass = (up: boolean) =>
  `inline-block h-2.5 w-2.5 rounded-full ${up ? 'bg-emerald-500' : 'bg-red-500'}`;

export default async function Home() {
  const result = await getHealth();

  // A runtime value from the shared package, not just a type — proves the
  // compiled output is genuinely wired into the frontend bundle.
  const sample = money(125_000, 'EGP');

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 p-8 font-sans dark:bg-black">
      <main className="w-full max-w-xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Rihla
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Monorepo is up. Frontend, API, and Postgres below.
          </p>
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
            API health
          </h2>

          {result.reachable ? (
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-zinc-500">Service</dt>
              <dd className="flex items-center gap-2 font-mono text-black dark:text-zinc-100">
                <span className={dotClass(result.health.status === 'ok')} />
                {result.health.status}
              </dd>

              <dt className="text-zinc-500">Database</dt>
              <dd className="flex items-center gap-2 font-mono text-black dark:text-zinc-100">
                <span className={dotClass(result.health.db === 'up')} />
                {result.health.db}
              </dd>

              <dt className="text-zinc-500">Uptime</dt>
              <dd className="font-mono text-black dark:text-zinc-100">
                {result.health.uptimeSeconds}s
              </dd>

              <dt className="text-zinc-500">Checked at</dt>
              <dd className="font-mono text-xs text-zinc-600 dark:text-zinc-300">
                {result.health.timestamp}
              </dd>
            </dl>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 font-mono text-black dark:text-zinc-100">
                <span className={dotClass(false)} />
                API unreachable
              </p>
              <p className="font-mono text-xs text-zinc-500">{result.error}</p>
              <p className="text-zinc-500">
                Start it with <code className="font-mono">pnpm dev</code>.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Shared package
          </h2>
          <p className="text-zinc-600 dark:text-zinc-300">
            <code className="font-mono">{sample.amountMinor}</code> minor units
            renders as{' '}
            <span className="font-medium text-black dark:text-zinc-100">
              {formatMoney(sample, 'en-EG')}
            </span>{' '}
            /{' '}
            <span className="font-medium text-black dark:text-zinc-100">
              {formatMoney(sample, 'ar-EG')}
            </span>
          </p>
        </section>
      </main>
    </div>
  );
}
