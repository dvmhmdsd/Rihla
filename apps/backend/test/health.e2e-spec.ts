import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PG_POOL } from '../src/database/database.constants';
import { DatabaseService } from '../src/database/database.service';
import { configureApp } from '../src/setup-app';

/**
 * Exercises the real HTTP stack — global prefix, routing, status codes — with
 * only the database faked, so no container is needed to run this.
 */
describe('Health (e2e)', () => {
  let app: INestApplication<App>;
  const ping = jest.fn();

  const startApp = async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Replacing the pool provider outright means its factory never runs, so
      // the test needs no DATABASE_URL and opens no connection.
      .overrideProvider(PG_POOL)
      .useValue({ end: jest.fn() })
      .overrideProvider(DatabaseService)
      .useValue({ ping })
      .compile();

    app = configureApp(moduleFixture.createNestApplication());
    await app.init();
  };

  beforeEach(() => ping.mockReset());
  afterEach(async () => app?.close());

  it('GET /api/health returns 200 when the database is reachable', async () => {
    ping.mockResolvedValue(true);
    await startApp();

    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({ status: 'ok', db: 'up' });
  });

  it('GET /api/health returns 503 when the database is unreachable', async () => {
    ping.mockResolvedValue(false);
    await startApp();

    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(503);

    expect(response.body).toMatchObject({ status: 'degraded', db: 'down' });
  });

  it('is served under the /api prefix only', async () => {
    ping.mockResolvedValue(true);
    await startApp();

    await request(app.getHttpServer()).get('/health').expect(404);
  });
});
