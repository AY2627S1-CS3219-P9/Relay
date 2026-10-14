# Relay Credit Service Backend

Prisma/PostgreSQL persistence scaffold for Relay's credit service. The source
folders follow the User Service backend layout. Domain HTTP endpoints and Kafka
command handlers will be implemented separately.

## Database

- `CreditBalance` / `credit_balances`: one record per user, with available and
  reserved credit balances and an automatically updated timestamp.
- `TransactionRecord` / `transaction_records`: transaction reference, timestamp,
  sender, receiver, transaction type, and amount.

The transaction reference is persisted as the canonical `service:id:type` key
from `@relay/contracts`. Its primary key prevents duplicate references. Convert
it back to the contract's object representation at the API boundary. Credit
amounts use PostgreSQL decimals to preserve exact arithmetic; Prisma returns
`Decimal` values, which must be converted to the contract's numbers at that boundary.

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
localhost port 5434. The API uses port 3000 inside the Compose network. Startup
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
