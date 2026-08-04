import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { HealthResponse } from '@rihla/shared';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthResponse> {
    const result = await this.health.check();

    // A health check that cannot fail is worthless — report 503 when a
    // dependency is down so orchestrators and probes see the truth.
    res.status(
      result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE,
    );

    return result;
  }
}
