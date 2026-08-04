/**
 * Contract for GET /api/health. Defined once here, returned by the NestJS
 * controller and consumed by the Next.js app — the proof that the shared
 * package is wired to both sides.
 */

export type ServiceStatus = 'ok' | 'degraded';

export type DependencyStatus = 'up' | 'down';

export interface HealthResponse {
  readonly status: ServiceStatus;
  readonly db: DependencyStatus;
  /** Whole seconds since the API process started. */
  readonly uptimeSeconds: number;
  /** ISO 8601, generated server-side. */
  readonly timestamp: string;
}

export const HEALTH_PATH = '/api/health';
