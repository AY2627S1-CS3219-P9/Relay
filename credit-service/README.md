# Credit Service

Relay's closed credit economy: balances, reservation, release, transfer, and
transaction history. New profiles receive 100 credits through UserRegistered
events; credits cannot be purchased or withdrawn.

- `frontend/`: React Module Federation remote under `/remotes/credit/`.
- `backend/`: Express API, PostgreSQL/Prisma ledger, and Kafka event consumers.

Run `npm ci` once, then `npm run dev` from the repository root with Docker
running. Open http://localhost:8080. Source development uses frontend port 5004
and API port 3003. Use `npm run up:compose` for the complete container deployment.
See the [local guide](../floci/README.md).

Errand reserves credits synchronously through an internal service-token route.
Kafka errand outcomes settle or release them. User deletion closes the credit
account while retaining ledger history and settlement records.

See the [backend guide](backend/README.md) for API contracts, idempotency,
settlement behavior, and tests. In Kubernetes, KEDA scales the combined API and
consumer workload using CPU, memory, and Kafka lag; see the
[deployment guide](../deploy/README.md#what-scales).
