import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs outside Nest, so ConfigModule is not in play. The monorepo
// keeps one .env at the root; fall back to a local one for standalone runs.
config({ path: '../../.env' });
config({ path: '.env' });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Generated SQL is reviewed and committed — never applied straight from a
  // schema diff.
  strict: true,
  verbose: true,
});
