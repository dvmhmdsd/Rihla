import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { HealthResponse } from '@rihla/shared';
import type { Response } from 'express';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  const check = jest.fn();

  const responseStub = () => {
    const status = jest.fn();
    return { res: { status } as unknown as Response, status };
  };

  const healthy: HealthResponse = {
    status: 'ok',
    db: 'up',
    uptimeSeconds: 1,
    timestamp: new Date().toISOString(),
  };

  beforeEach(async () => {
    check.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: { check } }],
    }).compile();

    controller = module.get(HealthController);
  });

  it('responds 200 when the service reports ok', async () => {
    check.mockResolvedValue(healthy);
    const { res, status } = responseStub();

    await expect(controller.check(res)).resolves.toEqual(healthy);
    expect(status).toHaveBeenCalledWith(HttpStatus.OK);
  });

  it('responds 503 when the service reports degraded', async () => {
    const degraded: HealthResponse = {
      ...healthy,
      status: 'degraded',
      db: 'down',
    };
    check.mockResolvedValue(degraded);
    const { res, status } = responseStub();

    await expect(controller.check(res)).resolves.toEqual(degraded);
    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('still returns the payload on 503 — the body explains what is down', async () => {
    check.mockResolvedValue({ ...healthy, status: 'degraded', db: 'down' });
    const { res } = responseStub();

    const body = await controller.check(res);

    expect(body.db).toBe('down');
  });
});
