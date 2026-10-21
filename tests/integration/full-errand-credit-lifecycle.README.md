# Full errand and credit lifecycle demo

Import `full-errand-credit-lifecycle.postman_collection.json` into Postman and run the whole collection in order against the local Compose stack. Use a 1,000 ms Collection Runner request delay. The collection creates fresh requester and courier accounts, reads verification codes from local Floci SES, creates their profiles, and creates an operational supplier with the bootstrapped super admin. Its seven folders then exercise expiry, requester cancellation, successful completion, credit reads, and errand reads. Each relevant credit GET retries for asynchronous settlement, with a finite limit. Manual Send works for individual requests, but automatic retries require the Collection Runner.

Defaults are `baseUrl=http://localhost:8080`, `flociUrl=http://localhost:4566`, `superAdminEmail=admin@example.com`, and the passwords used by the local demo. Set password variables to your actual local credentials when they differ. This collection is for the local Floci setup because it reads the local SES mailbox. Keep real credentials in Postman secret or environment variables; do not export them with saved values.

## What the requests demonstrate

| Scenario | Requester available / reserved | Courier available | Credit record |
| --- | --- | --- | --- |
| Both profiles created | 100 / 0 | 100 | `INITIAL_ALLOCATION` per user |
| 10-credit expiring order created | 90 / 10 | 100 | `CREDIT_RESERVE` |
| Another 95-credit order attempted | 90 / 10 | 100 | Rejected with `INSUFFICIENT_CREDIT`; no debit |
| Order expires | 100 / 0 | 100 | `CREDIT_RELEASE` |
| 15-credit order created, then cancelled | 85 / 15, then 100 / 0 | 100 | Reserve, then release |
| 20-credit order created, then confirmed | 80 / 20, then 80 / 0 | 100, then 120 | Reserve, then transfer |

Creating an errand validates the supplier, inserts a pending errand, reserves credit through the Credit Service's authenticated internal HTTP endpoint, then commits the errand. Credit Service reserves inside one database transaction: it updates a balance only if `availableCredit >= amount`, moves that amount from available to reserved, and inserts the reference record. Reserved credit is excluded from the available balance for subsequent orders. These sequential Postman assertions demonstrate the guard and balance invariant; the repository's concurrency tests, rather than this collection, check simultaneous reservations.

Cancellation and expiry write an Errand Service outbox event with the state transition. Confirmation writes a completion event. The outbox publisher sends events to Kafka. Credit Service consumes the event and performs release or transfer with the balance changes and transaction record in one database transaction. The per-errand reference prevents duplicate or conflicting settlement. Credit transfers debit requester reserved credit and credit courier available balance in that same Credit Service transaction. The collection polls credit reads because errand state may be visible before Kafka settlement.

## Interfaces and failure handling

| Interface | Caller | Purpose |
| --- | --- | --- |
| `GET /api/credit`, `GET /api/credit/history?offset=0` | Authenticated user through the host | Own balance and history only |
| `POST /internal/credit/reserve` | Errand Service with `x-credit-service-token` | Reserve before errand creation |
| `user-events` Kafka topic | User Service publisher ? Credit Service consumer | Allocate initial credit after profile creation; process deletion |
| `errand-events` Kafka topic | Errand Service publisher ? Credit Service consumer | Release after creation failure, cancellation, or expiry; transfer after completion |

If reserve succeeds but errand creation fails, Errand Service writes `ERRAND_CREATION_FAILED` to its outbox and removes the pending errand; Credit Service releases the reservation when it consumes that event. A pending-errand worker checks every five seconds for pending rows older than 30 seconds and emits the same failure event when recovery is needed. Credit Service handles a failure event that arrives before the reservation by writing a zero-amount tombstone, preventing a late reserve from creating stranded credit.

If an errand is confirmed but Credit Service cannot transfer immediately, the errand remains confirmed while credit still shows reserved. The outbox publisher retries Kafka delivery until it is marked published. After the event reaches Credit Service, processing errors are written to `errand-events-dlq` and the source offset advances; such a DLQ entry needs investigation and controlled replay after the cause is fixed. A DLQ publish failure keeps the source message retryable. Thus a persistent Credit Service settlement failure is **not automatically resolved** after successful DLQ publication. Compare a confirmed errand, its missing `CREDIT_TRANSFER` history entry, and the DLQ to detect the mismatch.

## Demonstrating reserve success followed by creation failure

An ordinary Postman request cannot reliably force a database failure specifically between successful reserve and errand commit. Validation errors and supplier rejection happen before reserve, so they do not exercise compensation. For a controlled demo, use a test-only fault injection in Errand Service's `createErrand` path immediately after `creditClient.reserve()` succeeds and before `repository.createErrand()` commits. The fault should trigger the existing catch path, not bypass it. Then use Postman to submit an otherwise valid errand and watch the requester move from `available=100, reserved=0` to `available=90, reserved=10`, then back to `100, 0`, with a `CREDIT_RESERVE` and `CREDIT_RELEASE` sharing the same errand reference. A narrow test or temporary development-only hook can hold the catch path briefly to make the intermediate reserved state visible. Remove that hook after the demo. The current collection does not inject this fault or claim to verify that failure path.
