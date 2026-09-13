# ADR-0001: Session authority lives server-side

- **Status:** Accepted
- **Date:** 2026-09-13
- **Deciders:** Mohamed Saad
- **Blocks:** M2 (Accounts and roles)
- **Resolves:** PRD open question 23 (Session revocation)
- **Amends:** PRD Technical Considerations #5 (JWT Authentication)

## Context

M2 introduces accounts, roles, and sign-in. Before building it we must decide what a signed-in browser holds and what that credential means. The PRD's Technical Considerations #5 proposed JWT, justified by future scalability and service integration. Three requirements elsewhere in the same document contradict that justification.

### The decision that actually matters

"Sessions vs JWT" compares a pattern to a token format, and the comparison does not survive contact. A JWT can be short-lived and checked against a store on every request; an opaque token can be trusted blindly. The axis that decides the design is:

> **Where does the authority of a credential live — inside the token, or in our database?**

- **Self-contained credential.** The token _is_ the truth. Validation is a signature check, no lookup. The cost is that we cannot un-say it: once signed, it is valid until it expires, regardless of what we learn afterwards.
- **Reference credential.** The token is a pointer; truth lives in our store and is read on every request. The cost is a lookup per request.

The trade is **one lookup against the ability to change our mind.** Cookies vs. headers, refresh tokens, rotation and sliding windows are mechanisms hanging off that choice, not the choice itself.

### Constraints that decide it

1. **PRD open question 23:** "the auth mechanism must allow immediate suspension to take effect ... token-based auth without a revocation list does not."
2. **M10 acceptance criteria:** "Suspension takes effect **on the next request**, not at session expiry." This is a testable non-functional requirement, not a preference.
3. **M2 and M8:** roles are _mutable_. Operator status is granted by admin approval and revoked by admin action, and M8 requires that "operators can only ever see and act on their own data," enforced server-side.

Stated as an engineering quantity: **our revocation latency budget is zero — one request, not one TTL.** A self-contained credential cannot meet a zero revocation budget; that is what "self-contained" means. Every patch for it (denylist table, token version counter, `sessions_invalidated_after` timestamp) restores the per-request database read, at which point we have built a session with an unused signature and a second failure mode attached.

A fourth constraint raises the stakes: **this system moves money.** An admin suspending a fraudulent operator mid-M10 — while that operator is taking bookings and accruing a payable balance — cannot wait out a token TTL. Under open question 5 (negative balance recovery) that money may not be recoverable.

### Cost of the rejected benefit

The only benefit a self-contained credential buys is avoiding a network hop to validate identity. For Rihla that hop is a primary-key read on Postgres, on the connection pool the request already needs for its business query: sub-millisecond, and cacheable. Against our stated budgets of 300 ms p95 for search and 2 s p95 for booking confirmation, it is under 0.5% of the budget. At the 10× scalability target it is still a primary-key read. Search will be the bottleneck long before auth is.

The integration benefit is also not available to us: Technical Consideration #4 commits to a monolith. There is no second service to federate to. We would pay the cost from the first request in exchange for a benefit arriving at a split we have explicitly deferred — and when that split comes, the standard answer is different anyway: the edge validates the session once and mints a short-lived internal assertion for downstream services. **Our public browser-held credential and our internal service-to-service credential are different credentials with different requirements.** Collapsing them into one is what forces the bad trade.

## Decision

**Authentication state is a server-side session. The browser holds an opaque random token in an httpOnly cookie. Postgres is the source of truth.**

### Session store

A `sessions` table holding: `id`, `user_id`, `token_hash`, `created_at`, `last_seen_at`, `idle_expires_at`, `absolute_expires_at`, `revoked_at`, `revocation_reason`, `ip`, `user_agent`.

- The token is 256 bits from a CSPRNG, base64url-encoded. We store **only its SHA-256 hash**, indexed. It is a bearer credential and is treated like a password — but a fast hash is correct here, not a slow KDF: the token is full-entropy and has no offline-guessing weakness to defend against.
- **Idle expiry** of 30 days, **absolute expiry** of 90 days. The idle window satisfies M2's "stay signed in across a browser restart"; the absolute cap gives M2's "session expiry behaviour is defined and tested" a hard bound that a sliding window alone would never reach.
- `last_seen_at` is written at most once per 60 seconds per session, so refreshing the idle window does not put a write on every request inside a 300 ms budget.
- The session id is **rotated on sign-in and on any privilege change**, closing session fixation.
- Expired and revoked rows are deleted by a scheduled cleanup; `revocation_reason` is retained in the M10 audit log rather than in the session table.

### Authorization

Roles and suspension status are read **per request**, joined off the session — never baked into the credential. An admin approves an operator and the next request sees the operator surface; an admin suspends a user and the next request is rejected. M2, M8 and M10's acceptance criteria are then satisfied by construction rather than by a test hoping to catch drift.

### Transport

- Cookie: `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
- The Next.js frontend and Nest backend are separate origins. **The frontend proxies `/api/*` to the backend** so the browser only ever sees one origin. The alternative — sibling subdomains with a `.rihla.com` cookie — forces us down from `__Host-` to `__Secure-` (the `__Host-` prefix forbids a `Domain` attribute) and puts a cross-site cookie in the browser. The proxy costs a hop we already pay on server components.
- **CSRF is the price of cookies.** Cookies are ambient authority: the browser attaches them whether or not our code asked. `SameSite=Lax` covers most of it; unsafe methods additionally require an `Origin` check.

We accept CSRF defence rather than using an `Authorization: Bearer` header from JavaScript. The header approach avoids CSRF but requires the token to live somewhere JavaScript can read, making a single XSS a total credential compromise. **CSRF is a bounded protocol problem with cheap known mitigations; XSS token theft is unbounded.**

### Not adopted now

No Redis. A sub-millisecond Postgres read does not justify an operational dependency, and adding one now would be solving a problem we have not measured.

## Consequences

**Gained**

- Immediate revocation: suspension, sign-out-everywhere, and account deletion (M2, M10) are `UPDATE` and `DELETE` statements that take effect on the next request.
- Role changes are never stale, so M2's admin-approval gate and M8's data isolation need no cache-invalidation story.
- "My active sessions and devices" is free, as is per-session audit context for M10.
- The credential is inert if stolen from our database (we store hashes) and unreadable by JavaScript (httpOnly).
- The choice is cheaply reversible; see _Revisit triggers_.

**Paid**

- One indexed read per authenticated request, and a Postgres dependency on the auth path. Sign-in fails if the database is down — acceptable, since nothing else in Rihla works then either.
- CSRF defence is now mandatory on every state-changing route, and must be enforced centrally (a Nest guard) rather than per-handler.
- The `sessions` table grows and needs a cleanup job.
- A non-browser API client story (none is in scope) would need its own credential type.

**Neutral**

- The API is not stateless, so horizontal scaling requires shared session storage. Postgres already is that. This is not sticky-session coupling.

## Alternatives considered

**1. Stateless JWT access token plus refresh token.** Rejected. Cannot meet the zero revocation budget in M10's acceptance criteria, and bakes mutable roles into an immutable token, contradicting M2 and M8. It also brings refresh rotation, replay detection, and client-side expiry handling — real complexity bought for a latency saving we measured at under 0.5% of budget.

**2. JWT with a denylist or a per-user token-version counter.** Rejected. This restores correct revocation by restoring the per-request database read — the exact cost the design existed to avoid — and leaves us with a larger token and a signature we no longer rely on, plus algorithm-confusion and key-rotation failure modes an opaque token does not have. **Do not pay for a property already decided against.**

**3. Very short-lived JWTs (≈60 s) with silent refresh.** Rejected. It converts "zero revocation latency" into "up to 60 seconds," which M10 does not permit, and the refresh endpoint performs a store lookup anyway — a session with extra steps and a worse worst case.

**4. A managed identity provider (Clerk, Auth0, Better Auth).** Rejected for this project. All of them resolve to a session model, so it would not change this decision — but authentication is one of the systems Rihla exists to build and understand, and outsourcing it removes the lesson without removing the complexity of integrating it.

## Where signed self-contained tokens are still correct

This ADR rejects stateless tokens for **long-lived ambient identity**, not in general. They remain the right tool for **short-lived, narrow-scope, self-expiring assertions where the cost of being unable to revoke is bounded by a TTL we are content to absorb**:

- **Stripe webhook and mock-provider callback signature verification** (M6, M9) — proving origin with no lookup.
- **Internal service-to-service assertions**, if and when the monolith is split.
- **Email verification and password reset links** (M2) — though we will use stored single-use tokens instead, because single-use requires state.

The **price-and-rate quote** in M6 looks like an ideal self-contained token — a signed, time-limited claim about a price. It is not, for the same reason: "an expired quote cannot be paid" _and_ "a quote cannot be redeemed twice" together require state. That belongs in its own ADR alongside open questions 1, 11 and 12.

## Revisit triggers

Reopen this decision if any of these becomes true:

1. Profiling shows session lookup is a measurable share of the p95 budget on a hot path. **First response is a cache, not a format change** — which is still this design.
2. The monolith is split (Technical Consideration #4's extraction triggers fire). Even then the fix is edge-minted internal assertions, and this ADR stays true at the browser boundary.
3. A first-party mobile or third-party API client enters scope, needing a non-cookie credential. That adds a credential type; it does not remove this one.
4. A future requirement removes the zero revocation budget. This is unlikely while Rihla holds operator balances.

## References

- `docs/PRD.md` — Technical Considerations #4, #5; M2, M8, M10; open questions 5, 21, 22, 23
- `docs/definition.md` — "Key ADRs this implies": _Auth: sessions vs JWT_
- OWASP Session Management Cheat Sheet
- RFC 6265bis — cookie name prefixes (`__Host-`), `SameSite`
