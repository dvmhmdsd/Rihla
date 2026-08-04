# Rihla — Project Definition

**One sentence:** a travel marketplace where travelers discover destinations, build multi-stop itineraries, and pay for tours and stays.

## Personas

- **Traveler:** searches destinations and tours in Arabic or English, assembles itineraries with dates, pays in their preferred currency, receives notifications on every booking and payment state change.

- **Operator:** a tour company or hotel. Creates listings, manages availability with capacity and pricing in their own settlement currency, confirms or rejects requests, tracks payouts.

- **Admin:** Moderates listings, resolves disputes and refunds, monitors provider health, payment reconciliation, and rate drift.

## The three hard problems (what makes this worth building)

_Rihla_ deliberately carries three different consistency problems, which is the whole point:

1. **Capacity under concurrency (owned inventory)** Two travelers grab the last slot simultaneously. _Rihla_ is source of truth here: transactional, atomic, enforced by constraints. This is your isolation-level and locking lab.

2. **Stale external state (provider inventory)** Inventory pulled from external suppliers, where _Rihla_ holds only a cached projection. Availability is stale by construction, and booking requires a remote call that can fail after you've told the user "available." You build a mock provider service for this — a separate app with a foreign data shape, injected latency, intermittent 500s, rate limits, and eventually-consistent availability. Real suppliers gate access behind business contracts and teach nothing architectural; the mock gives every hard problem on demand: anti-corruption layer, cache invalidation, sync strategy, idempotency keys, circuit breakers, reconciliation jobs.

3. **Money that must not be lost (payments)** Stripe in test mode — the complete real integration (webhooks, 3DS, failure cards, refunds, disputes) without moving real money or needing a business entity. The lessons are genuine: the payment-then-booking distributed transaction (captured but booking creation fails — now what?), idempotent webhook handling because Stripe retries, out-of-order webhook delivery, a payment state machine that must stay coherent with the booking state machine, refunds on cancellation, and ledger reconciliation against Stripe's records.

> Search must blend sources 1 and 2 into one ranked list. Booking must run both through one flow despite opposite guarantees. Payment must stay consistent with both. That's the system.

## Money model

- Integer minor units plus ISO currency code — never floats, anywhere
- Display currency (what the traveler browses in) vs listing currency (what the operator prices in) vs settlement currency (what Stripe charges in) are three distinct concepts
- Exchange rates cached with an as-of timestamp; a quoted price is honest until it expires, then re-quoted
- Explicit rounding rules, tested in aggregate so money doesn't leak
- ADR on money representation, quote expiry, and who bears rate risk
- Localization

## Arabic and English only, treated as a real requirement rather than a string-swap:

- RTL layout as a first-class concern in the Next.js app
- Multilingual search — Arabic analyzers, stemming, diacritics handling in the search engine; and cross-lingual retrieval when the vector phase arrives (an Arabic query should match an English-described tour)
- Locale-aware money and date formatting, which ties back to the currency model
- Deliberately skipping the long tail of locales — the architecture lesson is in the search and layout, not in string catalogs

## Core flows

1. **Signup:** role chosen at registration (traveler / operator), language and currency preference
2. **Search:** _Postgres_ full-text → dedicated search service → semantic and hybrid retrieval; blended owned + provider results, bilingual
3. **Itinerary building:** a named trip, ordered stops, dates per stop, running total in display currency
4. **Quote:** a priced, time-limited offer holding the exchange rate
5. **Booking + payment:** owned inventory: reserve → charge → confirm, transactionally coherent. Provider inventory: reserve → remote confirm → charge → reconcile, with every failure path handled honestly (including refund-on-failed-confirmation)
6. **Cancellation and refund:** policy-driven, partial refunds, currency-correct
7. **Notifications:** on every booking and payment state transition
8. **Operator dashboard:** listings, availability calendar, incoming requests, payouts
9. **AI layer:** semantic and cross-lingual search, a RAG assistant proposing itineraries from loose constraints, then an agent that assembles and books a multi-stop trip with human confirmation

## Data sourcing

- **Operator-created listings** as the primary owned inventory
- **Seed script** generating 100k+ rows from open geographic datasets (GeoNames, OpenStreetMap), with synthetic tours and availability layered on. Use real Egyptian and regional destinations, with Arabic and English names — makes both the search work and later demos land properly
- **Mock provider service** for external inventory, added once the core is stable

## Non-goals (defend these)

- No user-to-user chat 
- No reviews and ratings
- No mobile app
- No locales beyond Arabic and English
- No real supplier integrations
- No live-mode payments

Each would add work without adding a new architectural lesson.

## Key ADRs this implies

- **Monolith-first**, with extraction triggers
- **Auth:** sessions vs JWT
- **Booking state model and concurrency stance**
- **Money representation, quote expiry, and rate risk**
- **Payment-booking coordination:** saga vs two-phase, and the compensation paths
- **Webhook idempotency and ordering strategy**
- **Hybrid inventory:** owned and provider inventory in one search result and one booking flow
- **Bilingual search:** analyzers, and cross-lingual embedding strategy