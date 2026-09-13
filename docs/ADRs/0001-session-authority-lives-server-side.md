# ADR-0001: Session authority lives server-side

- **Status:** Accepted
- **Date:** 2026-09-13
- **Deciders:** Mohamed Saad
- **Blocks:** M2 (Accounts and roles)
- **Resolves:** PRD open question 23 (Session revocation)
- **Amends:** PRD Technical Considerations #5 (JWT Authentication)

## Context

M2 needs sign-in, roles, and suspension. Technical Consideration #5 proposed JWT on scalability grounds; three requirements in the same document rule it out.

- **Open question 23:** "the auth mechanism must allow immediate suspension to take effect ... token-based auth without a revocation list does not."
- **M10:** "Suspension takes effect on the next request, not at session expiry."
- **M2, M8:** roles are mutable — operator status is granted and revoked by admin action, enforced server-side.

Together these set a **revocation latency budget of zero**. A self-contained token cannot meet it, and every fix for it (denylist, token-version counter) restores the per-request database read it existed to avoid. The stakes are financial: a suspended operator still taking bookings accrues a payable balance that open question 5 may not let us recover.

What we give up is one database read per request — a primary-key lookup on the connection the request already holds, under 0.5% of our 300 ms search and 2 s booking budgets, and still a primary-key lookup at the 10× scalability target. The integration argument does not apply either: TC#4 commits to a monolith, and a future split would mint short-lived internal assertions at the edge rather than hand browsers the internal credential.

## Decision

Authentication state is a server-side session. The browser holds an opaque random token in an httpOnly cookie; Postgres is the source of truth.

**Session store.** `sessions`: `id`, `user_id`, `token_hash`, `created_at`, `last_seen_at`, `idle_expires_at`, `absolute_expires_at`, `revoked_at`, `ip`, `user_agent`.

- 256-bit CSPRNG token, base64url. Store the indexed SHA-256 hash only. A fast hash is correct here — the token is full-entropy, so there is no offline guessing to slow down.
- Idle expiry 30 days, absolute expiry 90 days. Idle covers M2's "stay signed in across a browser restart"; the absolute cap gives its "defined and tested" expiry a bound a sliding window never reaches.
- `last_seen_at` is written at most once per 60 s per session, keeping the idle refresh off the write path.
- Session id is rotated on sign-in and on privilege change.
- Scheduled cleanup deletes expired and revoked rows. Revocation reasons live in the M10 audit log, not here.

**Authorization.** Roles and suspension status are read per request, joined off the session — never carried in the credential.

**Transport.** Cookie: `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. The Next.js frontend proxies `/api/*` to Nest so the browser only ever sees one origin; sibling subdomains would force `__Secure-` instead (`__Host-` forbids a `Domain` attribute) and put a cross-site cookie in the browser. `SameSite=Lax` plus an `Origin` check on unsafe methods covers CSRF, enforced by one Nest guard rather than per handler.

We accept CSRF defence rather than a JS-readable `Authorization` header: CSRF is bounded and has cheap known mitigations, XSS token theft is not.

**No Redis.** A sub-millisecond Postgres read does not justify the dependency before we have measured a problem.

## Consequences

- Suspension, sign-out-everywhere, and account deletion (M2, M10) become `UPDATE`/`DELETE` and take effect on the next request. Role changes need no cache-invalidation story. Listing a user's active sessions comes free.
- Leaked database rows are inert (hashes only) and the cookie is unreadable by JavaScript.
- One indexed read per authenticated request, with Postgres on the auth path. Acceptable — nothing else in Rihla works without it either.
- The `sessions` table grows, and its cleanup job has to actually run.
- The API is not stateless, so horizontal scaling needs shared session storage. Postgres already is that; this is not sticky sessions.
- A non-browser API client (none in scope) would need its own credential type.

## Alternatives considered

- **JWT access token plus refresh token.** Misses the zero revocation budget and puts mutable roles in an immutable token. Adds refresh rotation and replay detection to buy a latency saving under 0.5% of budget.
- **JWT with a denylist or per-user token-version counter.** Restores revocation by restoring the per-request read, leaving a signature we no longer rely on plus algorithm-confusion and key-rotation failure modes an opaque token does not have.
- **Short-TTL JWT (~60 s) with silent refresh.** Turns zero revocation latency into 60 seconds, which M10 does not permit, and the refresh endpoint reads the store anyway.
- **Managed IdP (Clerk, Auth0, Better Auth).** All resolve to a session model, so the decision itself would not change. Rejected because building auth is one of Rihla's stated purposes.

## Scope

This rejects self-contained tokens for long-lived ambient identity, not in general. Webhook and provider-callback signature verification (M6, M9) and future internal service assertions remain correct uses. The M6 price-and-rate quote is not one, "cannot be paid after expiry" and "cannot be redeemed twice" both require state. That needs its own ADR, with open questions 1, 11, and 12.

## Revisit triggers

1. Session lookup becomes a measurable share of a hot-path p95. The answer is a cache, which is still this design.
2. The monolith is split. The browser boundary is unchanged; the edge mints internal assertions.
3. A mobile or third-party API client enters scope. That adds a credential type; it does not remove this one.
4. The zero revocation budget goes away. Unlikely while Rihla holds operator balances.

## References

- `docs/PRD.md` — Technical Considerations #4, #5; M2, M8, M10; open questions 5, 21, 22, 23
- `docs/definition.md` — "Key ADRs this implies": _Auth: sessions vs JWT_
- OWASP Session Management Cheat Sheet
