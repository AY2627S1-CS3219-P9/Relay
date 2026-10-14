# Relay User Service Backend

Profile-management API for Relay.

The service uses PostgreSQL for profile metadata and an S3-compatible service
for profile pictures. Authentication initially uses locally signed,
Cognito-compatible JWTs. Cognito verification can be introduced later without
changing the profile service boundary.

## Development

Copy `.env.example` to `.env`, install dependencies, generate the Prisma client,
and run the development server:

```bash
npm install
npm run prisma:generate
npm run dev
```

## New user event

The first successful `PATCH /api/user/me` profile creation stores a
`relay.user.created` outbox event in the same PostgreSQL transaction as the
profile. The background publisher sends its `NewUserEvent` payload
`{ cognitoSub }` to Kafka and marks it published only after Kafka acknowledges
it. Pending events are retried after transient broker failures or restarts.
Configure `KAFKA_BROKERS` for local runs; Compose uses `kafka:9092`.
