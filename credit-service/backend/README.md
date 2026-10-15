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
| POST   | `/api/credit/reserve` | `CreditBalance & { status: 'RESERVE_SUCCESS'              | 'ALREADY_RESERVED' }` |

All routes forward the browser's Cookie header and the configured internal
service token to `POST /internal/user/session/validate` on User Service.
The validated Cognito subject selects the user's records. An optional `userId`
query parameter must match that subject; another user's ID returns 403.
Responses use the credit contract directly, without User Service's
`{ ok, data }` envelope. Dates are serialized as ISO strings.

Reserve accepts the contract body
`{ transactionReference: { service: 'errand', id, type: 'CREDIT_RESERVE' }, userId, amount }`.
The body userId must match the authenticated subject. The amount must be a
positive number. The balance and a `CREDIT_RESERVE` history record are updated
atomically. Repeating the same reference and details returns `ALREADY_RESERVED`
without charging again; reusing the reference with different details returns
`INVALID_REQUEST` (400). A missing balance returns `USER_NOT_FOUND` (404);
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
npm run prisma:generate --workspace @relay/credit-backend
npm run build --workspace @relay/credit-backend
npm run test --workspace @relay/credit-backend
```

Integration tests use the configured real credit database and an HTTP test
server implementing the User Service session-validation boundary. Fixtures use
unique IDs and are removed afterward. Tests cover authentication forwarding,
expired sessions, outages/timeouts, ownership checks, balance serialization,
history filtering/ordering, reservation validation and idempotency, concurrent
spending, and the Kafka registration-to-transfer workflow.

## New-user credit allocation

When User Service creates a profile, it writes a `UserRegisteredEvent` to its PostgreSQL
outbox in the same transaction. Its publisher sends the event to the
`KAFKA_TOPIC_USER_REGISTERED` Kafka topic. The credit consumer in `src/consumers/`
translates the event to `AllocateInitialCreditCommand` and creates a balance
with 100 available credits and 0 reserved credits, plus one
`INITIAL_ALLOCATION` transaction from `SYSTEM` to the Cognito subject.

The reference `user:<cognitoSub>:INITIAL_ALLOCATION` is unique. The balance and
transaction are written atomically, so a replay does not issue more credit.
Configure `KAFKA_BROKERS` to match the local cluster.
Kafbat UI is available at http://localhost:8081; Prisma Studio for credit is
available at http://localhost:5556 when started in the credit container.

## Errand outcomes and user deletion

The consumer maps `ErrandConfirmedEvent` to `TransferCreditCommand`: it moves the
errand amount from the requester reserved balance to the courier available
balance. `ErrandCancelledEvent` and `ErrandExpiredEvent` map to
`ReleaseCreditCommand`, returning the amount from reserved to available.
These operations require the errand amount to have been reserved already.
Both operations use `errand:<id>:<transaction type>` as an idempotency key,
and a conflicting release or transfer for the same errand is rejected.

`UserDeletedEvent` maps to `DeleteUserCreditCommand`. It removes the balance
and leaves a `USER_DELETION` history record containing the remaining total.
A delayed registration event cannot recreate a deleted balance. Compose's
`kafka-init` builds `kafka/Dockerfile` and runs `kafka/init.sh` to create all five configured event topics before the APIs start.
