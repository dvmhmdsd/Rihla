import type { INestApplication } from '@nestjs/common';

/**
 * Applies the application-level configuration shared by the real bootstrap and
 * the e2e tests. Keeping it here means a test can never pass against a
 * differently-configured app than the one that ships.
 */
export function configureApp<T extends INestApplication>(app: T): T {
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  return app;
}
