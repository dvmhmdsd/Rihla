import { HEALTH_PATH, type HealthResponse } from "@rihla/shared";
import { connection } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export type HealthResult =
  | { reachable: true; health: HealthResponse }
  | { reachable: false; error: string };

/**
 * Server-side fetch of the API health check.
 *
 * `connection()` stops prerendering here, so `next build` never tries to reach
 * a running API. A 503 is a successful round-trip — the body still carries a
 * valid HealthResponse describing what is down.
 */
export async function getHealth(): Promise<HealthResult> {
  await connection();

  try {
    const response = await fetch(`${API_URL}${HEALTH_PATH}`, {
      signal: AbortSignal.timeout(3_000),
    });
    const health = (await response.json()) as HealthResponse;
    return { reachable: true, health };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
