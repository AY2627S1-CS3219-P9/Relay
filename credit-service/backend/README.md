# Relay Credit Service Backend

Authenticated credit balance and history API for Relay, backed by Prisma and
PostgreSQL. The source folders follow the User Service backend layout.

## Database

- `CreditBalance` / `credit_balances`: one record per user, with available and
  reserved credit balances and an automatically updated timestamp.
- `TransactionRecord` / `transaction_records`: transaction reference, timestamp,
  sender, receiver, transaction type, and amount.

The transaction reference is persisted as the canonical `service:id:type` key
from `@relay/contracts`. Its primary key prevents duplicate references. The API
returns the reference object specified by the contract. Credit amounts use
PostgreSQL decimals for arithmetic and are returned as numbers in HTTP responses.

User identifiers are strings, matching the contracts. Transaction history has no
foreign key to balance records, so deleting a balance does not delete history.
Prisma also maintains its standard `_prisma_migrations` metadata table.

Like the User Service, this backend uses the default generated `@prisma/client`.
Each Docker image generates its own client. For local development in the shared
workspace, generate the client for the service you are working on before building.

## Docker

From the repository root, start only this API and database:

```sh
docker compose up -d --build --wait credit-api credit-postgres
```

The database uses the named `credit-postgres-data` volume and is available on
localhost port 5435. The API uses port 3000 inside the Compose network. Startup
runs `prisma migrate deploy` before starting Express. `/health` and `/healthz`
query both models and return HTTP 503 if their tables or columns cannot be read.

```sh
docker compose exec credit-api wget -qO- http://127.0.0.1:3000/health
docker compose exec credit-api npx prisma migrate status --schema=credit-service/backend/prisma/schema.prisma
```

## Local development

Copy `.env.example` to `.env` in this backend folder. From the repository root:

```sh
npm install
npm run prisma:generate --workspace @relay/credit-backend
npm run prisma:migrate --workspace @relay/credit-backend -- --name your_change
npm run build --workspace @relay/credit-backend
npm run dev --workspace @relay/credit-backend
```

## HTTP API

| Method | Route                 | Response                                                  |
| ------ | --------------------- | --------------------------------------------------------- |
| GET    | `/api/credit`         | `{ userId, availableCredit, reserveCredit, lastUpdated }` |
| GET    | `/api/credit/history` | `{ records: TransactionRecord[] }`                        |
| POST   | `/internal/credit/reserve` | `CreditBalance & { status: 'RESERVE_SUCCESS' }` |

The two read routes forward the browser's Cookie header and the configured internal
user-service token to `POST /internal/user/session/validate` on User Service.
The validated Cognito subject selects the user's records. An optional `userId`
query parameter must match that subject; another user's ID returns 403.
Responses use the credit contract directly, without User Service's
`{ ok, data }` envelope. Dates are serialized as ISO strings.

Reserve accepts the contract body
`{ transactionReference: { service, id, type: 'CREDIT_RESERVE' }, userId, amount }`.
The internal route requires the configured x-credit-service-token header. The body
userId selects the balance to reserve. The amount must be a
nonnegative number. The balance and a `CREDIT_RESERVE` history record are updated
atomically. Repeating a reservation reference returns HTTP 409 with TRANSACTION_CONFLICT
without charging again. The same conflict applies when a release or transfer
transaction already exists with the same service and id. A missing balance returns `USER_NOT_FOUND` (404);
invalid amounts and insufficient available credit return 422.

History includes transactions where the user is sender or receiver, newest
first, with reference as a deterministic tie-breaker. No transactions returns
`{ records: [] }`. Missing or invalid authentication returns
`UNAUTHENTICATED` (401), invalid userId input returns `INVALID_REQUEST` (400),
and User Service failures/timeouts return 503.

Configure `USER_API_URL`, `USER_API_TIMEOUT` (milliseconds), and
`USER_SERVICE_INTERNAL_TOKEN`. The token must match User Service's
`INTERNAL_USER_SERVICE_TOKEN`. Compose configures the same local token used by
Supplier Service. User Service must be running for authenticated requests;
credit database health checks remain independent. The host proxies `/api/credit`
with the browser cookie to this API.

## Tests

With the credit database running, generate the client and build before testing:

```sh
cp credit-service/backend/.env.example credit-service/backend/.env && docker compose up -d --wait credit-postgres kafka kafka-init && npm run test --workspace @relay/credit-backend
```

The test script generates the Prisma client, applies pending migrations, builds
`dist/`, and then runs the HTTP, command, and Kafka integration tests. Local
host processes use Kafka's published listener at `localhost:29092`.

Integration tests use the configured real credit database and an HTTP test
server implementing the User Service session-validation boundary. Fixtures use
unique IDs and are removed afterward. Tests cover authentication forwarding,
expired sessions, outages/timeouts, ownership checks, balance serialization,
history filtering/ordering, reservation validation and idempotency, concurrent
spending, and the Kafka registration-to-transfer workflow.

## New-user credit allocation

User Service writes a version 1 `UserRegistered` envelope to its PostgreSQL
outbox when a profile is created. Its publisher sends the envelope to
`KAFKA_TOPIC_USER_EVENTS`. Credit Service reads `payload.cognitoSub` and
allocates 100 available credits and 0 reserved credits, with one
`INITIAL_ALLOCATION` transaction from `SYSTEM` to that user.

The `user:<cognitoSub>:INITIAL_ALLOCATION` reference makes replay safe.
Kafbat UI is available at http://localhost:8081; Prisma Studio for credit
is available at http://localhost:5556 when started in the credit container.

## Errand outcomes and user deletion

Credit Service consumes `KAFKA_TOPIC_ERRAND_EVENTS`. It maps
`ErrandCompleted` to a credit transfer, and `ErrandCancelled` or
`ErrandExpired` to a release. It ignores the other errand event types.
Credit Service uses the errand ID to read the prior reservation and takes
the requester and amount from that record. A completion, cancellation, or
expiry without a reservation is sent as an `ErrandErrorEvent` to
`KAFKA_TOPIC_ERRAND_DLQ`. When `ErrandCreationFailed` arrives before its
reservation, Credit Service atomically records a zero-amount reserve and
release without changing the balance. This prevents a delayed HTTP
reservation from charging the user. If a reservation already exists, that
failure event releases its reserved amount instead.

Release and transfer take the same per-reference database lock as reserve.
Exactly one terminal credit outcome can be recorded for an errand; a later
conflicting event goes to the DLQ. Duplicate events with the same outcome
are idempotent. Credit Service checks the requester and requires a courier
for completed errands. If DLQ publication fails, the source event is retried.

A `UserDeleted` event on `KAFKA_TOPIC_USER_EVENTS` removes the balance and
leaves a history record for the remaining total. A delayed registration event
cannot recreate a deleted balance. `kafka-init` creates `user-events`,
`errand-events` and `errand-events-dlq` before APIs start.
Credit Service publishes rejected errand outcomes to the errand DLQ. The
User Service has no DLQ topic.
