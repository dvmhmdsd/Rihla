import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  const ping = jest.fn();

  beforeEach(async () => {
    ping.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: DatabaseService, useValue: { ping } },
      ],
    }).compile();

    service = module.get(HealthService);
  });

  it('reports ok and db up when the database answers', async () => {
    ping.mockResolvedValue(true);

    await expect(service.check()).resolves.toMatchObject({
      status: 'ok',
      db: 'up',
    });
  });

  it('reports degraded and db down when the database does not answer', async () => {
    ping.mockResolvedValue(false);

    await expect(service.check()).resolves.toMatchObject({
      status: 'degraded',
      db: 'down',
    });
  });

  it('returns a whole-number uptime and an ISO timestamp', async () => {
    ping.mockResolvedValue(true);

    const result = await service.check();

    expect(Number.isInteger(result.uptimeSeconds)).toBe(true);
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
