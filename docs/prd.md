# Product Requirements Document (Rihla)

## Overview

A marketplace for travelers to discover destinations, build multi-stop itineraries, and pay for tours and stays. The platform will support both Arabic and English languages, with a focus on seamless user experience, robust payment processing, and reliable inventory management.

## Problem Statement

Travelers may face challenges in building and planning for their tours. Operators may struggle to manage their listings, availability and payments. The platform aims to address these issues by providing a comprehensive solution that connects travelers with operators, ensuring a smooth booking and payment process.

## Goals

1. Provide a user-friendly interface for travelers to search and book tours and stays.
2. Enable operators to manage their listings, availability, and pricing effectively.
3. Ensure secure and reliable payment processing for both travelers and operators.
4. Support bilingual functionality (Arabic and English) with proper localization and formatting.
5. Implement a robust system for handling concurrency, stale external state, and payment consistency.

## Non Goals

1. Support for additional languages beyond Arabic and English.
2. Integration with real external providers beyond the mock provider service.
3. Handling of complex travel scenarios such as visa requirements, travel insurance, or multi-modal transportation planning.
4. Development of a mobile application; the focus will be on a web-based platform.
5. Support for advanced AI features beyond the initial semantic search and itinerary assistance.
6. Support user to user chat or messaging. The platform will focus on connecting travelers with operators, not facilitating direct communication between users.
7. Handling reviews and ratings. The platform will focus on the booking and payment process, not on user-generated content or feedback mechanisms.
8. Support editing booking dates. The platform will only allow cancellations and re-bookings, not modifications to existing bookings.

## Users Personas

1. **Traveler:** Searches for destinations and tours in Arabic or English, assembles itineraries with dates, pays in their preferred currency, and receives notifications on every booking and payment state change.

2. **Operator:** A tour company or hotel that creates listings, manages availability with capacity and pricing in their own settlement currency, and tracks payouts.

3. **Admin:** Moderates listings, resolves disputes and refunds, monitors provider health, payment reconciliation, and rate drift.

## Requirements

### Functional Requirements

1. **User Registration and Authentication:** Users must be able to register and log in to the platform.
2. **Search and Discovery:** Travelers must be able to search for destinations and tours in both Arabic and English, with support for bilingual search and semantic retrieval.
3. **Itinerary Building:** Travelers must be able to create and manage multi-stop itineraries, including adding dates and viewing a running total in their display currency.
4. **Booking and Payment:** The platform must support booking and payment processes for both owned and provider inventory, ensuring transactional coherence and handling all failure paths.
5. **Cancellation and Refunds:** The platform must support policy-driven cancellations and refunds, including partial refunds and currency-correct processing.
6. **Notifications:** Users must receive notifications on every booking and payment state transition.
7. **Operator Dashboard:** Operators must have access to a dashboard for managing listings, availability, incoming requests, and payouts.
8. **AI Layer:** The platform must include an AI layer for semantic and cross-lingual search, itinerary assistance, and multi-stop trip assembly with human confirmation.
9. **Data Sourcing:** The platform must support operator-created listings as the primary owned inventory, with a seed script generating synthetic tours and availability from open geographic datasets, and a mock provider service for external inventory.
10. **Localization:** The platform must support proper localization for Arabic and English, including RTL layout, multilingual search, and locale-aware money and date formatting.
11. **Money Model:** The platform must support integer minor units plus ISO currency code, with distinct display, listing, and settlement currencies, cached exchange rates, explicit rounding rules, and tested aggregate money representation.

## Non-Functional Requirements

1. **Performance:** search returns within _300_ ms at _p95_ with a catalog of 100k+ listings; booking confirmation completes within _2 s_ at p95 under normal load.
2. **Reliability:** booking success rate stays above _99.5%_, excluding legitimate sold-out and payment-declined outcomes. Search degradation must not affect the booking path.
3. **Observability:** a performance regression or elevated error rate is detectable from monitoring before users report it, and diagnosable without deploying additional code.
4. **Scalability:** the system sustains its performance targets at _10×_ current catalog size and _10×_ concurrent users without architectural change.

## Technical Considerations

1. **Technology Stack:** The platform will be built using Next.js for the frontend, Postgres for the database, and a dedicated search service for semantic and hybrid retrieval.
2. **Integration with Stripe:** The platform will integrate with Stripe for payment processing, including support for webhooks, 3DS, failure cards, refunds, and disputes, without moving real money or needing a business entity.
3. **Mock Provider Service:** A separate application will be developed to simulate external supplier inventory, with injected latency, intermittent failures, rate limits, and eventually-consistent availability.
4. **Monolithic Architecture:** The platform will be designed as a monolithic application, with clear separation of concerns and modular components to facilitate development, testing, and deployment. Then in the future, the architecture can be evolved into a microservices-based architecture if needed, based on performance and scalability requirements.
5. **JWT Authentication:** The platform will use JWT for secure user authentication and authorization, ensuring that only authorized users can access specific features and data. This will be helpful to scale the application in the future, as it allows for easy integration with other services and APIs, while maintaining a secure and consistent authentication mechanism across the platform.
6. **Testing and Quality Assurance:** The platform will implement comprehensive testing strategies, including unit tests, integration tests, and end-to-end tests, to ensure the quality and reliability of the application. Automated testing frameworks will be used to facilitate continuous integration and deployment processes.
7. **Observability and Load Testing:** distributed tracing across all request paths, structured logging with correlation IDs, dashboards for the defined service levels, and a repeatable load test used to verify the non-functional requirements before each significant release.

## Milestones

### M1: A catalog worth searching

**Goal:** travelers can find things, before they can do anything with them.

**Stories**

- As a traveler, I can see featured destinations and tours on the homepage without searching
- As a traveler, I can search destinations and tours by free text and see ranked results
- As a traveler, I can filter by destination, date range, and price range
- As a traveler, I can open a tour and see its description, location, duration, and price
- As a traveler, I see prices in a single default currency at this stage

**Acceptance criteria**

- Search returns results in under 300 ms at 100k+ catalog rows
- Empty and no-match states are handled explicitly
- Every listing has bilingual name fields populated (display is English-only for now)

**Out of scope:** personalization, semantic search, provider inventory.

**Exit gate:** a stranger can search a seeded catalog and browse to a tour detail page.

---

### M2: Accounts and roles

**Goal:** the system knows who is asking.

**Stories**

- As a visitor, I can register as either a traveler or an operator (Operator role is gated by an admin approval step)
- As a user, I receive an email to verify my account before I can book or list anything
- As a user, I can reset my password if I forget it
- As a user, I can delete my account, and any existing bookings are handled according to policy
- As a user, I can sign in, sign out, and stay signed in across a browser restart
- As a user, my account carries a set of roles; the operator surface admits me only if operator is among them, and the same account can still book as a traveler.
- As a user, I can set my preferred language and display currency on my profile

**Acceptance criteria**

- Role checks are enforced server-side, not only hidden in the UI
- Session expiry behaviour is defined and tested
- Preferences persist and drive subsequent requests

**Exit gate:** two accounts of different roles see demonstrably different systems.

---

### M3: Money is modelled correctly

**Goal:** prices are trustworthy before anything charges for them.

**Stories**

- As an operator, I price my listings in my own settlement currency
- As a traveler, I browse prices converted into my display currency
- As a traveler, I see when a converted price was last updated
- As an admin, I can view current exchange rates and their as-of timestamps

**Acceptance criteria**

- All monetary values stored as integer minor units with an explicit currency code — no floating point anywhere in the money path
- Display, listing, and settlement currencies are distinct concepts in the model
- Rounding rules are documented and verified in aggregate (a large batch of conversions loses no money)
- Rates are cached with an as-of timestamp and a defined staleness policy

**Out of scope:** paying, refunds, payouts.

**Exit gate:** an EGP-priced listing displays correctly to a EUR-preferring traveler, with a rate timestamp visible.

---

### M4: Itineraries

**Goal:** travelers assemble a trip, not just view products.

**Stories**

- As a traveler, I can create a named trip with a date range
- As a traveler, I can add tours as ordered stops with per-stop dates
- As a traveler, I can reorder and remove stops
- As a traveler, I see a running total in my display currency
- As a traveler, I am warned when two stops conflict in time

**Acceptance criteria**

- Itineraries persist per user and survive sign-out
- Totals recompute correctly when currency preference changes
- Date conflicts are detected and surfaced, not silently allowed

**Exit gate:** a traveler builds a three-stop trip and sees a correct total.

---

### M5: Booking owned inventory

**Goal:** the first real commitment --> a seat is actually taken.

**Stories**

- As an operator, I define availability slots with capacity and price
- As a traveler, I book an available slot and it is confirmed immediately
- As a traveler, I am told clearly when a slot sells out while I am looking at it
- As a traveler, I can see all my bookings and their statuses
- As an operator, I see the bookings made against my listings
- As a traveler, I can cancel according to the listing's cancellation policy

**Acceptance criteria**

- Capacity is never oversold under concurrent requests which is verified by a test that fires simultaneous bookings at the last remaining slot
- Booking status follows a defined state machine; illegal transitions are rejected
- A sold-out slot fails the booking attempt cleanly, with the traveler told why rather than shown a generic error
- Cancellation policy is a per-listing rule, and its effect is deterministic
- Cancelling returns capacity to the slot, and that capacity is immediately bookable

**Out of scope:** money changing hands, provider inventory, request-to-book with operator approval.

**Exit gate:** a concurrency test proves the last slot goes to exactly one traveler, and a cancelled booking's seat is provably reusable.

---

### M6: Paying for a booking

**Goal:** money and commitment stay consistent with each other.

**Stories**

- As a traveler, I receive a time-limited quote that locks my price and exchange rate
- As a traveler, I pay by card and see the booking confirmed
- As a traveler, if my payment fails, no seat is held and I am told why
- As a traveler, if I cancel within policy, I receive the correct refund
- As a traveler, I can see my payment history and the status of each payment
- As a traveler, I can see a receipt after payment and a voucher for the booking, both bilingual and downloadable
- As an operator, I see the amount I will be paid in my settlement currency
- As an admin, I can see payments that succeeded while their booking did not

**Acceptance criteria**

- Quotes expire; an expired quote cannot be paid and must be re-quoted
- Duplicate payment notifications never produce duplicate bookings or duplicate charges
- Payment notifications arriving out of order still leave the system in the correct final state
- Every payment reconciles against a booking; unmatched payments are visible to an admin
- Refunds are currency-correct and traceable to the original payment

**Out of scope:** live-mode payments, real payouts, disputes automation.

**Exit gate:** a full pay-and-confirm flow works, and each injected failure (payment declined, notification duplicated, notification delayed, confirmation failing after charge) resolves to a correct, explainable state.

---

### M7: Notifications

**Goal:** users learn about changes without refreshing.

**Stories**

- As a traveler, I am notified when my booking is confirmed, rejected, cancelled, or refunded
- As an operator, I am notified when a new request arrives
- As a user, I can see a history of my notifications

**Acceptance criteria**

- Notifications are delivered at least once and never duplicated to the user
- A notification failure never blocks or reverses the underlying booking or payment
- Every booking state transition has a defined notification (or an explicit decision not to notify)

**Exit gate:** the notification pipeline can be down for ten minutes and users still receive everything afterwards.

---

### M8: Operator dashboard

**Goal:** the supply side becomes self-service.

**Stories**

- As an operator, I create, edit, and unpublish listings
- As an operator, I manage an availability calendar with capacity and pricing
- As an operator, I can mark a listing as request-to-book, and approve or decline requests against it within a defined window
- As an operator, I see earnings by period in my settlement currency

**Acceptance criteria**

- Editing a listing never invalidates existing confirmed bookings
- Unpublishing hides a listing from search but preserves its bookings
- Operators can only ever see and act on their own data

**Exit gate:** an operator can run their whole business without a developer's help.

---

### M9: Provider inventory

**Goal:** the catalog grows beyond what Rihla owns.

**Stories**

- As a traveler, I see externally sourced tours alongside operator-listed ones in one ranked list
- As a traveler, I can tell what kind of availability guarantee a listing carries
- As a traveler, if an external tour turns out to be unavailable at booking time, I am told immediately and not charged
- As an admin, I can see provider health and any inventory that has drifted out of sync

**Acceptance criteria**

- Provider outages degrade search rather than breaking it but owned inventory still returns
- Provider slowness never blocks the booking of owned inventory
- A booking attempt that fails remotely after payment authorization resolves without charging the traveler
- Cached provider data has a visible freshness bound, and drift is detected by a reconciliation process

**Exit gate:** with the provider returning errors 50% of the time and injected latency, the traveler experience stays correct and honest.

---

### M10 — Administration and moderation

**Goal:** someone can run the marketplace and fix what breaks.

**Stories**

- As an admin, I review and approve operator applications before they can list
- As an admin, I can unpublish a listing that violates policy, and the operator is told why
- As an admin, I can suspend a user, and their access ends immediately
- As an admin, I can issue a manual refund outside normal policy, with a required reason
- As an admin, I can resolve a payment that succeeded without a matching booking
- As an admin, I can see system health, error rates, and provider status in one place

**Acceptance criteria**

- Every admin action is recorded in an audit log with actor, timestamp, and reason
- Suspension takes effect on the next request, not at session expiry
- Manual refunds produce correct ledger entries, the same as policy-driven ones
- Admin capability is a role, subject to the same server-side enforcement as every other role

**Exit gate:** an admin can take a bad listing down, refund its bookings, and suspend its operator, with a complete audit trail.

---

### M11: Arabic and RTL

**Goal:** the product works properly for its actual audience.

**Stories**

- As a traveler, I can use the entire product in Arabic with a right-to-left layout
- As a traveler, I can search in Arabic and find listings described in English, and vice versa
- As a traveler, I see dates, numbers, and prices formatted for my locale
- As an operator, I can provide bilingual listing content

**Acceptance criteria**

- Every core flow completes in both languages, verified end to end
- Arabic search handles diacritics and common spelling variation
- Layout mirrors correctly, including icons, spacing, and form flow

**Exit gate:** the full booking-and-payment flow completes in Arabic, RTL, with an Arabic query matching English content.

---

### M12: Intelligent search and assistance

**Goal:** travelers describe what they want instead of filtering for it.

**Stories**

- As a traveler, I can search by meaning ("quiet diving trip, mid-budget, five days") and get sensible results
- As a traveler, I can ask an assistant to propose an itinerary from loose constraints, and see why each item was chosen
- As a traveler, I can have an assistant assemble a multi-stop trip and book it, with an explicit confirmation step before anything is charged

**Acceptance criteria**

- Result quality is measured against a labelled evaluation set, not judged by impression
- The assistant's proposals cite the listings they came from
- No booking or charge occurs without explicit human confirmation
- Cost and latency per assisted session are tracked and bounded

**Exit gate:** the assisted flow beats plain search on the evaluation set, and completes a real end-to-end booking under human confirmation.

## Open Questions

Unresolved decisions. Each is answered before the milestone that depends on it, and the answer is recorded in an ADR. Questions marked **blocking** must be settled before building the listed milestone.

### Money and payouts

1. **Custody model:** _(blocking M6)_ does Rihla collect payments and hold operator balances until payout, or do payments route directly to operator accounts with Rihla taking a fee? This decides whether Rihla needs a ledger, and whether refunds flow through Rihla's balance or the operator's.
2. **Platform fee model:** flat percentage, tiered by volume, or per listing type? Charged to the operator, added to the traveler's price, or split? Is the fee refunded when a booking is refunded?
3. **Pending-to-available period:** how long are earnings held before becoming payable? Does it vary by cancellation policy, since flexible bookings carry refund risk for longer?
4. **Payout schedule:** fixed cadence, operator-selected, or on-demand above a minimum threshold? Who absorbs the transfer cost on small payouts?
5. **Negative balance recovery:** when a refund exceeds available balance, is it recovered from future earnings only, or pursued directly? What if the operator never sells again? Is there a threshold that blocks further payouts?
6. **Fee and payout currency:** if a traveler pays in EUR, the operator prices in EGP, and settlement is in USD, which currency is the fee taken in, and who bears the conversion spread on the payout leg?
7. **Payout onboarding gate:** must operators complete payout details before listing, or only before their first payout?
8. **Failed payout handling:** automatic retry or admin intervention? Does the balance return to pending or stay available?
9. **Reconciliation cadence and tolerance:** how often is the internal ledger checked against the payment provider, and what discrepancy size triggers an alert versus silent correction?
10. **Dispute liability:** when a traveler charges back after the operator has been paid, who absorbs the loss?
11. **Quote validity window:** _(blocking M6)_ how long is a price-and-rate quote honoured, and who absorbs rate movement if it expires mid-checkout?

### Booking model

12. **Itinerary as a booking unit:** _(blocking M4)_ is an itinerary a container of independently booked items, or can it be booked atomically (all stops or none)? Atomic booking across owned and provider inventory is a multi-party distributed transaction and changes M4, M5, and M6 substantially.
13. **Cancellation policy taxonomy:** _(blocking M5)_ a fixed set of policies operators choose from, or freeform rules? Fixed is simpler to reason about and to display honestly.
14. **Request-to-book window:** when a listing requires operator approval, how long does a request hold capacity, and what happens to unanswered requests?
15. **Booking modification:** currently a non-goal (cancel and rebook only). Confirm this holds, or define what a date change would mean for price and availability.
16. **Group bookings:** can one booking cover multiple travelers against a single slot, and does capacity decrement by party size?

### Inventory and search

17. **Provider booking failure after charge:** _(blocking M11 provider work)_ is the traveler refunded automatically, or offered an alternative first?
18. **Search ranking between inventory sources:** should owned inventory rank above provider inventory, and is that ranking preference disclosed to travelers?
19. **Provider data freshness bound:** how stale may cached provider availability be before it is withheld from search rather than shown with a caveat?
20. **Duplicate listings across sources:** if the same tour appears in both owned and provider inventory, are they merged, deduplicated, or shown twice?

### Accounts and access

21. **Operator verification:** _(blocking M2 onboarding)_ what evidence is required before an operator can list? Document upload, or admin judgement on the application alone?
22. **Account deletion policy:** what happens to a traveler's booking history, an operator's listings, and outstanding balances on deletion?
23. **Session revocation:** _(blocking M2)_ the auth mechanism must allow immediate suspension to take effect. Confirm the chosen approach supports this, since token-based auth without a revocation list does not.

### Localization

24. **Content translation responsibility:** do operators supply both language versions, or does the platform translate? Missing translations shown as-is, hidden, or machine-translated with a label?
25. **Currency defaults by locale:** does an Arabic-language visitor default to EGP, or is currency independent of language?

### AI layer

26. **Assistant booking authority:** the human confirmation step is fixed, but at what granularity? Per booking, or one confirmation for an assembled multi-stop trip?
27. **Evaluation ownership:** who labels the evaluation set, and how often is it refreshed as the catalog grows?

### Observability and operations

28. **Instrumentation boundary:** is tracing added at the framework edge only (HTTP in, DB out), or do domain operations emit their own spans? The second gives far better answers to "why did this booking fail" but couples domain code to the telemetry library. This is the one real design decision in this section.
29. **Correlation across async boundaries:** how does a trace follow a booking through the queue into notifications, payouts, and provider sync? Trace context must be carried in message metadata, which is a contract decision, not a config one.
30. **What counts as an error:** a sold-out booking attempt and a declined card are normal outcomes, not failures. Which outcomes count against the booking success rate, and which are recorded but excluded?
31. **Alert thresholds and ownership:** which conditions warrant an alert versus a dashboard someone checks? With a single operator (you), an alert that fires when nobody is available is noise. What is the minimum useful alert set?
32. **Retention and cost:** how long are traces, logs, and metrics kept, and at what sampling rate? Full-fidelity tracing at load is expensive; tail-based sampling of errors and slow requests is usually the answer.
33. **PII in telemetry:** traveler names, emails, and payment identifiers must not land in logs or spans. What is redacted, and where is that enforced?
34. **Provider and payment health as first-class signals:** is external dependency health surfaced as its own dashboard and alert, separate from Rihla's own error rates? A provider outage is not a Rihla outage but looks like one in aggregate metrics.

> We need to address questions 1, 11, 12, and 23. Each one is load-bearing for work that starts soon, and each is expensive to reverse once built.
